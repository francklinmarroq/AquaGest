<script setup lang="ts">
const client = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const sessionLoading = ref(true)
const errorMsg = ref('')

// Wait for session to be established from the hash
onMounted(() => {
  // Give Supabase a moment to process the hash and establish session
  const checkSession = () => {
    if (user.value) {
      sessionLoading.value = false
    } else {
      // If still no user after 3 seconds, something went wrong
      setTimeout(() => {
        if (!user.value) {
          sessionLoading.value = false
          errorMsg.value = 'No se pudo establecer la sesión. Por favor, solicita un nuevo enlace de invitación.'
        }
      }, 3000)
    }
  }
  
  // Check immediately and watch for changes
  checkSession()
})

// Also watch user for changes (Supabase might take a moment)
watch(user, (newUser) => {
  if (newUser) {
    sessionLoading.value = false
  }
}, { immediate: true })

const updatePassword = async () => {
  if (password.value !== confirmPassword.value) {
    errorMsg.value = 'Las contraseñas no coinciden'
    return
  }

  if (password.value.length < 6) {
    errorMsg.value = 'La contraseña debe tener al menos 6 caracteres'
    return
  }

  loading.value = true
  errorMsg.value = ''

  try {
    const { error } = await client.auth.updateUser({
      password: password.value
    })

    if (error) throw error

    alert('Contraseña actualizada correctamente. ¡Bienvenido!')
    router.push('/')
  } catch (e: any) {
    errorMsg.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <!-- Loading state while session establishes -->
    <div v-if="sessionLoading" class="text-center">
      <ProgressSpinner />
      <p class="text-gray-600 mt-4">Verificando tu enlace de invitación...</p>
    </div>

    <!-- Password form (only shows when session is established) -->
    <div v-else-if="user" class="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Bienvenido a AquaGest</h1>
        <p class="text-gray-600 mt-2">Por favor, establece tu contraseña para continuar.</p>
        <p class="text-sm text-gray-500 mt-1">{{ user.email }}</p>
      </div>

      <form @submit.prevent="updatePassword" class="space-y-6">
        <div class="space-y-2">
          <label for="password" class="text-sm font-medium text-gray-700">Nueva Contraseña</label>
          <Password 
            v-model="password" 
            toggleMask 
            :feedback="true" 
            placeholder="Min. 6 caracteres"
            inputClass="w-full"
            class="w-full"
          />
        </div>

        <div class="space-y-2">
          <label for="confirm" class="text-sm font-medium text-gray-700">Confirmar Contraseña</label>
          <Password 
            v-model="confirmPassword" 
            toggleMask 
            :feedback="false" 
            placeholder="Repite tu contraseña"
            inputClass="w-full"
            class="w-full"
          />
        </div>

        <div v-if="errorMsg" class="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
          {{ errorMsg }}
        </div>

        <Button 
          type="submit" 
          label="Establecer Contraseña" 
          icon="pi pi-check" 
          class="w-full" 
          :loading="loading" 
        />
      </form>
    </div>

    <!-- Error state (session failed to establish) -->
    <div v-else class="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
      <i class="pi pi-times-circle text-red-500 text-5xl mb-4"></i>
      <h2 class="text-xl font-bold text-gray-900 mb-2">Error de Autenticación</h2>
      <p class="text-gray-600 mb-4">{{ errorMsg || 'No se pudo verificar tu enlace de invitación.' }}</p>
      <Button 
        label="Volver al Login" 
        icon="pi pi-arrow-left" 
        class="p-button-secondary" 
        @click="router.push('/login')" 
      />
    </div>
  </div>
</template>
