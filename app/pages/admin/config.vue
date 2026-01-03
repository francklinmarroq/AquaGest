<script setup lang="ts">
const client = useSupabaseClient<any>()
const { currencySymbol, fetchSettings: fetchAppSettings, updateCurrencySymbol } = useAppSettings()

// Pricing State
const currentPrice = ref({
  water_base_price: 0,
  water_included_m3: 0,
  water_extra_m3_price: 0,
  sewage_fixed_price: 0
})
const priceHistory = ref<any[]>([])
const loading = ref(true)

// Settings State
const useAverage = ref(true)
const tempCurrency = ref('')

// User Management State
const users = ref<any[]>([])
const inviteDialog = ref(false)
const inviteForm = ref({ email: '', role: 'reader' })
const inviting = ref(false)

const fetchConfig = async () => {
  loading.value = true
  
  // Fetch app settings first
  await fetchAppSettings()
  tempCurrency.value = currencySymbol.value

  // Fetch current price (newest)
  const { data: priceData } = await client
    .from('pricing_config')
    .select('*')
    .order('effective_from', { ascending: false })
  
  if (priceData && priceData.length > 0) {
    currentPrice.value = { ...priceData[0] }
    priceHistory.value = priceData
  }

  // Fetch settings
  const { data: settingsData } = await client
    .from('app_settings')
    .select('*')
    .eq('key', 'use_30_day_average')
    .single()
  
  if (settingsData) {
    useAverage.value = settingsData.value === true || settingsData.value === 'true'
  }

  // Fetch users
  await fetchUsers()

  loading.value = false
}

const fetchUsers = async () => {
  try {
    const data = await $fetch('/api/admin/users') as any[]
    users.value = data || []
  } catch (e) {
    console.error('Error fetching users:', e)
  }
}

const updatePrices = async () => {
  const { error } = await client
    .from('pricing_config')
    .insert([{
      water_base_price: currentPrice.value.water_base_price,
      water_included_m3: currentPrice.value.water_included_m3,
      water_extra_m3_price: currentPrice.value.water_extra_m3_price,
      sewage_fixed_price: currentPrice.value.sewage_fixed_price,
      effective_from: new Date().toISOString()
    }])

  if (!error) {
    alert('Precios actualizados y guardados en el historial.')
    await fetchConfig()
  } else {
    alert('Error al actualizar precios.')
  }
}

const toggleAverage = async () => {
  const { error } = await client
    .from('app_settings')
    .update({ value: useAverage.value })
    .eq('key', 'use_30_day_average')

  if (error) {
    alert('Error al guardar configuración.')
  }
}

const saveCurrency = async () => {
  const success = await updateCurrencySymbol(tempCurrency.value)
  if (success) {
    alert('Moneda actualizada.')
  } else {
    alert('Error al actualizar moneda.')
  }
}

const inviteUser = async () => {
  if (!inviteForm.value.email) return

  inviting.value = true
  try {
    await $fetch('/api/admin/invite', {
      method: 'POST',
      body: inviteForm.value
    })
    alert('Invitación enviada correctamente.')
    inviteDialog.value = false
    inviteForm.value = { email: '', role: 'reader' }
    // Refresh list (new user won't appear until they accept or trigger runs, 
    // but typically Auth creates a user record immediately on invite? 
    // Yes, but profile trigger runs on INSERT to auth.users. 
    // So we might need to wait or just refresh.)
    setTimeout(fetchUsers, 1000) 
  } catch (error: any) {
    alert('Error al invitar: ' + (error.data?.message || error.message))
  } finally {
    inviting.value = false
  }
}

const updateUserRole = async (user: any, newRole: string) => {
  const { error } = await client
    .from('profiles')
    .update({ role: newRole })
    .eq('id', user.id)
  
  if (error) {
    alert('Error al actualizar rol.')
    await fetchUsers() // Revert UI
  } else {
    user.role = newRole
  }
}

onMounted(() => {
  fetchConfig()
})
</script>

<template>
  <div class="card p-4 space-y-8">
    <div class="flex items-center justify-between border-b pb-2">
       <h1 class="text-2xl font-bold text-blue-900">Configuración del Sistema</h1>
    </div>

    <!-- Global Settings -->
    <section class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
        <i class="pi pi-cog text-blue-600"></i>
        Ajustes Generales
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p class="font-medium text-gray-800">Cálculo de Promedio (30 días)</p>
              <p class="text-sm text-gray-500">Si el periodo excede los 30 días, se promedia el consumo.</p>
            </div>
            <ToggleSwitch v-model="useAverage" @change="toggleAverage" />
          </div>

          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p class="font-medium text-gray-800">Moneda del Sistema</p>
              <p class="text-sm text-gray-500">Símbolo usado en toda la aplicación (ej. Q, $, €).</p>
            </div>
            <div class="flex gap-2">
                <InputText v-model="tempCurrency" class="w-20 text-center font-bold" />
                <Button icon="pi pi-save" class="p-button-outlined" @click="saveCurrency" />
            </div>
          </div>
      </div>
    </section>

    <!-- User Management -->
    <section class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold flex items-center gap-2">
          <i class="pi pi-users text-purple-600"></i>
          Control de Usuarios
        </h2>
        <Button label="Invitar Usuario" icon="pi pi-user-plus" class="p-button-sm p-button-help" @click="inviteDialog = true" />
      </div>
      
      <DataTable :value="users" :loading="loading" stripedRows paginator :rows="5" class="p-datatable-sm">
        <Column field="email" header="Correo Electrónico">
           <template #body="slotProps">
             <span class="font-medium">{{ slotProps.data.email || 'Sin correo' }}</span>
           </template>
        </Column>
        <Column field="role" header="Rol">
          <template #body="slotProps">
            <Select 
              v-model="slotProps.data.role" 
              :options="[{label: 'Administrador', value: 'admin'}, {label: 'Lector', value: 'reader'}]" 
              optionLabel="label"
              optionValue="value"
              class="w-40" 
              @change="(e: any) => updateUserRole(slotProps.data, e.value)"
            />
          </template>
        </Column>
        <Column header="Estado">
          <template #body="slotProps">
            <div class="flex flex-col">
                <Tag 
                    :value="slotProps.data.confirmed_at ? 'Activo' : 'Pendiente'" 
                    :severity="slotProps.data.confirmed_at ? 'success' : 'warn'" 
                    class="w-fit mb-1"
                />
                <small class="text-xs text-gray-400">
                    {{ new Date(slotProps.data.created_at).toLocaleDateString() }}
                </small>
            </div>
          </template>
        </Column>
      </DataTable>
    </section>

    <!-- Pricing Config -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <section class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
          <i class="pi pi-money-bill text-green-600"></i>
          Tarifas Actuales
        </h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="field">
            <label class="block text-sm font-medium text-gray-700 mb-1">Precio Base Agua ({{ currencySymbol }})</label>
            <InputNumber v-model="currentPrice.water_base_price" mode="decimal" :minFractionDigits="2" class="w-full" />
          </div>
          <div class="field">
            <label class="block text-sm font-medium text-gray-700 mb-1">Metros Incluidos (m³)</label>
            <InputNumber v-model="currentPrice.water_included_m3" class="w-full" />
          </div>
          <div class="field">
            <label class="block text-sm font-medium text-gray-700 mb-1">Precio Metro Extra ({{ currencySymbol }})</label>
            <InputNumber v-model="currentPrice.water_extra_m3_price" mode="decimal" :minFractionDigits="2" class="w-full" />
          </div>
          <div class="field">
            <label class="block text-sm font-medium text-gray-700 mb-1">Cuota Fija Drenaje ({{ currencySymbol }})</label>
            <InputNumber v-model="currentPrice.sewage_fixed_price" mode="decimal" :minFractionDigits="2" class="w-full" />
          </div>
        </div>

        <div class="mt-6">
          <Button label="Guardar Nuevos Precios" icon="pi pi-save" class="w-full" @click="updatePrices" />
          <p class="text-xs text-gray-400 mt-2 text-center">Al guardar se generará una nueva entrada en el historial.</p>
        </div>
      </section>

      <!-- History Table -->
      <section class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
          <i class="pi pi-history text-amber-600"></i>
          Historial de Precios
        </h2>
        <DataTable :value="priceHistory" :rows="5" paginator class="p-datatable-sm text-sm">
          <Column field="effective_from" header="Vigente desde">
            <template #body="slotProps">
              {{ new Date(slotProps.data.effective_from).toLocaleDateString() }}
            </template>
          </Column>
          <Column field="water_base_price" :header="`Base (${currencySymbol})`"></Column>
          <Column field="water_extra_m3_price" :header="`Extra (${currencySymbol})`"></Column>
          <Column field="sewage_fixed_price" :header="`Drenaje (${currencySymbol})`"></Column>
        </DataTable>
      </section>
    </div>

    <!-- Invite User Dialog -->
    <Dialog v-model:visible="inviteDialog" header="Invitar Usuario" :style="{width: '400px'}" :modal="true">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <label for="invite-email" class="font-bold">Correo Electrónico</label>
          <InputText id="invite-email" v-model="inviteForm.email" placeholder="usuario@ejemplo.com" />
        </div>
        <div class="flex flex-col gap-2">
          <label class="font-bold">Rol Asignado</label>
          <Select v-model="inviteForm.role" :options="[{label: 'Administrador', value: 'admin'}, {label: 'Lector', value: 'reader'}]" optionLabel="label" optionValue="value" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" class="p-button-text" @click="inviteDialog = false" />
        <Button label="Enviar Invitación" icon="pi pi-send" :loading="inviting" @click="inviteUser" />
      </template>
    </Dialog>
  </div>
</template>
