<script setup lang="ts">
const user = useSupabaseUser()

watch(user, () => {
  if (user.value) {
    return navigateTo('/')
  }
}, { immediate: true })
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <p>Redirigiendo...</p>
  </div>
</template>
