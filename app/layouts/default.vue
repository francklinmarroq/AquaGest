<script setup lang="ts">
const client = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()
const { profile, fetchProfile } = useProfile()

const items = ref<any[]>([])

const logout = async () => {
  await client.auth.signOut()
  router.push('/login')
}

watch([user, profile], () => {
  if (!user.value || !profile.value) {
    items.value = []
    return
  }

  const role = profile.value.role

  const adminItems = [
    {
      label: 'Panel Control',
      icon: 'pi pi-th-large',
      command: () => router.push('/admin')
    },
    {
      label: 'Gestión',
      icon: 'pi pi-users',
      items: [
        { label: 'Consumidores', icon: 'pi pi-user-edit', command: () => router.push('/admin/consumers') },
        { label: 'Medidores', icon: 'pi pi-box', command: () => router.push('/admin/meters') }
      ]
    },
    {
      label: 'Lecturas',
      icon: 'pi pi-camera',
      items: [
        { label: 'Tomar Lectura', icon: 'pi pi-plus-circle', command: () => router.push('/reader') },
        { label: 'Aprobaciones', icon: 'pi pi-check-circle', command: () => router.push('/admin/approvals') }
      ]
    },
    {
      label: 'Facturación',
      icon: 'pi pi-wallet',
      items: [
        { label: 'Avisos de Cobro', icon: 'pi pi-file-pdf', command: () => router.push('/admin/billing') },
        { label: 'Caja y Pagos', icon: 'pi pi-money-bill', command: () => router.push('/admin/payments') }
      ]
    },
    { 
      label: 'Ajustes', 
      icon: 'pi pi-cog', 
      command: () => router.push('/admin/config') 
    }
  ]

  const readerItems = [
    {
      label: 'Toma de Lecturas',
      icon: 'pi pi-camera',
      command: () => router.push('/reader')
    }
  ]

  if (role === 'admin') {
    items.value = adminItems
  } else if (role === 'reader') {
    items.value = readerItems
  }
}, { immediate: true })

onMounted(() => {
  fetchProfile()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 font-sans">
    <header class="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4">
        <Menubar :model="items" class="border-none bg-transparent py-3">
          <template #start>
            <div class="flex items-center gap-2 mr-6 cursor-pointer" @click="router.push('/')">
              <div class="bg-blue-900 p-2 rounded-lg shadow-blue-200 shadow-lg">
                <i class="pi pi-tint text-white text-xl"></i>
              </div>
              <span class="text-xl font-black text-blue-900 tracking-tight">Aguas Terrasol</span>
            </div>
          </template>
          
          <template #item="{ item, props, hasSubmenu }">
            <a v-ripple class="flex items-center" v-bind="props.action">
              <span :class="item.icon" class="mr-2" />
              <span class="font-medium">{{ item.label }}</span>
              <span v-if="hasSubmenu" class="pi pi-fw pi-angle-down ml-2" />
            </a>
          </template>

          <template #end>
            <div v-if="user" class="flex items-center gap-4">
              <div class="hidden sm:flex flex-col items-end leading-none">
                <span class="text-xs font-bold text-blue-900 uppercase tracking-widest">{{ profile?.role || 'Usuario' }}</span>
                <span class="text-sm font-medium text-gray-600">{{ user.email }}</span>
              </div>
              <Button 
                icon="pi pi-sign-out" 
                label="Salir" 
                class="p-button-rounded p-button-text p-button-danger p-button-sm font-bold" 
                @click="logout" 
              />
            </div>
          </template>
        </Menubar>
      </div>
    </header>

    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <slot />
    </main>
  </div>
</template>

<style>
/* Reset base styles if needed */
body {
  margin: 0;
  font-family: 'Inter', sans-serif;
}
</style>
