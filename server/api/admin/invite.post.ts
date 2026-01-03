import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { createError } from 'h3'

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    const client = serverSupabaseServiceRole(event)

    const headers = getRequestHeaders(event)

    // Fallback: Try to verify token manually if serverSupabaseUser fails or yields no ID
    if (!user || !user.id) {
        // Extract ALL potential tokens using brute force
        let cookieString = headers.cookie || ''
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

            // format: name=value
            const parts = cookieStr.split('=')
            if (parts.length < 2) continue;

            let cookieValue = parts.slice(1).join('=') // In case value has =

            // Strip 'base64-' prefix if present (Nuxt Supabase module adds this)
            if (cookieValue.startsWith('base64-')) {
                cookieValue = cookieValue.slice(7)
            }

            try {
                // Now decode using cross-platform method (Cloudflare doesn't like Buffer)
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
                    const { data: { user: manualUser }, error: manualError } = await client.auth.getUser(accessToken)

                    if (manualUser) {
                        validUser = manualUser
                        break // Found a valid one!
                    }
                }
            } catch (e) {
                // Ignore errors
            }
        }

        if (validUser) {
            // Check profile with this user
            const { data: profile } = await client
                .from('profiles')
                .select('role')
                .eq('id', validUser.id)
                .single() as { data: any }

            if (!profile || profile.role !== 'admin') {
                throw createError({ statusCode: 403, message: 'Forbidden: Admins only' })
            }

            // Proceed with invitation
            const body = await readBody(event)
            const { email, role = 'reader' } = body
            if (!email) throw createError({ statusCode: 400, message: 'Email is required' })

            const { data, error } = await client.auth.admin.inviteUserByEmail(email, { data: { role } })
            if (error) throw createError({ statusCode: 500, message: error.message })

            return { success: true, data }
        }
    }

    if (!user) {
        throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    // Check if requester is admin (query profiles manually since we don't have custom claims yet)
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

    // Invite User via Supabase Admin API
    const { data, error } = await client.auth.admin.inviteUserByEmail(email, {
        data: { role } // Store role in metadata so the trigger picks it up
    })

    if (error) {
        throw createError({ statusCode: 500, message: error.message })
    }

    return { success: true, data }
})
