<script setup lang="ts">
definePageMeta({
  layout: false
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
  }
}

watch(user, async (newVal) => {
  if (newVal) {
    await redirectAfterLogin()
  }
}, { immediate: true })
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
    <!-- Logo Section -->
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <div class="flex justify-center mb-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl shadow-lg flex items-center justify-center">
            <i class="pi pi-tint text-white text-2xl"></i>
          </div>
          <div class="flex flex-col justify-center">
            <span class="text-3xl font-black text-slate-800 tracking-tighter leading-none">AquaGest</span>
            <span class="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Control de Servicios</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Form Section -->
    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
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
    </div>
  </div>
</template>

