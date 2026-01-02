<script setup lang="ts">
const client = useSupabaseClient()
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

  loading.value = false
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

onMounted(() => {
  fetchConfig()
})
</script>

<template>
  <div class="card p-4 space-y-8">
    <h1 class="text-2xl font-bold text-blue-900 border-b pb-2">Configuración del Sistema</h1>

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
  </div>
</template>
