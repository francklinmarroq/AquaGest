<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const client = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()
const { fetchProfile } = useProfile()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function redirectAfterLogin() {
  if (!user.value) return 

  loading.value = true
  try {
    const p = await fetchProfile(user.value.id)
    
    // Check if user must change password first
    if (p?.must_change_password) {
      await navigateTo('/update-password')
      return
    }
    
    if (p?.role === 'admin') {
      await navigateTo('/admin') 
    } else if (p?.role === 'reader') {
      await navigateTo('/reader')
    } else {
      await navigateTo('/')
    }
  } catch (e) {
    console.error(e)
    loading.value = false
  }
}

async function login() {
  loading.value = true
  errorMsg.value = ''
  
  const { error } = await client.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })

  if (error) {
    errorMsg.value = 'Credenciales inválidas o error de conexión'
    loading.value = false
  } else {
    // User state update is reactive but might take a tick
    // We wait for the watcher to trigger redirection
  }
}

watch(user, async (newVal) => {
  if (newVal) {
    await redirectAfterLogin()
  }
}, { immediate: true })
</script>

<template>
  <div>
      <form class="space-y-6" @submit.prevent="login">
        <div>
          <label for="email-address" class="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
          <InputText 
            id="email-address" 
            v-model="email" 
            type="email" 
            required 
            class="w-full" 
            placeholder="admin@terrasol.com"
          />
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
          <InputText 
            id="password" 
            v-model="password" 
            type="password" 
            required 
            class="w-full" 
            placeholder="••••••••"
          />
        </div>

        <div v-if="errorMsg" class="text-red-600 text-sm text-center bg-red-50 p-2 rounded">
          {{ errorMsg }}
        </div>

        <div>
          <Button 
            type="submit" 
            :loading="loading" 
            label="Ingresar" 
            class="w-full p-button-lg"
          />
        </div>
      </form>
  </div>
</template>

<style scoped>
/* Estilos adicionales si fueran necesarios */
</style>
