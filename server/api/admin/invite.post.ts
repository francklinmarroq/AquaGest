import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { createError } from 'h3'
import { Resend } from 'resend'

// Send welcome email with credentials
async function sendWelcomeEmail(email: string, tempPassword: string) {
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
        console.warn('RESEND_API_KEY not configured - skipping email')
        return
    }

    const resend = new Resend(resendApiKey)
    const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://aquagest.pages.dev'

    try {
        await resend.emails.send({
            from: 'AquaGest <noreply@aquagest.app>',
            to: email,
            subject: 'Bienvenido a AquaGest - Tus Credenciales de Acceso',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #0ea5e9, #2563eb); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0;">AquaGest</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0;">Control de Servicios</p>
                    </div>
                    <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #1e293b;">¡Bienvenido!</h2>
                        <p style="color: #475569;">Se ha creado tu cuenta en AquaGest. Usa las siguientes credenciales para iniciar sesión:</p>
                        
                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <p style="margin: 0 0 10px;"><strong>Correo:</strong> ${email}</p>
                            <p style="margin: 0;"><strong>Contraseña temporal:</strong> <code style="background: #fef3c7; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${tempPassword}</code></p>
                        </div>
                        
                        <p style="color: #dc2626; font-size: 14px;">
                            ⚠️ <strong>Importante:</strong> Deberás cambiar esta contraseña en tu primer inicio de sesión.
                        </p>
                        
                        <a href="${siteUrl}/login" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px;">
                            Iniciar Sesión
                        </a>
                    </div>
                </div>
            `
        })
        console.log(`Welcome email sent to ${email}`)
    } catch (e) {
        console.error('Failed to send welcome email:', e)
    }
}

// Generate a random temporary password
function generateTempPassword(length = 8): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let result = ''
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    const client = serverSupabaseServiceRole(event)

    const headers = getRequestHeaders(event)

    // Fallback: Try to verify token manually if serverSupabaseUser fails or yields no ID
    if (!user || !user.id) {
        let cookies: string[] = []

        if (Array.isArray(headers.cookie)) {
            cookies = headers.cookie.flatMap(c => c.split(';'))
        } else if (typeof headers.cookie === 'string') {
            cookies = headers.cookie.split(';')
        }

        cookies = cookies.map(c => c.trim())

        let validUser = null

        for (const cookieStr of cookies) {
            if (!cookieStr.startsWith('sb-') || !cookieStr.includes('-auth-token=')) {
                continue
            }

            const parts = cookieStr.split('=')
            if (parts.length < 2) continue

            let cookieValue = parts.slice(1).join('=')

            if (cookieValue.startsWith('base64-')) {
                cookieValue = cookieValue.slice(7)
            }

            try {
                const decoded = globalThis.atob ? globalThis.atob(cookieValue) : Buffer.from(cookieValue, 'base64').toString()

                let accessToken = ''

                if (decoded.startsWith('{') || decoded.startsWith('[')) {
                    const parsed = JSON.parse(decoded)
                    if (Array.isArray(parsed)) accessToken = parsed[0]
                    else if (parsed.access_token) accessToken = parsed.access_token
                } else {
                    accessToken = decoded
                }

                if (accessToken) {
                    const { data: { user: manualUser } } = await client.auth.getUser(accessToken)

                    if (manualUser) {
                        validUser = manualUser
                        break
                    }
                }
            } catch (e) {
                // Ignore errors
            }
        }

        if (validUser) {
            const { data: profile } = await client
                .from('profiles')
                .select('role')
                .eq('id', validUser.id)
                .single() as { data: any }

            if (!profile || profile.role !== 'admin') {
                throw createError({ statusCode: 403, message: 'Forbidden: Admins only' })
            }

            // Process invitation with validUser
            const body = await readBody(event)
            const { email, role = 'reader' } = body
            if (!email) throw createError({ statusCode: 400, message: 'Email is required' })

            const tempPassword = generateTempPassword()

            // Create user with password (instead of invite)
            const { data: newUser, error } = await client.auth.admin.createUser({
                email,
                password: tempPassword,
                email_confirm: true, // Skip email confirmation
                user_metadata: { role }
            })

            if (error) throw createError({ statusCode: 500, message: error.message })

            // Set must_change_password in profiles
            if (newUser?.user?.id) {
                await client
                    .from('profiles')
                    .update({ must_change_password: true } as any)
                    .eq('id', newUser.user.id)
            }

            // Send welcome email with credentials
            await sendWelcomeEmail(email, tempPassword)

            return { success: true, tempPassword, user: newUser }
        }
    }

    if (!user) {
        throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    // Check if requester is admin
    const { data: profile } = await client
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single() as { data: any }

    if (!profile || profile.role !== 'admin') {
        throw createError({ statusCode: 403, message: 'Forbidden: Admins only' })
    }

    const body = await readBody(event)
    const { email, role = 'reader' } = body

    if (!email) {
        throw createError({ statusCode: 400, message: 'Email is required' })
    }

    const tempPassword = generateTempPassword()

    // Create user with password (instead of invite)
    const { data: newUser, error } = await client.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // Skip email confirmation
        user_metadata: { role }
    })

    if (error) {
        throw createError({ statusCode: 500, message: error.message })
    }

    // Set must_change_password in profiles
    if (newUser?.user?.id) {
        await client
            .from('profiles')
            .update({ must_change_password: true } as any)
            .eq('id', newUser.user.id)
    }

    // Send welcome email with credentials
    await sendWelcomeEmail(email, tempPassword)

    return { success: true, tempPassword, user: newUser }
})

