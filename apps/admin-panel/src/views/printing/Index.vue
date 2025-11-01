<script setup lang="ts">
import { printingApi } from '~/services/api';

const toast = useToast();

// Print job data
const printJobs = ref<any[]>([]);

// Filter states
const statusFilter = ref<'queued' | 'done' | 'all'>('all');

// Dialog state
const showDialog = ref(false);
const editingJob = ref<any | null>(null);
const newStatus = ref<'queued' | 'done'>();

const statusOptions = ['queued', 'printing', 'completed', 'failed', 'cancelled'];
const filterOptions = ['all', ...statusOptions];

const [fetchPrintJobs, { loading: jobsLoading }] = useLazyPromise(async () => {
  const status = statusFilter.value === 'all' ? undefined : statusFilter.value;
  printJobs.value = await printingApi.printing.getPrintJobs({ status });
});

watch(statusFilter, () => {
  fetchPrintJobs();
});

onMounted(async () => {
  await fetchPrintJobs();
});

const getStatusColor = (status: string) => {
  switch (status) {
    case 'queued':
      return 'info';
    case 'printing':
      return 'warn';
    case 'completed':
      return 'success';
    case 'failed':
      return 'danger';
    case 'cancelled':
      return 'secondary';
    default:
      return 'contrast';
  }
};

const openStatusDialog = (job: any) => {
  editingJob.value = job;
  newStatus.value = job.status;
  showDialog.value = true;
};

const closeDialog = () => {
  showDialog.value = false;
  editingJob.value = null;
};

const updateJobStatus = async () => {
  try {
    if (!editingJob.value) return;

    await printingApi.printing.updatePrintJob(editingJob.value.id, {
      status: newStatus.value,
    });

    toast.success('Print job status updated successfully');
    closeDialog();
    await fetchPrintJobs();
  } catch (error: any) {
    toast.error(error?.message || 'Failed to update print job status');
  }
};
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-3xl font-bold">Print Jobs</h1>
      <Button
        label="Refresh"
        icon="pi pi-refresh"
        @click="fetchPrintJobs"
        :loading="jobsLoading"
      />
    </div>
    <Divider class="mb-6" />

    <!-- Filters -->
    <div class="mb-6">
      <div class="flex flex-col gap-2">
        <label for="statusFilter">Filter by Status</label>
        <Select
          id="statusFilter"
          v-model="statusFilter"
          :options="filterOptions"
          placeholder="Select status"
          class="w-64"
        />
      </div>
    </div>

    <!-- Data Table -->
    <DataTable
      :value="printJobs"
      :loading="jobsLoading"
      stripedRows
      paginator
      :rows="10"
      :rowsPerPageOptions="[5, 10, 20, 50]"
      tableStyle="min-width: 50rem"
    >
      <Column field="id" header="Job ID" sortable>
        <template #body="{ data }">
          <span class="font-mono text-sm">{{ data.id }}</span>
        </template>
      </Column>

      <Column field="username" header="Username" sortable>
        <template #body="{ data }">
          <Tag :value="data.username" />
        </template>
      </Column>

      <Column field="fileName" header="File Name" sortable>
        <template #body="{ data }">
          <span class="text-sm">{{ data.fileName }}</span>
        </template>
      </Column>

      <Column field="pages" header="Pages" sortable>
        <template #body="{ data }">
          <span>{{ data.pages || 'N/A' }}</span>
        </template>
      </Column>

      <Column field="copies" header="Copies" sortable>
        <template #body="{ data }">
          <span>{{ data.copies || 1 }}</span>
        </template>
      </Column>

      <Column field="status" header="Status" sortable>
        <template #body="{ data }">
          <Tag
            :value="data.status"
            :severity="getStatusColor(data.status)"
          />
        </template>
      </Column>

      <Column field="createdAt" header="Created At" sortable>
        <template #body="{ data }">
          <span class="text-sm">{{ new Date(data.createdAt).toLocaleString() }}</span>
        </template>
      </Column>

      <Column field="updatedAt" header="Updated At" sortable>
        <template #body="{ data }">
          <span class="text-sm">{{ new Date(data.updatedAt).toLocaleString() }}</span>
        </template>
      </Column>

      <Column header="Actions">
        <template #body="{ data }">
          <Button
            icon="pi pi-pencil"
            severity="info"
            size="small"
            @click="openStatusDialog(data)"
            label="Update Status"
          />
        </template>
      </Column>
    </DataTable>

    <!-- Status Update Dialog -->
    <Dialog
      v-model:visible="showDialog"
      header="Update Print Job Status"
      :modal="true"
      :style="{ width: '400px' }"
    >
      <div class="flex flex-col gap-4 py-4">
        <div class="flex flex-col gap-2">
          <label>Job ID</label>
          <span class="font-mono text-sm p-2 bg-surface-100 dark:bg-surface-800 rounded">
            {{ editingJob?.id }}
          </span>
        </div>

        <div class="flex flex-col gap-2">
          <label>File Name</label>
          <span class="text-sm p-2 bg-surface-100 dark:bg-surface-800 rounded">
            {{ editingJob?.fileName }}
          </span>
        </div>

        <div class="flex flex-col gap-2">
          <label>Current Status</label>
          <Tag
            :value="editingJob?.status"
            :severity="getStatusColor(editingJob?.status)"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label for="newStatus">New Status</label>
          <Select
            id="newStatus"
            v-model="newStatus"
            :options="statusOptions"
            placeholder="Select new status"
          />
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          @click="closeDialog"
        />
        <Button
          label="Update"
          @click="updateJobStatus"
        />
      </template>
    </Dialog>
  </div>
</template>
