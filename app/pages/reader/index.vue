<script setup lang="ts">
const client = useSupabaseClient()
const user = useSupabaseUser()

// State
const searchQuery = ref('')
const consumers = ref<any[]>([])
const loading = ref(false)
const selectedConsumer = ref<any>(null)
const readingDialog = ref(false)
const readingValue = ref()
const photoFile = ref<File | null>(null)
const uploading = ref(false)

const searchConsumers = async () => {
  if (searchQuery.value.length < 2) return
  
  loading.value = true
  const { data } = await client
    .from('consumers')
    .select(`
      id, full_name, address,
      meter_assignments(
        id, is_active,
        meter:meters(id, serial_number)
      )
    `)
    .ilike('full_name', `%${searchQuery.value}%`)
    .limit(10)
  
  consumers.value = data || []
  loading.value = false
}

const openReading = (consumer: any) => {
  selectedConsumer.value = consumer
  readingValue.value = null
  photoFile.value = null
  readingDialog.value = true
}

const onFileSelect = (event: any) => {
  photoFile.value = event.files[0]
}

const submitReading = async () => {
  if (!readingValue.value || !photoFile.value || !selectedConsumer.value) {
    alert('Por favor completa todos los campos y adjunta la foto.')
    return
  }

  const activeAssignment = selectedConsumer.value.meter_assignments.find((a: any) => a.is_active)
  if (!activeAssignment) {
    alert('Este consumidor no tiene un medidor activo.')
    return
  }

  uploading.value = true

  try {
    const meterId = activeAssignment.meter.id
    const consumerId = selectedConsumer.value.id
    const fileName = `${Date.now()}.jpg`
    const filePath = `${consumerId}/${activeAssignment.meter.serial_number}/${fileName}`

    // 1. Upload Photo
    const { error: uploadError } = await client.storage
      .from('meter-photos')
      .upload(filePath, photoFile.value)

    if (uploadError) throw uploadError

    // 2. Insert Reading
    const { error: insertError } = await client
      .from('meter_readings')
      .insert([{
        meter_id: meterId,
        consumer_id: consumerId,
        reading_value: readingValue.value,
        photo_path: filePath,
        created_by: user.value?.id
      }])

    if (insertError) throw insertError

    alert('Lectura registrada con éxito.')
    readingDialog.value = false
    searchConsumers()
  } catch (e: any) {
    alert('Error: ' + e.message)
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="card p-4 mx-auto max-w-lg">
    <h1 class="text-2xl font-bold text-blue-900 mb-6">Toma de Lecturas</h1>

    <!-- Search Section -->
    <div class="mb-6">
      <span class="p-input-icon-left w-full">
        <i class="pi pi-search" />
        <InputText v-model="searchQuery" @input="searchConsumers" placeholder="Buscar por nombre..." class="w-full" />
      </span>
    </div>

    <!-- Results -->
    <div v-if="loading" class="text-center py-4">
      <ProgressSpinner style="width: 50px; height: 50px" />
    </div>

    <div v-else class="space-y-4">
      <div v-for="c in consumers" :key="c.id" 
           class="p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-blue-300 cursor-pointer transition-colors"
           @click="openReading(c)">
        <div class="font-bold text-lg text-gray-800">{{ c.full_name }}</div>
        <div class="text-sm text-gray-500">{{ c.address }}</div>
        <div class="mt-2 text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded inline-block">
          S/N: {{ c.meter_assignments.find((a: any) => a.is_active)?.meter?.serial_number || 'SIN MEDIDOR' }}
        </div>
      </div>
      
      <div v-if="consumers.length === 0 && searchQuery.length >= 2" class="text-center text-gray-400 py-10">
        No se encontraron resultados.
      </div>
    </div>

    <!-- Reading Dialog -->
    <Dialog v-model:visible="readingDialog" header="Nueva Lectura" :modal="true" class="p-fluid max-w-sm" :breakpoints="{'960px': '75vw', '640px': '90vw'}">
      <div v-if="selectedConsumer" class="space-y-6 mt-2">
        <div class="bg-gray-50 p-3 rounded text-sm mb-4">
          <p class="font-bold">{{ selectedConsumer.full_name }}</p>
          <p class="text-gray-600">Medidor: {{ selectedConsumer.meter_assignments.find((a: any) => a.is_active)?.meter?.serial_number }}</p>
        </div>

        <div class="field">
          <label class="font-bold block mb-2">Lectura Actual (m³)</label>
          <InputNumber v-model="readingValue" mode="decimal" :minFractionDigits="2" placeholder="0.00" autofocus />
        </div>

        <div class="field">
          <label class="font-bold block mb-2">Fotografía del Medidor</label>
          <FileUpload mode="basic" name="demo[]" accept="image/*" :maxFileSize="10000000" customUpload @select="onFileSelect" chooseLabel="Tomar Foto" class="w-full" />
          <p v-if="photoFile" class="text-xs text-green-600 mt-1">✓ Foto seleccionada: {{ photoFile.name }}</p>
        </div>

        <Button label="Guardar Lectura" icon="pi pi-check" :loading="uploading" class="p-button-lg mt-4" @click="submitReading" />
      </div>
    </Dialog>
  </div>
</template>
