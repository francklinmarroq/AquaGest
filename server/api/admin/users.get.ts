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
                    const { data: { user: manualUser } } = await client.auth.getUser(accessToken)

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
            // Verify Admin Role with the manually found user
            const { data: profile } = await client
                .from('profiles')
                .select('role')
                .eq('id', validUser.id)
                .single() as { data: any }

            if (!profile || profile.role !== 'admin') {
                throw createError({ statusCode: 403, message: 'Forbidden: Admins only' })
            }

            // Should verify fetchUsers logic reuse... for now assume success and proceed to fetch list
            // Fetch all users from Supabase Auth
            const { data: { users }, error } = await client.auth.admin.listUsers()

            if (error) {
                throw createError({ statusCode: 500, message: error.message })
            }

            // Map to a clean structure
            const { data: profiles } = await client
                .from('profiles')
                .select('id, role, created_at') as { data: any[] }

            const profileMap = new Map(profiles?.map(p => [p.id, p]))

            return users.map(u => {
                const profile = profileMap.get(u.id)
                return {
                    id: u.id,
                    email: u.email,
                    role: profile?.role || u.user_metadata?.role || 'reader',
                    created_at: u.created_at,
                    confirmed_at: u.confirmed_at || u.email_confirmed_at,
                    last_sign_in_at: u.last_sign_in_at
                }
            })
        }
    }

    if (!user) {
        throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    // Verify Admin Role
    const { data: profile } = await client
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single() as { data: any }

    if (!profile || profile.role !== 'admin') {
        throw createError({ statusCode: 403, message: 'Forbidden: Admins only' })
    }

    // Fetch all users from Supabase Auth
    const { data: { users }, error } = await client.auth.admin.listUsers()

    if (error) {
        throw createError({ statusCode: 500, message: error.message })
    }

    // Map to a clean structure
    // We want to combine Auth data (email, status) with Profile data (role)
    // Actually, our profiles table has the role.

    // Fetch profiles to get the functional role (since auth metadata might lag or be different)
    const { data: profiles } = await client
        .from('profiles')
        .select('id, role, created_at') as { data: any[] }

    const profileMap = new Map(profiles?.map(p => [p.id, p]))

    return users.map(u => {
        const profile = profileMap.get(u.id)
        return {
            id: u.id,
            email: u.email,
            role: profile?.role || u.user_metadata?.role || 'reader', // Fallback to metadata
            created_at: u.created_at,
            confirmed_at: u.confirmed_at || u.email_confirmed_at, // Different versions might use different fields
            last_sign_in_at: u.last_sign_in_at
        }
    })
})
