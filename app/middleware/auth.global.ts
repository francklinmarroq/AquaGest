export default defineNuxtRouteMiddleware(async (to) => {
    const user = useSupabaseUser()
    const { profile, fetchProfile } = useProfile()

    // 0. Allow update-password route for invites
    if (to.path === '/update-password') {
        return
    }

    // 1. If trying to reach login and already authenticated, redirect to home
    if (to.path === '/login') {
        if (user.value) {
            return navigateTo('/')
        }
        return
    }

    // 2. If not authenticated, force login
    if (!user.value) {
        return navigateTo('/login')
    }

    // 3. Ensure profile is loaded
    if (!profile.value) {
        await fetchProfile(user.value.id)
    }

    // 4. Role-based access control (RBAC)
    const role = profile.value?.role

    if (to.path.startsWith('/admin')) {
        if (role !== 'admin') {
            return navigateTo(role === 'reader' ? '/reader' : '/')
        }
    }

    if (to.path.startsWith('/reader')) {
        // Admins can also access reader pages
        if (role !== 'admin' && role !== 'reader') {
            return navigateTo('/')
        }
    }

    // 5. Automatic redirection from home based on role
    if (to.path === '/') {
        if (role === 'admin') return navigateTo('/admin')
        if (role === 'reader') return navigateTo('/reader')
    }
})
