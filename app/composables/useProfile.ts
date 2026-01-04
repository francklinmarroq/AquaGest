export interface Profile {
    id: string
    full_name: string | null
    role: 'admin' | 'reader' | null
    must_change_password?: boolean
    created_at: string
}

export const useProfile = () => {
    const client = useSupabaseClient()
    const user = useSupabaseUser()
    const profile = useState<Profile | null>('profile', () => null)
    const profileLoading = useState<boolean>('profile-loading', () => false)

    const fetchProfile = async (userId?: string) => {
        const u = user.value as any
        const id = userId || u?.id || u?.sub

        if (!id) {
            profile.value = null
            return null
        }

        // Always fetch fresh profile data (no cache) to ensure must_change_password is current
        profileLoading.value = true
        try {
            const { data, error } = await client
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single()

            if (!error && data) {
                profile.value = data
                return data
            }
        } catch (e) {
            console.error('Error fetching profile:', e)
        } finally {
            profileLoading.value = false
        }
        return null
    }

    return {
        profile,
        profileLoading,
        fetchProfile
    }
}
