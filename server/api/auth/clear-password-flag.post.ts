import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { createError } from 'h3'

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)

    if (!user) {
        throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const client = serverSupabaseServiceRole(event)

    // Clear the must_change_password flag for the current user
    const { error } = await client
        .from('profiles')
        .update({ must_change_password: false } as any)
        .eq('id', user.id)

    if (error) {
        console.error('Error clearing must_change_password:', error)
        throw createError({ statusCode: 500, message: error.message })
    }

    return { success: true }
})
