<script setup lang="ts">
const user = useSupabaseUser()
const { profile, profileLoading, fetchProfile } = useProfile()
const router = useRouter()
const client = useSupabaseClient()

const isProcessingInvite = ref(false)
const inviteError = ref('')

onMounted(async () => {
  // Check if this is an invite/recovery link
  const hash = window.location.hash
  if (hash && (hash.includes('type=invite') || hash.includes('type=recovery') || hash.includes('access_token'))) {
    isProcessingInvite.value = true
    
    // DON'T redirect yet! Let Supabase process the hash token first.
    // The Supabase client will automatically read the hash and establish a session.
    // We just need to wait for that to happen.
    
    // Set a timeout in case something goes wrong
    setTimeout(() => {
      if (isProcessingInvite.value && !user.value) {
        inviteError.value = 'No se pudo establecer la sesión. El enlace puede haber expirado.'
        isProcessingInvite.value = false
      }
    }, 5000)
    
    return // Don't run the normal redirect logic
  }

  // Normal flow for authenticated users
  if (user.value) {
    if (!profile.value) {
      await fetchProfile(user.value.id)
    }
    
    if (profile.value?.role === 'admin') {
      router.push('/admin')
    } else if (profile.value?.role === 'reader') {
      router.push('/reader')
    }
  }
})

// Watch for user to become authenticated (from invite token processing)
watch(user, async (newUser) => {
  if (newUser && isProcessingInvite.value) {
    // Session established from invite! Now redirect to set password.
    isProcessingInvite.value = false
    router.push('/update-password')
  }
}, { immediate: true })
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-50">
    <!-- Processing invite token -->
    <div v-if="isProcessingInvite" class="text-center">
      <ProgressSpinner />
      <p class="text-gray-600 mt-4">Procesando invitación...</p>
    </div>

    <!-- Invite error -->
    <div v-else-if="inviteError" class="text-center p-8 bg-white rounded-xl shadow-lg max-w-md mx-4">
      <i class="pi pi-times-circle text-red-500 text-5xl mb-4"></i>
      <h2 class="text-xl font-bold text-gray-800 mb-2">Error de Invitación</h2>
      <p class="text-gray-600 mb-4">{{ inviteError }}</p>
      <Button label="Ir al Login" icon="pi pi-arrow-left" class="p-button-secondary" @click="router.push('/login')" />
    </div>

    <!-- Show spinner if loading OR if no user yet (waiting for redirect) -->
    <ProgressSpinner v-else-if="!user || profileLoading" />
    
    <div v-else-if="!profile" class="text-center p-8 bg-white rounded-xl shadow-lg max-w-md mx-4">
      <i class="pi pi-times-circle text-red-500 text-5xl mb-4"></i>
      <h2 class="text-xl font-bold text-gray-800 mb-2">Perfil no encontrado</h2>
      <p class="text-gray-600 mb-4">
        No se pudo cargar la información de tu perfil.
        <br>
        <span class="text-xs font-mono text-gray-400">ID: {{ user?.id || (user as any)?.sub }}</span>
      </p>

      <Button label="Reintentar" icon="pi pi-refresh" class="p-button-secondary mr-2" @click="fetchProfile(user?.id || (user as any)?.sub)" />
      <Button label="Cerrar Sesión" icon="pi pi-sign-out" class="p-button-danger" @click="client.auth.signOut(); router.push('/login')" />
    </div>

    <div v-else class="text-center p-8 bg-white rounded-xl shadow-lg max-w-md mx-4">
      <i class="pi pi-exclamation-triangle text-yellow-500 text-5xl mb-4"></i>
      <h2 class="text-xl font-bold text-gray-800 mb-2">Acceso no asignado</h2>
      <p class="text-gray-600 mb-6">
        Tu usuario <strong>{{ user?.email }}</strong> no tiene un rol asignado (Admin o Lector).
        <br>
        Rol actual: <span class="font-mono">{{ profile.role || 'Ninguno' }}</span>
      </p>
      <Button label="Cerrar Sesión" icon="pi pi-sign-out" class="p-button-danger" @click="client.auth.signOut(); router.push('/login')" />
    </div>
  </div>
</template>
