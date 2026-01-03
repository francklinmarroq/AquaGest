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

<style>
/* Global Reset */
body {
  margin: 0;
  font-family: 'Inter', sans-serif;
  background-color: #f8fafc;
}

/* PrimeVue Menubar Override - Base (Mobile First) */
.p-menubar {
  border: none !important;
  background: transparent !important;
  padding: 0 !important;
}

/* Mobile Menu Button Fix */
.p-menubar-button {
  margin-left: auto; /* Push hamburger to right */
}

/* Mobile Dropdown Styling */
.p-menubar-mobile-active .p-menubar-root-list {
  background: white !important;
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  padding: 1rem !important;
  border-radius: 0 0 1rem 1rem;
  z-index: 100;
  display: flex;
  flex-direction: column;
}

/* Desktop Styles (lg breakpoint) */
@media (min-width: 960px) {
  .p-menubar {
    display: flex !important;
    align-items: center !important;
    flex-wrap: nowrap !important;
  }

  .p-menubar-root-list {
    background: transparent !important;
    display: flex !important;
    flex-wrap: nowrap !important;
    gap: 0.5rem;
    margin-left: auto; /* Push items to right if needed, but flex handles it */
  }
}

.p-menuitem-link {
  background: transparent !important;
}

.p-menuitem-link:hover {
  background: rgba(239, 246, 255, 0.5) !important;
}
</style>

<template>
  <div class="min-h-screen bg-slate-50 font-sans text-slate-900">
    <header class="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 transition-all duration-300">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Menubar :model="items" class="py-6">
          <template #start>
            <div class="flex items-center gap-4 mr-10 cursor-pointer group" @click="router.push('/')">
              <div class="bg-gradient-to-br from-sky-500 to-cyan-400 p-3.5 rounded-2xl shadow-lg shadow-sky-100 transition-transform group-hover:scale-105">
                <i class="pi pi-tint text-white text-2xl"></i>
              </div>
              <div class="flex flex-col justify-center">
                <span class="text-3xl font-black text-slate-800 tracking-tighter leading-none group-hover:text-sky-600 transition-colors">AquaGest</span>
                <span class="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Control de Servicios</span>
              </div>
            </div>
          </template>
          
          <template #item="{ item, props, hasSubmenu }">
            <a v-ripple class="flex items-center px-4 py-2 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-all duration-200 cursor-pointer font-medium" v-bind="props.action">
              <span :class="[item.icon, 'text-lg']" class="mr-2.5 text-slate-400 group-hover:text-blue-600" />
              <span>{{ item.label }}</span>
              <span v-if="hasSubmenu" class="pi pi-angle-down ml-2 text-xs opacity-70" />
            </a>
          </template>

          <template #end>
            <div v-if="user" class="flex items-center pl-4 border-l border-slate-200 ml-2 gap-4">
              <div class="hidden md:flex flex-col items-end">
                <span class="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-full mb-0.5">{{ profile?.role === 'admin' ? 'Administrador' : 'Lector' }}</span>
                <span class="text-xs font-medium text-slate-500">{{ user.email }}</span>
              </div>
              <Button 
                icon="pi pi-power-off" 
                class="p-button-rounded p-button-text p-button-danger hover:bg-red-50" 
                v-tooltip.bottom="'Cerrar Sesión'"
                @click="logout" 
              />
            </div>
          </template>
        </Menubar>
      </div>
    </header>

    <main class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <slot />
    </main>
  </div>
</template>
