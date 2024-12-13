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
  <h1>Dashboard</h1>
  <v-divider class="mb-4"></v-divider>
  <v-row>
    <v-col cols="6">
      <app-dashboard-card title="Online contestants" icon="mdi-account-group">
        <p>{{ onlineContestants }}</p>
      </app-dashboard-card>
    </v-col>

    <v-col cols="6">
      <app-dashboard-card title="Queued print jobs" icon="mdi-printer">
        <p>{{ queuedPrintJobs }}</p>
      </app-dashboard-card>
    </v-col>
  </v-row>
</template>
