<script lang="ts" setup>
import { internalApi, printingApi } from '~/services/api';

const onlineContestants = ref<number>(0);
const queuedPrintJobs = ref<number>(0);

const [fetchUsers] = useLazyPromise(
  async () => {
    const contestants = await internalApi.user.getUsers({
      isOnline: true,
      role: 'contestant',
    });
    onlineContestants.value = contestants.length;
  }
);

const [fetchPrintJobs] = useLazyPromise(
  async () => {
    const printJobs = await printingApi.printing.getPrintJobs({
      status: 'queued',
    });
    queuedPrintJobs.value = printJobs.length;
  }
);

onMounted(async () => {
  await fetchUsers();
  await fetchPrintJobs();
});
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold mb-4">Dashboard</h1>
    <Divider class="mb-6" />

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Online Contestants Card -->
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-users text-xl"></i>
            <span>Online contestants</span>
          </div>
        </template>
        <template #content>
          <p class="text-4xl font-bold">{{ onlineContestants }}</p>
        </template>
      </Card>

      <!-- Queued Print Jobs Card -->
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-print text-xl"></i>
            <span>Queued print jobs</span>
          </div>
        </template>
        <template #content>
          <p class="text-4xl font-bold">{{ queuedPrintJobs }}</p>
        </template>
      </Card>
    </div>
  </div>
</template>
