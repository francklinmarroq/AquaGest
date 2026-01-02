<script setup lang="ts">
const client = useSupabaseClient<any>()
const { currencySymbol, fetchSettings } = useAppSettings()

// State
const consumers = ref<any[]>([])
const loading = ref(true)
const consumerDialog = ref(false)
const extraChargeDialog = ref(false)
const submitted = ref(false)

const consumer = ref({
  id: null,
  full_name: '',
  address: '',
  phone: '',
  email: ''
})

const extraCharge = ref({
  consumer_id: null,
  description: '',
  amount: 0
})

// Fetch data
const fetchConsumers = async () => {
  loading.value = true
  const { data, error } = await client
    .from('consumers')
    .select('*')
    .order('full_name', { ascending: true })
  
  if (!error) {
    consumers.value = data
  }
  loading.value = false
}

// Dialog actions
const openNew = () => {
  consumer.value = { id: null, full_name: '', address: '', phone: '', email: '' }
  submitted.value = false
  consumerDialog.value = true
}

const hideDialog = () => {
  consumerDialog.value = false
  submitted.value = false
}

const editConsumer = (prod: any) => {
  consumer.value = { ...prod }
  consumerDialog.value = true
}

const saveConsumer = async () => {
  submitted.value = true

  if (consumer.value.full_name.trim()) {
    if (consumer.value.id) {
      await client.from('consumers').update({
        full_name: consumer.value.full_name,
        address: consumer.value.address,
        phone: consumer.value.phone,
        email: consumer.value.email
      }).eq('id', consumer.value.id)
    } else {
      await client.from('consumers').insert([{
        full_name: consumer.value.full_name,
        address: consumer.value.address,
        phone: consumer.value.phone,
        email: consumer.value.email
      }])
    }
    await fetchConsumers()
    consumerDialog.value = false
  }
}

const openExtraCharge = (c: any) => {
  extraCharge.value = { consumer_id: c.id, description: '', amount: 0 }
  extraChargeDialog.value = true
}

const saveExtraCharge = async () => {
  if (extraCharge.value.description && extraCharge.value.amount > 0) {
    const { error } = await client.from('extra_charges').insert([extraCharge.value])
    if (!error) {
      alert('Cargo extra registrado.')
      extraChargeDialog.value = false
    } else {
      alert('Error: ' + error.message)
    }
  }
}

const deleteConsumer = async (id: string) => {
  if (confirm('¿Estás seguro de eliminar este consumidor?')) {
    const { error } = await client.from('consumers').delete().eq('id', id)
    if (!error) await fetchConsumers()
  }
}

onMounted(() => {
  fetchSettings()
  fetchConsumers()
})
</script>

<template>
  <div class="card p-4">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-blue-900 m-0">Gestión de Consumidores</h1>
      <Button label="Nuevo Consumidor" icon="pi pi-plus" class="p-button-success" @click="openNew" />
    </div>

    <DataTable :value="consumers" :loading="loading" stripedRows paginator :rows="10" class="p-datatable-sm shadow rounded-lg overflow-hidden border border-gray-100">
      <Column field="full_name" header="Nombre Completo" sortable class="font-semibold text-gray-700"></Column>
      <Column field="address" header="Dirección"></Column>
      <Column field="phone" header="Teléfono"></Column>
      <Column header="Acciones" :exportable="false" style="min-width:12rem">
        <template #body="slotProps">
          <Button icon="pi pi-plus-circle" v-tooltip="'Agregar Cargo Extra'" class="p-button-text p-button-rounded p-button-warning mr-2" @click="openExtraCharge(slotProps.data)" />
          <Button icon="pi pi-pencil" class="p-button-text p-button-rounded p-button-success mr-2" @click="editConsumer(slotProps.data)" />
          <Button icon="pi pi-trash" class="p-button-text p-button-rounded p-button-danger" @click="deleteConsumer(slotProps.data.id)" />
        </template>
      </Column>
      <template #empty> No se encontraron consumidores. </template>
    </DataTable>

    <!-- Consumer Dialog -->
    <Dialog v-model:visible="consumerDialog" :style="{width: '450px'}" header="Detalles del Consumidor" :modal="true" class="p-fluid">
      <div class="field mb-4">
        <label for="name" class="font-bold block mb-2">Nombre Completo</label>
        <InputText id="name" v-model.trim="consumer.full_name" required="true" autofocus :class="{'p-invalid': submitted && !consumer.full_name}" />
      </div>
      <div class="field mb-4">
        <label for="address" class="font-bold block mb-2">Dirección</label>
        <Textarea id="address" v-model="consumer.address" required="true" rows="3" />
      </div>
      <div class="field mb-4">
        <label for="phone" class="font-bold block mb-2">Teléfono</label>
        <InputText id="phone" v-model="consumer.phone" />
      </div>
      <div class="field mb-4">
        <label for="email" class="font-bold block mb-2">Correo Electrónico</label>
        <InputText id="email" v-model="consumer.email" type="email" />
      </div>
      <template #footer>
        <Button label="Cancelar" icon="pi pi-times" class="p-button-text" @click="hideDialog" />
        <Button label="Guardar" icon="pi pi-check" @click="saveConsumer" />
      </template>
    </Dialog>

    <!-- Extra Charge Dialog -->
    <Dialog v-model:visible="extraChargeDialog" :style="{width: '400px'}" header="Agregar Cargo Extra" :modal="true" class="p-fluid">
      <div class="field mb-4">
        <label for="desc" class="font-bold block mb-2">Descripción</label>
        <InputText id="desc" v-model="extraCharge.description" placeholder="Ej: Cambio de medidor" required />
      </div>
      <div class="field mb-4">
        <label for="amount" class="font-bold block mb-2">Monto ({{ currencySymbol }})</label>
        <InputNumber id="amount" v-model="extraCharge.amount" mode="decimal" :minFractionDigits="2" />
      </div>
      <template #footer>
        <Button label="Cancelar" icon="pi pi-times" class="p-button-text" @click="extraChargeDialog = false" />
        <Button label="Registrar Cargo" icon="pi pi-check" @click="saveExtraCharge" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
}
</style>
