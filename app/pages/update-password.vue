<script setup lang="ts">
const client = useSupabaseClient<any>()
const user = useSupabaseUser()
const router = useRouter()

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMsg = ref('')

// Redirect if not logged in
onMounted(() => {
  if (!user.value) {
    router.push('/login')
  }
})

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
    // Update password in Supabase Auth
    const { error } = await client.auth.updateUser({
      password: password.value
    })

    if (error) throw error

    // Clear the must_change_password flag via server API (uses service role)
    await $fetch('/api/auth/clear-password-flag', { method: 'POST' })

    alert('Contraseña actualizada correctamente. ¡Bienvenido!')
    
    // Force page reload to clear any cached profile data
    window.location.href = '/'
  } catch (e: any) {
    errorMsg.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div v-if="user" class="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
      <div class="text-center mb-8">
        <i class="pi pi-key text-blue-500 text-5xl mb-3"></i>
        <h1 class="text-2xl font-bold text-gray-900">Establecer Nueva Contraseña</h1>
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

    <!-- Not logged in state -->
    <div v-else class="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
      <ProgressSpinner />
      <p class="text-gray-600 mt-4">Cargando...</p>
    </div>
  </div>
</template>

