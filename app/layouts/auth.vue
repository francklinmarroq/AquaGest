<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <div class="flex justify-center mb-4">
        <!-- Logo matching navbar style -->
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl shadow-lg flex items-center justify-center">
            <i class="pi pi-tint text-white text-2xl"></i>
          </div>
          <div class="flex flex-col justify-center">
            <span class="text-3xl font-black text-slate-800 tracking-tighter leading-none">AquaGest</span>
            <span class="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Control de Servicios</span>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
        <slot />
      </div>
    </div>
  </div>
</template>
