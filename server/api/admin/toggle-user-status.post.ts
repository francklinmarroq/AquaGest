import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { createError } from 'h3'

export default defineEventHandler(async (event) => {
    const client = serverSupabaseServiceRole(event)
    let adminUserId: string | null = null

    // Get current user (admin making the request)
    try {
        const user = await serverSupabaseUser(event)
        if (user?.id) {
            adminUserId = user.id
        }
    } catch (e) {
        // Try fallback auth
    }

    // Fallback: Extract token from cookies
    if (!adminUserId) {
        const headers = getRequestHeaders(event)
        let cookies: string[] = []

        if (Array.isArray(headers.cookie)) {
            cookies = headers.cookie.flatMap(c => c.split(';'))
        } else if (typeof headers.cookie === 'string') {
            cookies = headers.cookie.split(';')
        }

        cookies = cookies.map(c => c.trim())

        for (const cookieStr of cookies) {
            if (!cookieStr.startsWith('sb-') || !cookieStr.includes('-auth-token=')) continue

            const parts = cookieStr.split('=')
            if (parts.length < 2) continue

            let cookieValue = parts.slice(1).join('=')
            if (cookieValue.startsWith('base64-')) cookieValue = cookieValue.slice(7)

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
                        adminUserId = manualUser.id
                        break
                    }
                }
            } catch (e) {
                // Ignore
            }
        }
    }

    if (!adminUserId) {
        throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    // Verify admin is actually an admin
    const { data: adminProfile } = await client
        .from('profiles')
        .select('role')
        .eq('id', adminUserId)
        .single() as { data: any }

    if (!adminProfile || adminProfile.role !== 'admin') {
        throw createError({ statusCode: 403, message: 'Forbidden: Admins only' })
    }

    // Get request body
    const body = await readBody(event)
    const { userId, disabled } = body

    if (!userId) {
        throw createError({ statusCode: 400, message: 'userId is required' })
    }

    // Prevent admin from disabling themselves
    if (userId === adminUserId) {
        throw createError({ statusCode: 400, message: 'No puedes deshabilitarte a ti mismo' })
    }

    // Update user ban status using Supabase Admin API
    const { data, error } = await client.auth.admin.updateUserById(userId, {
        ban_duration: disabled ? '876000h' : 'none' // 100 years if disabled, or remove ban
    })

    if (error) {
        console.error('Error toggling user status:', error)
        throw createError({ statusCode: 500, message: error.message })
    }

    return { success: true, user: data }
})
