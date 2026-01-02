<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <div class="flex justify-center mb-6">
        <div class="bg-blue-900 p-3 rounded-xl shadow-lg">
           <i class="pi pi-tint text-white text-3xl"></i>
        </div>
      </div>
      <h2 class="mt-2 text-center text-3xl font-extrabold text-blue-900">
        Aguas Terrasol
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        Plataforma de Gestión de Servicios
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
        <slot />
      </div>
    </div>
  </div>
</template>
