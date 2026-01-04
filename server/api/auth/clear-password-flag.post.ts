import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { createError } from 'h3'

export default defineEventHandler(async (event) => {
    const client = serverSupabaseServiceRole(event)
    let userId: string | null = null

    // Try to get user from serverSupabaseUser first
    try {
        const user = await serverSupabaseUser(event)
        if (user?.id) {
            userId = user.id
            console.log('[clear-password-flag] Got user from serverSupabaseUser:', userId)
        }
    } catch (e) {
        console.log('[clear-password-flag] serverSupabaseUser failed, trying fallback')
    }

    // Fallback: Extract token from cookies manually
    if (!userId) {
        const headers = getRequestHeaders(event)
        let cookies: string[] = []

        if (Array.isArray(headers.cookie)) {
            cookies = headers.cookie.flatMap(c => c.split(';'))
        } else if (typeof headers.cookie === 'string') {
            cookies = headers.cookie.split(';')
        }

        cookies = cookies.map(c => c.trim())

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
                    if (manualUser?.id) {
                        userId = manualUser.id
                        console.log('[clear-password-flag] Got user from fallback:', userId)
                        break
                    }
                }
            } catch (e) {
                // Ignore decode errors
            }
        }
    }

    if (!userId) {
        console.error('[clear-password-flag] Could not get user ID')
        throw createError({ statusCode: 401, message: 'Unauthorized - no user found' })
    }

    // Clear the must_change_password flag
    const { data, error } = await client
        .from('profiles')
        .update({ must_change_password: false } as any)
        .eq('id', userId)
        .select()

    if (error) {
        console.error('[clear-password-flag] Update error:', error)
        throw createError({ statusCode: 500, message: error.message })
    }

    console.log('[clear-password-flag] Success! Updated:', data)

    return { success: true, userId, updated: data }
})
