<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">Panel de Administración</h1>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <template #title>Consumidores</template>
        <template #content>Gestiona los residentes del residencial.</template>
        <template #footer>
          <NuxtLink to="/admin/consumers">
            <Button label="Gestionar" class="p-button-sm" />
          </NuxtLink>
        </template>
      </Card>
      <Card>
        <template #title>Lecturas</template>
        <template #content>Revisión y aprobación de consumos del mes.</template>
        <template #footer>
          <NuxtLink to="/admin/approvals">
            <Button label="Aprobar" class="p-button-sm" />
          </NuxtLink>
        </template>
      </Card>
      <Card>
        <template #title>Facturación</template>
        <template #content>Avisos de cobro generados y envío de PDF.</template>
        <template #footer>
          <NuxtLink to="/admin/billing">
            <Button label="Ver Avisos" class="p-button-sm" />
          </NuxtLink>
        </template>
      </Card>
      <Card>
        <template #title>Caja / Pagos</template>
        <template #content>Registro de ingresos y generación de recibos A5.</template>
        <template #footer>
          <NuxtLink to="/admin/payments">
            <Button label="Cobrar" class="p-button-sm p-button-success" />
          </NuxtLink>
        </template>
      </Card>
      <Card>
        <template #title>Configuración</template>
        <template #content>Ajusta las tarifas de agua y configuraciones.</template>
        <template #footer>
          <NuxtLink to="/admin/config">
            <Button label="Configurar" class="p-button-sm p-button-secondary" />
          </NuxtLink>
        </template>
      </Card>
    </div>
  </div>
</template>
