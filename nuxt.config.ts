// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'
import Aura from '@primeuix/themes/aura'
export default defineNuxtConfig({
  modules: ['@primevue/nuxt-module', '@nuxtjs/supabase'],
  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/'],
    }
  },
  css: ['./app/assets/css/main.css', 'primeicons/primeicons.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  primevue: {
    options: {
      theme: {
        preset: Aura,
        options: {
          prefix: 'p',
          darkModeSelector: 'light',
          cssLayer: false,
        },
      },
    },
    /* config */
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
})

