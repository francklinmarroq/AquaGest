import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { createError } from 'h3'

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    const client = serverSupabaseServiceRole(event)

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
