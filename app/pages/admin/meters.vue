<script setup lang="ts">
const client = useSupabaseClient()

// State
const meters = ref<any[]>([])
const consumers = ref<any[]>([])
const loading = ref(true)
const meterDialog = ref(false)
const assignmentDialog = ref(false)
const submitted = ref(false)

const meter = ref({
  id: null,
  serial_number: '',
  initial_reading: 0
})

const assignment = ref({
  consumer_id: null,
  meter_id: null
})

// Fetch data
const fetchMeters = async () => {
  loading.value = true
  const { data, error } = await client
    .from('meters')
    .select(`
      *,
      meter_assignments(
        id,
        is_active,
        consumer:consumers(full_name)
      )
    `)
    .order('serial_number', { ascending: true })
  
  if (!error) {
    meters.value = data
  }
  loading.value = false
}

const fetchConsumers = async () => {
  const { data } = await client.from('consumers').select('id, full_name').order('full_name')
  consumers.value = data || []
}

// Meter Dialog actions
const openNewMeter = () => {
  meter.value = { id: null, serial_number: '', initial_reading: 0 }
  submitted.value = false
  meterDialog.value = true
}

const saveMeter = async () => {
  submitted.value = true
  if (meter.value.serial_number.trim()) {
    if (meter.value.id) {
      await client.from('meters').update(meter.value).eq('id', meter.value.id)
    } else {
      // Create payload without ID to let DB autogenerate it
      const { id, ...newMeter } = meter.value
      await client.from('meters').insert([newMeter])
    }
    await fetchMeters()
    meterDialog.value = false
  }
}

// Assignment Logic
const openAssignment = (m: any) => {
  assignment.value = { meter_id: m.id, consumer_id: null }
  assignmentDialog.value = true
}

const saveAssignment = async () => {
  if (assignment.value.consumer_id && assignment.value.meter_id) {
    // Deactivate previous active assignments for this consumer 
    // (a consumer should have only one active meter)
    await client.from('meter_assignments')
      .update({ unassigned_at: new Date().toISOString() })
      .eq('consumer_id', assignment.value.consumer_id)
      .is('unassigned_at', null)

    // Deactivate previous active assignments for this meter
    await client.from('meter_assignments')
      .update({ unassigned_at: new Date().toISOString() })
      .eq('meter_id', assignment.value.meter_id)
      .is('unassigned_at', null)

    // Create new assignment
    await client.from('meter_assignments').insert([assignment.value])
    
    await fetchMeters()
    assignmentDialog.value = false
  }
}

const getActiveConsumer = (meterRow: any) => {
  const active = meterRow.meter_assignments?.find((a: any) => a.is_active)
  return active ? active.consumer?.full_name : 'No asignado'
}

onMounted(() => {
  fetchMeters()
  fetchConsumers()
})
</script>

<template>
  <div class="card p-4">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-blue-900 m-0">Gestión de Medidores</h1>
      <Button label="Nuevo Medidor" icon="pi pi-plus" class="p-button-success" @click="openNewMeter" />
    </div>

    <DataTable :value="meters" :loading="loading" stripedRows paginator :rows="10" class="p-datatable-sm shadow rounded-lg border border-gray-100">
      <Column field="serial_number" header="S/N Medidor" sortable></Column>
      <Column field="initial_reading" header="Lectura Inicial"></Column>
      <Column header="Consumidor Actual">
        <template #body="slotProps">
          <span :class="{'text-gray-400 italic': getActiveConsumer(slotProps.data) === 'No asignado'}">
            {{ getActiveConsumer(slotProps.data) }}
          </span>
        </template>
      </Column>
      <Column header="Acciones">
        <template #body="slotProps">
          <Button icon="pi pi-user-plus" label="Asignar" class="p-button-text p-button-sm mr-2" @click="openAssignment(slotProps.data)" />
          <Button icon="pi pi-pencil" class="p-button-text p-button-success p-button-sm" @click="meterDialog = true; meter = {...slotProps.data}" />
        </template>
      </Column>
    </DataTable>

    <!-- Meter Dialog -->
    <Dialog v-model:visible="meterDialog" :style="{width: '400px'}" header="Detalles del Medidor" :modal="true" class="p-fluid">
      <div class="field mb-4">
        <label for="serial" class="font-bold block mb-2">Número de Serie</label>
        <InputText id="serial" v-model.trim="meter.serial_number" required="true" />
      </div>
      <div class="field mb-4">
        <label for="reading" class="font-bold block mb-2">Lectura Inicial (m³)</label>
        <InputNumber id="reading" v-model="meter.initial_reading" mode="decimal" :minFractionDigits="2" />
      </div>
      <template #footer>
        <Button label="Cancelar" icon="pi pi-times" class="p-button-text" @click="meterDialog = false" />
        <Button label="Guardar" icon="pi pi-check" @click="saveMeter" />
      </template>
    </Dialog>

    <!-- Assignment Dialog -->
    <Dialog v-model:visible="assignmentDialog" :style="{width: '400px'}" header="Asignar Medidor a Consumidor" :modal="true" class="p-fluid">
      <div class="field mb-4">
        <label class="font-bold block mb-2">Seleccionar Consumidor</label>
        <Select v-model="assignment.consumer_id" :options="consumers" optionLabel="full_name" optionValue="id" placeholder="Buscar consumidor..." filter />
      </div>
      <p class="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
        <i class="pi pi-exclamation-triangle mr-1"></i>
        Si el consumidor ya tiene un medidor activo, este se desactivará automáticamente.
      </p>
      <template #footer>
        <Button label="Cancelar" icon="pi pi-times" class="p-button-text" @click="assignmentDialog = false" />
        <Button label="Confirmar Asignación" icon="pi pi-check" @click="saveAssignment" />
      </template>
    </Dialog>
  </div>
</template>
