<script setup lang="ts">
import { internalApi } from '~/services/api';

const router = useRouter();
const toast = useToast();

const contests = ref<any[]>([]);
const filter = routerRef<'all' | 'ongoing' | 'past' | 'future'>('filter', 'ongoing');

const [fetchContests, { loading: contestsLoading }] = useLazyPromise(async () => {
  contests.value = await internalApi.contest.getContests({ filter: filter.value });
});

watch(filter, () => {
  fetchContests();
});

onMounted(async () => {
  await fetchContests();
});

const showCreateDialog = ref(false);
const createFormData = ref({
  code: '',
});
const creatingContest = ref(false);

const openCreateDialog = () => {
  createFormData.value = {
    code: '',
  };
  showCreateDialog.value = true;
};

const closeCreateDialog = () => {
  showCreateDialog.value = false;
  createFormData.value = {
    code: '',
  };
};

const createContest = async () => {
  try {
    creatingContest.value = true;
    await internalApi.contest.create(createFormData.value);
    toast.success('Contest created and synced successfully from VNOJ');
    closeCreateDialog();
    await fetchContests();
  } catch (error: any) {
    toast.error(error?.message || 'Failed to create contest');
  } finally {
    creatingContest.value = false;
  }
};

const viewContestDetails = (code: string) => {
  router.push(`/contests/${code}`);
};

const getContestStatus = (contest: any) => {
  const now = new Date();
  const startTime = new Date(contest.start_time);
  const endTime = new Date(contest.end_time);

  if (now < startTime) return 'upcoming';
  if (now > endTime) return 'ended';
  return 'ongoing';
};

const getStatusSeverity = (status: string) => {
  switch (status) {
    case 'ongoing':
      return 'success';
    case 'upcoming':
      return 'info';
    case 'ended':
      return 'secondary';
    default:
      return 'contrast';
  }
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-3xl font-bold">Contests</h1>
      <Button
        label="Create Contest"
        icon="pi pi-plus"
        @click="openCreateDialog"
      />
    </div>
    <Divider class="mb-6" />

    <!-- Filters -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="flex flex-col gap-2">
        <label for="filter">Filter</label>
        <Select
          id="filter"
          v-model="filter"
          :options="['all', 'ongoing', 'past', 'future']"
          placeholder="Select filter"
        />
      </div>
    </div>

    <!-- Data Table -->
    <DataTable
      :value="contests"
      :loading="contestsLoading"
      stripedRows
      paginator
      :rows="10"
      :rowsPerPageOptions="[5, 10, 20, 50]"
      tableStyle="min-width: 50rem"
    >
      <Column field="code" header="Code" sortable>
        <template #body="{ data }">
          <Tag :value="data.code" />
        </template>
      </Column>

      <Column field="name" header="Name" sortable />

      <Column field="start_time" header="Start Time" sortable>
        <template #body="{ data }">
          {{ formatDateTime(data.start_time) }}
        </template>
      </Column>

      <Column field="end_time" header="End Time" sortable>
        <template #body="{ data }">
          {{ formatDateTime(data.end_time) }}
        </template>
      </Column>

      <Column header="Status" sortable>
        <template #body="{ data }">
          <Tag
            :value="getContestStatus(data)"
            :severity="getStatusSeverity(getContestStatus(data))"
          />
        </template>
      </Column>

      <Column header="Actions">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button
              icon="pi pi-eye"
              severity="info"
              size="small"
              @click="viewContestDetails(data.code)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Create Contest Dialog -->
    <Dialog
      v-model:visible="showCreateDialog"
      header="Create Contest from VNOJ"
      :modal="true"
      :style="{ width: '500px' }"
    >
      <div class="flex flex-col gap-4 py-4">
        <p class="text-sm text-gray-600">
          Enter the VNOJ contest code. All contest details, problems, and participants will be automatically fetched from VNOJ.
        </p>

        <div class="flex flex-col gap-2">
          <label for="create-code">Contest Code</label>
          <InputText
            id="create-code"
            v-model="createFormData.code"
            placeholder="e.g., vnoicup25_r2"
            :disabled="creatingContest"
          />
          <small class="text-gray-500">
            Example: vnoicup25_r2, icpc2024, etc.
          </small>
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          :disabled="creatingContest"
          @click="closeCreateDialog"
        />
        <Button
          :label="creatingContest ? 'Creating...' : 'Create & Sync'"
          :loading="creatingContest"
          :disabled="!createFormData.code || creatingContest"
          @click="createContest"
        />
      </template>
    </Dialog>
  </div>
</template>
