<script setup lang="ts">
const user = useSupabaseUser()
const { profile, profileLoading, fetchProfile } = useProfile()
const router = useRouter()
const client = useSupabaseClient()

// Fallback redirection logic in case middleware passes through
onMounted(async () => {
  // Defense in depth: Check for invite hash here too (Child mounts before Parent)
  // Broadened check: include 'access_token' just in case 'type' is missing or different
  if (window.location.hash && (window.location.hash.includes('type=invite') || window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token'))) {
      // Explicitly pass the hash!
      router.push('/update-password' + window.location.hash)
      return
  }

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
  // Do NOT redirect to login here. Let auth.global.ts handle that.
})
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-50">
    <!-- Show spinner if loading OR if no user yet (waiting for redirect) -->
    <ProgressSpinner v-if="!user || profileLoading" />
    
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
