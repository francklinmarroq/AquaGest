export default defineNuxtRouteMiddleware(async (to) => {
    const user = useSupabaseUser()
    const { profile, fetchProfile } = useProfile()

    // 0. Allow update-password route for invites
    if (to.path === '/update-password') {
        return
    }

    // 0.5 If there's an invite hash, let the request go to the root page
    // The index.vue will handle waiting for Supabase to process the token
    // and then redirect to update-password once session is established
    if (to.path === '/' && process.client && window.location.hash && window.location.hash.includes('access_token')) {
        return // Let it through - index.vue will handle the invite flow
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
        // Critical: Do NOT redirect on server-side for root path.
        // The invite link contains a hash (#access_token=...) which is NOT visible to the server.
        // If we redirect here, the browser sees a 302 and drops the hash, breaking the invite flow.
        // We let the client load, and the client-side middleware (which can see the hash) will handle it.
        if (process.server && to.path === '/') {
            return
        }

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
