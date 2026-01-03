<script setup lang="ts">
const client = useSupabaseClient()
const router = useRouter()

client.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    router.push('/update-password')
  }
})

onMounted(() => {
  // Manual check for invite/recovery token in hash
  if (window.location.hash && (window.location.hash.includes('type=invite') || window.location.hash.includes('type=recovery'))) {
      router.push('/update-password')
  }
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
