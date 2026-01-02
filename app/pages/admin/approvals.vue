<script setup lang="ts">
const client = useSupabaseClient()

// State
const pendingReadings = ref<any[]>([])
const loading = ref(true)
const selectedReading = ref<any>(null)
const approvalDialog = ref(false)
const appSettings = ref<any>({})
const pricing = ref<any>({})

const fetchPending = async () => {
  loading.value = true
  const { data } = await client
    .from('meter_readings')
    .select(`
      *,
      consumer:consumers(full_name, address),
      meter:meters(serial_number)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  
  pendingReadings.value = data || []
  
  // Fetch settings and pricing
  const { data: s } = await client.from('app_settings').select('*')
  s?.forEach(item => appSettings.value[item.key] = item.value === 'true' || item.value === true)
  
  const { data: p } = await client.from('pricing_config').select('*').order('effective_from', { ascending: false }).limit(1)
  if (p) pricing.value = p[0]

  loading.value = false
}

const getPreviousReading = async (reading: any) => {
  const { data } = await client
    .from('meter_readings')
    .select('reading_value, reading_date')
    .eq('meter_id', reading.meter_id)
    .lt('reading_date', reading.reading_date)
    .order('reading_date', { ascending: false })
    .limit(1)
    .single()
  
  return data
}

const openApproval = async (reading: any) => {
  selectedReading.value = { ...reading }
  const prev = await getPreviousReading(reading)
  selectedReading.value.prev_data = prev
  
  // Calculate logic
  if (prev) {
    const d1 = new Date(prev.reading_date)
    const d2 = new Date(reading.reading_date)
    const diffTime = Math.abs(d2.getTime() - d1.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    selectedReading.value.days_diff = diffDays
    
    if (diffDays > 30 && appSettings.value['use_30_day_average']) {
      const consumption = reading.reading_value - prev.reading_value
      const avgDaily = consumption / diffDays
      selectedReading.value.suggested_reading = prev.reading_value + (avgDaily * 30)
      selectedReading.value.is_averaged = true
    }
  }

  approvalDialog.value = true
}

const approveReading = async () => {
  const r = selectedReading.value
  const finalReading = r.is_averaged ? r.suggested_reading : r.reading_value
  
  try {
    // 1. Update reading status
    await client.from('meter_readings')
      .update({ 
        status: 'approved', 
        approved_at: new Date().toISOString(),
        reading_value: finalReading // Update to average if needed
      })
      .eq('id', r.id)

    // 2. Calculate Billing Notice
    const prevVal = r.prev_data?.reading_value || 0
    const m3 = finalReading - prevVal
    const extraM3 = Math.max(0, m3 - pricing.value.water_included_m3)
    
    const waterBase = pricing.value.water_base_price
    const waterExtra = extraM3 * pricing.value.water_extra_m3_price
    const sewage = pricing.value.sewage_fixed_price
    
    // 3. Check for extra charges (e.g. meter change)
    const { data: extraCharges } = await client.from('extra_charges')
      .select('amount')
      .eq('consumer_id', r.consumer_id)
      .eq('status', 'pending')
    
    const extraAmount = extraCharges?.reduce((sum, item) => sum + Number(item.amount), 0) || 0

    // 4. Create Billing Notice
    await client.from('billing_notices').insert([{
      reading_id: r.id,
      consumer_id: r.consumer_id,
      reading_previous: prevVal,
      reading_current: finalReading,
      total_m3: m3,
      water_base_amount: waterBase,
      water_extra_amount: waterExtra,
      sewage_amount: sewage,
      extra_charges_amount: extraAmount,
      total_amount: waterBase + waterExtra + sewage + extraAmount,
      due_date: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString().split('T')[0]
    }])

    // 5. Mark extra charges as 'in_notice' or similar if needed, or just leave as is.
    // For simplicity, let's assume they are cleared when paid.

    alert('Lectura aprobada y Aviso de Cobro generado.')
    approvalDialog.value = false
    await fetchPending()
  } catch (e: any) {
    alert('Error: ' + e.message)
  }
}

const getPhotoUrl = (path: string) => {
  const { data } = client.storage.from('meter-photos').getPublicUrl(path)
  return data.publicUrl
}

onMounted(() => {
  fetchPending()
})
</script>

<template>
  <div class="card p-4">
    <h1 class="text-2xl font-bold text-blue-900 mb-6">Aprobación de Lecturas</h1>

    <DataTable :value="pendingReadings" :loading="loading" stripedRows class="p-datatable-sm shadow rounded-lg overflow-hidden">
      <Column header="Fecha" field="reading_date"></Column>
      <Column header="Consumidor" field="consumer.full_name"></Column>
      <Column header="Medidor" field="meter.serial_number"></Column>
      <Column header="Lectura" field="reading_value"></Column>
      <Column header="Acciones">
        <template #body="slotProps">
          <Button label="Revisar" icon="pi pi-search" class="p-button-text" @click="openApproval(slotProps.data)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="approvalDialog" header="Detalles de la Lectura" :modal="true" :style="{width: '500px'}">
      <div v-if="selectedReading" class="space-y-4">
        <!-- Photo -->
        <div class="rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex justify-center">
          <img :src="getPhotoUrl(selectedReading.photo_path)" alt="Foto del medidor" class="max-h-64 object-contain" />
        </div>

        <!-- Info -->
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div class="p-3 bg-gray-50 rounded">
            <p class="text-gray-500 uppercase text-xs font-bold">Consumidor</p>
            <p class="font-medium">{{ selectedReading.consumer.full_name }}</p>
          </div>
          <div class="p-3 bg-gray-50 rounded">
            <p class="text-gray-500 uppercase text-xs font-bold">Dirección</p>
            <p class="font-medium">{{ selectedReading.consumer.address }}</p>
          </div>
          <div class="p-3 bg-gray-50 rounded">
            <p class="text-gray-500 uppercase text-xs font-bold">Lectura Anterior</p>
            <p class="font-medium">{{ selectedReading.prev_data?.reading_value || 'N/A' }}</p>
          </div>
          <div class="p-3 bg-blue-50 rounded">
            <p class="text-blue-500 uppercase text-xs font-bold">Lectura Actual (Campo)</p>
            <p class="font-bold text-blue-900">{{ selectedReading.reading_value }}</p>
          </div>
        </div>

        <!-- Average Logic Alert -->
        <div v-if="selectedReading.is_averaged" class="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p class="text-amber-800 font-bold mb-1"><i class="pi pi-info-circle mr-1"></i> Periodo Excedido ({{ selectedReading.days_diff }} días)</p>
          <p class="text-sm text-amber-700">
            Se aplicará el promedio de 30 días. 
            <br/>Lectura sugerida: <strong>{{ selectedReading.suggested_reading.toFixed(2) }}</strong>
          </p>
        </div>

        <div class="flex gap-2 pt-4">
          <Button label="Rechazar" icon="pi pi-times" class="p-button-danger p-button-text flex-1" />
          <Button label="Aprobar y Generar Cobro" icon="pi pi-check" class="p-button-success flex-1" @click="approveReading" />
        </div>
      </div>
    </Dialog>
  </div>
</template>
