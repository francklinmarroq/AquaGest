import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { createError } from 'h3'

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)

    console.log('[clear-password-flag] Called for user:', user?.id)

    if (!user) {
        console.log('[clear-password-flag] No user found!')
        throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const client = serverSupabaseServiceRole(event)

    // First, let's check the current value
    const { data: before } = await client
        .from('profiles')
        .select('must_change_password')
        .eq('id', user.id)
        .single()

    console.log('[clear-password-flag] Before update:', before)

    // Clear the must_change_password flag for the current user
    const { data, error } = await client
        .from('profiles')
        .update({ must_change_password: false } as any)
        .eq('id', user.id)
        .select()

    if (error) {
        console.error('[clear-password-flag] Error:', error)
        throw createError({ statusCode: 500, message: error.message })
    }

    console.log('[clear-password-flag] After update:', data)

    return { success: true, before, after: data }
})

