<script setup lang="ts">
const client = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMsg = ref('')

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
    <div class="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Bienvenido a AquaGest</h1>
        <p class="text-gray-600 mt-2">Por favor, establece tu contraseña para continuar.</p>
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
  </div>
</template>
