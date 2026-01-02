<script setup lang="ts">
const client = useSupabaseClient<any>()
const { currencySymbol, fetchSettings } = useAppSettings()

// State
const notices = ref<any[]>([])
const loading = ref(true)

const fetchNotices = async () => {
  loading.value = true
  const { data } = await client
    .from('billing_notices')
    .select(`
      *,
      consumer:consumers(full_name, address)
    `)
    .order('created_at', { ascending: false })
  
  notices.value = data || []
  loading.value = false
}

const getStatusSeverity = (status: string) => {
  switch (status) {
    case 'paid': return 'success';
    case 'pending': return 'warn';
    default: return 'info';
  }
}

const viewPDF = (notice: any) => {
  alert(`Visualizando Aviso de Cobro #${notice.id.substring(0,8)} en PDF (Simulado)`)
  // Aquí se integraría la generación real del PDF
}

onMounted(() => {
  fetchSettings()
  fetchNotices()
})
</script>

<template>
  <div class="card p-4">
    <h1 class="text-2xl font-bold text-blue-900 mb-6">Avisos de Cobro</h1>

    <DataTable :value="notices" :loading="loading" stripedRows paginator :rows="10" class="p-datatable-sm shadow rounded-lg overflow-hidden border border-gray-100">
      <Column field="created_at" header="Fecha Emisión" sortable>
        <template #body="slotProps">
          {{ new Date(slotProps.data.created_at).toLocaleDateString() }}
        </template>
      </Column>
      <Column field="consumer.full_name" header="Consumidor" sortable></Column>
      <Column field="total_m3" header="m³ Consumidos"></Column>
      <Column field="total_amount" :header="`Total (${currencySymbol})`" sortable>
        <template #body="slotProps">
          <span class="font-bold text-blue-700">{{ currencySymbol }}{{ slotProps.data.total_amount.toFixed(2) }}</span>
        </template>
      </Column>
      <Column field="status" header="Estado">
        <template #body="slotProps">
          <Tag :value="slotProps.data.status === 'paid' ? 'Pagado' : 'Pendiente'" :severity="getStatusSeverity(slotProps.data.status)" />
        </template>
      </Column>
      <Column header="Acciones">
        <template #body="slotProps">
          <Button icon="pi pi-file-pdf" label="PDF" class="p-button-text p-button-sm" @click="viewPDF(slotProps.data)" />
        </template>
      </Column>
    </DataTable>
  </div>
</template>
