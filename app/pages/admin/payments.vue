<script setup lang="ts">
const client = useSupabaseClient<any>()
const { currencySymbol, fetchSettings } = useAppSettings()

// State
const pendingNotices = ref<any[]>([])
const loading = ref(true)
const paymentDialog = ref(false)
const selectedNotice = ref<any>(null)
const paymentForm = ref({
  amount_paid: 0,
  payment_method: 'Efectivo',
  receipt_number: ''
})

const fetchPending = async () => {
  loading.value = true
  const { data } = await client
    .from('billing_notices')
    .select(`
      *,
      consumer:consumers(full_name, address)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  pendingNotices.value = data || []
  loading.value = false
}

const openPayment = (notice: any) => {
  selectedNotice.value = notice
  paymentForm.value.amount_paid = notice.total_amount
  paymentForm.value.receipt_number = `REC-${Date.now().toString().slice(-6)}`
  paymentDialog.value = true
}

const registerPayment = async () => {
  try {
    // 1. Create Payment record
    const { error: payError } = await client.from('payments').insert([{
      billing_notice_id: selectedNotice.value.id,
      amount_paid: paymentForm.value.amount_paid,
      payment_method: paymentForm.value.payment_method,
      receipt_number: paymentForm.value.receipt_number,
      payment_date: new Date().toISOString()
    }])

    if (payError) throw payError

    // 2. Update Notice status
    const { error: updateError } = await client.from('billing_notices')
      .update({ status: 'paid' })
      .eq('id', selectedNotice.value.id)

    if (updateError) throw updateError

    alert('Pago registrado con éxito. Generando recibo...')
    paymentDialog.value = false
    await fetchPending()

    // Open print view (simulated)
    window.print()
  } catch (e: any) {
    alert('Error: ' + e.message)
  }
}

onMounted(() => {
  fetchSettings()
  fetchPending()
})
</script>

<template>
  <div class="card p-4">
    <h1 class="text-2xl font-bold text-blue-900 mb-6 font-sans">Registro de Pagos (Caja)</h1>

    <DataTable :value="pendingNotices" :loading="loading" stripedRows
      class="p-datatable-sm shadow rounded-lg overflow-hidden border border-gray-100">
      <Column header="Aviso #" field="id">
        <template #body="slotProps">
          {{ slotProps.data.id.substring(0, 8) }}
        </template>
      </Column>
      <Column header="Consumidor" field="consumer.full_name"></Column>
      <Column header="Monto Total" field="total_amount">
        <template #body="slotProps">
          <span class="font-bold text-green-700">{{ currencySymbol }}{{ slotProps.data.total_amount.toFixed(2) }}</span>
        </template>
      </Column>
      <Column header="Acciones">
        <template #body="slotProps">
          <Button label="Cobrar" icon="pi pi-dollar" class="p-button-success p-button-sm"
            @click="openPayment(slotProps.data)" />
        </template>
      </Column>
    </DataTable>

    <!-- Payment Dialog -->
    <Dialog v-model:visible="paymentDialog" header="Confirmar Pago" :modal="true" class="p-fluid max-w-sm">
      <div v-if="selectedNotice" class="space-y-4 pt-2">
        <div class="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
          <p class="text-sm text-blue-600 mb-1">Monto a Cobrar</p>
          <p class="text-3xl font-extrabold text-blue-900">{{ currencySymbol }}{{ selectedNotice.total_amount.toFixed(2)
          }}
          </p>
        </div>

        <div class="field">
          <label class="font-bold block mb-2">Monto Pagado</label>
          <InputNumber v-model="paymentForm.amount_paid" mode="decimal" :minFractionDigits="2" class="w-full" />
        </div>

        <div class="field">
          <label class="font-bold block mb-2">Método de Pago</label>
          <Select v-model="paymentForm.payment_method" :options="['Efectivo', 'Transferencia']" />
        </div>

        <div class="field">
          <label class="font-bold block mb-2">Número de Recibo</label>
          <InputText v-model="paymentForm.receipt_number" />
        </div>

        <div class="pt-4">
          <Button label="Registrar e Imprimir A5" icon="pi pi-print" class="p-button-primary w-full p-button-lg"
            @click="registerPayment" />
        </div>
      </div>
    </Dialog>

    <!-- Print-only A5 Receipt (Hidden in UI) -->
    <div class="hidden print:block font-serif text-sm p-8 max-w-[148mm] mx-auto border" id="receipt-print">
      <div class="text-center mb-8">
        <h1 class="text-xl font-bold uppercase">Aguas Terrasol</h1>
        <p>Recibo de Pago No: {{ paymentForm.receipt_number }}</p>
        <p>Fecha: {{ new Date().toLocaleString() }}</p>
      </div>

      <div class="space-y-2 mb-8" v-if="selectedNotice">
        <p><strong>Consumidor:</strong> {{ selectedNotice.consumer.full_name }}</p>
        <p><strong>Dirección:</strong> {{ selectedNotice.consumer.address }}</p>
        <hr class="border-dashed" />
        <div class="flex justify-between">
          <span>Consumo de Agua (m³)</span>
          <span>{{ currencySymbol }}{{ selectedNotice.water_base_amount.toFixed(2) }}</span>
        </div>
        <div class="flex justify-between">
          <span>Excedente Agua</span>
          <span>{{ currencySymbol }}{{ selectedNotice.water_extra_amount.toFixed(2) }}</span>
        </div>
        <div class="flex justify-between">
          <span>Servicio Alcantarillado</span>
          <span>{{ currencySymbol }}{{ selectedNotice.sewage_amount.toFixed(2) }}</span>
        </div>
        <div v-if="selectedNotice.extra_charges_amount > 0" class="flex justify-between">
          <span>Cargos Extra</span>
          <span>{{ currencySymbol }}{{ selectedNotice.extra_charges_amount.toFixed(2) }}</span>
        </div>
        <hr class="border-dashed" />
        <div class="flex justify-between font-bold text-lg">
          <span>TOTAL PAGADO</span>
          <span>{{ currencySymbol }}{{ paymentForm.amount_paid.toFixed(2) }}</span>
        </div>
      </div>

      <div class="text-center mt-16 pb-8">
        <div class="border-t border-black w-48 mx-auto mt-4 pt-2">
          Firma de Receptor
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@media print {
  body * {
    visibility: hidden;
  }

  #receipt-print,
  #receipt-print * {
    visibility: visible;
  }

  #receipt-print {
    position: absolute;
    left: 0;
    top: 0;
    width: 148mm;
    /* A5 width */
    height: 210mm;
    /* A5 height */
  }
}
</style>
