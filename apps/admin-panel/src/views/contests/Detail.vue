<script setup lang="ts">
import { internalApi } from '~/services/api';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const contestCode = computed(() => route.params.code as string);

const contest = ref<any>(null);
const problems = ref<any[]>([]);
const participants = ref<any[]>([]);
const submissions = ref<any[]>([]);
const users = ref<any[]>([]);

const activeTab = ref(0);

const [fetchContest, { loading: contestLoading }] = useLazyPromise(async () => {
  contest.value = await internalApi.contest.getContest(contestCode.value);
});

const [fetchProblems, { loading: problemsLoading }] = useLazyPromise(async () => {
  problems.value = await internalApi.contest.getProblems(contestCode.value);
});

const [fetchParticipants, { loading: participantsLoading }] = useLazyPromise(async () => {
  participants.value = await internalApi.contest.getParticipants(contestCode.value);
});

const [fetchSubmissions, { loading: submissionsLoading }] = useLazyPromise(async () => {
  submissions.value = await internalApi.contest.getSubmissions(contestCode.value);
});

const [fetchUsers] = useLazyPromise(async () => {
  users.value = await internalApi.user.getUsers({});
});

onMounted(async () => {
  await Promise.all([fetchContest(), fetchProblems(), fetchUsers()]);
});

watch(activeTab, (newTab) => {
  if (newTab === 1 && participants.value.length === 0) {
    fetchParticipants();
  } else if (newTab === 2 && submissions.value.length === 0) {
    fetchSubmissions();
  }
});

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

const getSubmissionStatusSeverity = (status: string) => {
  switch (status) {
    case 'AC':
      return 'success';
    case 'WA':
    case 'TLE':
    case 'MLE':
    case 'RE':
    case 'CE':
      return 'danger';
    case 'PENDING':
      return 'warn';
    default:
      return 'contrast';
  }
};

// Submission statistics
const submissionStats = computed(() => {
  if (!submissions.value.length) return null;

  const total = submissions.value.length;
  const ac = submissions.value.filter((s) => s.submissionStatus === 'AC').length;
  const wa = submissions.value.filter((s) => s.submissionStatus === 'WA').length;
  const others = total - ac - wa;

  return { total, ac, wa, others };
});

// Link participant dialog
const showLinkDialog = ref(false);
const selectedParticipant = ref<any>(null);
const selectedUser = ref<string>('');

const openLinkDialog = (participant: any) => {
  selectedParticipant.value = participant;
  selectedUser.value = participant.linked_user?._id || '';
  showLinkDialog.value = true;
};

const closeLinkDialog = () => {
  showLinkDialog.value = false;
  selectedParticipant.value = null;
  selectedUser.value = '';
};

const linkParticipant = async () => {
  try {
    await internalApi.contest.linkParticipant(selectedParticipant.value._id, {
      user: selectedUser.value || undefined,
    });
    toast.success('Participant linked successfully');
    closeLinkDialog();
    await fetchParticipants();
  } catch (error: any) {
    toast.error(error?.message || 'Failed to link participant');
  }
};

const goBack = () => {
  router.push('/contests');
};
</script>

<template>
  <div>
    <div class="flex items-center gap-4 mb-4">
      <Button
        icon="pi pi-arrow-left"
        severity="secondary"
        @click="goBack"
      />
      <h1 class="text-3xl font-bold">Contest Details</h1>
    </div>
    <Divider class="mb-6" />

    <div v-if="contestLoading">
      <ProgressSpinner />
    </div>

    <div v-else-if="contest">
      <TabView v-model:activeIndex="activeTab">
        <!-- Overview Tab -->
        <TabPanel header="Overview">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Contest Metadata -->
            <Card>
              <template #title>Contest Information</template>
              <template #content>
                <div class="flex flex-col gap-3">
                  <div>
                    <span class="font-semibold">Code:</span>
                    <Tag :value="contest.code" class="ml-2" />
                  </div>
                  <div>
                    <span class="font-semibold">Name:</span>
                    <span class="ml-2">{{ contest.name }}</span>
                  </div>
                  <div>
                    <span class="font-semibold">Start Time:</span>
                    <span class="ml-2">{{ formatDateTime(contest.start_time) }}</span>
                  </div>
                  <div>
                    <span class="font-semibold">End Time:</span>
                    <span class="ml-2">{{ formatDateTime(contest.end_time) }}</span>
                  </div>
                  <div v-if="contest.frozen_at">
                    <span class="font-semibold">Frozen At:</span>
                    <span class="ml-2">{{ formatDateTime(contest.frozen_at) }}</span>
                  </div>
                  <div v-if="contest.last_sync_at">
                    <span class="font-semibold">Last Sync:</span>
                    <span class="ml-2">{{ formatDateTime(contest.last_sync_at) }}</span>
                  </div>
                </div>
              </template>
            </Card>

            <!-- Submission Statistics -->
            <Card>
              <template #title>Submission Statistics</template>
              <template #content>
                <div v-if="submissionStats" class="flex flex-col gap-3">
                  <div>
                    <span class="font-semibold">Total Submissions:</span>
                    <Tag :value="submissionStats.total" class="ml-2" />
                  </div>
                  <div>
                    <span class="font-semibold">AC Submissions:</span>
                    <Tag :value="submissionStats.ac" severity="success" class="ml-2" />
                  </div>
                  <div>
                    <span class="font-semibold">WA Submissions:</span>
                    <Tag :value="submissionStats.wa" severity="danger" class="ml-2" />
                  </div>
                  <div>
                    <span class="font-semibold">Other Submissions:</span>
                    <Tag :value="submissionStats.others" class="ml-2" />
                  </div>
                </div>
                <div v-else>
                  <Button
                    label="Load Statistics"
                    @click="fetchSubmissions"
                  />
                </div>
              </template>
            </Card>
          </div>

          <!-- Problems List -->
          <Card class="mt-6">
            <template #title>Problems</template>
            <template #content>
              <DataTable
                :value="problems"
                :loading="problemsLoading"
                stripedRows
              >
                <Column field="code" header="Code" sortable>
                  <template #body="{ data }">
                    <Tag :value="data.code" />
                  </template>
                </Column>
                <Column field="contest" header="Contest" sortable />
              </DataTable>
            </template>
          </Card>
        </TabPanel>

        <!-- Participants Tab -->
        <TabPanel header="Participants">
          <DataTable
            :value="participants"
            :loading="participantsLoading"
            stripedRows
            paginator
            :rows="20"
            :rowsPerPageOptions="[10, 20, 50]"
          >
            <Column field="rank" header="Rank" sortable />
            <Column field="vnoj_username" header="VNOJ Username" sortable>
              <template #body="{ data }">
                <Tag :value="data.vnoj_username" />
              </template>
            </Column>
            <Column field="linked_user" header="Linked User">
              <template #body="{ data }">
                <Tag
                  v-if="data.linked_user"
                  :value="data.linked_user.username"
                  severity="success"
                />
                <Tag
                  v-else
                  value="Not Linked"
                  severity="warn"
                />
              </template>
            </Column>
            <Column header="Actions">
              <template #body="{ data }">
                <Button
                  icon="pi pi-link"
                  severity="info"
                  size="small"
                  @click="openLinkDialog(data)"
                />
              </template>
            </Column>
          </DataTable>
        </TabPanel>

        <!-- Submissions Tab -->
        <TabPanel header="Submissions">
          <DataTable
            :value="submissions"
            :loading="submissionsLoading"
            stripedRows
            paginator
            :rows="20"
            :rowsPerPageOptions="[10, 20, 50, 100]"
          >
            <Column field="author" header="Author" sortable>
              <template #body="{ data }">
                <Tag :value="data.author" />
              </template>
            </Column>
            <Column field="problem_code" header="Problem" sortable>
              <template #body="{ data }">
                <Tag :value="data.problem_code" />
              </template>
            </Column>
            <Column field="submittedAt" header="Submitted At" sortable>
              <template #body="{ data }">
                {{ formatDateTime(data.submittedAt) }}
              </template>
            </Column>
            <Column field="judgedAt" header="Judged At" sortable>
              <template #body="{ data }">
                {{ data.judgedAt ? formatDateTime(data.judgedAt) : 'N/A' }}
              </template>
            </Column>
            <Column field="submissionStatus" header="Status" sortable>
              <template #body="{ data }">
                <Tag
                  :value="data.submissionStatus"
                  :severity="getSubmissionStatusSeverity(data.submissionStatus)"
                />
              </template>
            </Column>
            <Column field="data.score" header="Score" sortable />
            <Column field="data.penalty" header="Penalty" sortable />
            <Column field="data.old_rank" header="Old Rank" sortable />
            <Column field="data.new_rank" header="New Rank" sortable />
            <Column field="data.reaction" header="Reaction">
              <template #body="{ data }">
                <a
                  v-if="data.data.reaction"
                  :href="data.data.reaction"
                  target="_blank"
                  class="text-blue-500 hover:underline"
                >
                  View
                </a>
                <Tag
                  v-else
                  value="N/A"
                  severity="secondary"
                />
              </template>
            </Column>
          </DataTable>
        </TabPanel>
      </TabView>
    </div>

    <!-- Link Participant Dialog -->
    <Dialog
      v-model:visible="showLinkDialog"
      header="Link Participant to User"
      :modal="true"
      :style="{ width: '500px' }"
    >
      <div class="flex flex-col gap-4 py-4">
        <div>
          <span class="font-semibold">VNOJ Username:</span>
          <span class="ml-2">{{ selectedParticipant?.vnoj_username }}</span>
        </div>
        <div class="flex flex-col gap-2">
          <label for="select-user">Select User</label>
          <Select
            id="select-user"
            v-model="selectedUser"
            :options="users"
            optionLabel="username"
            optionValue="username"
            placeholder="Select a user"
            :filter="true"
          />
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          @click="closeLinkDialog"
        />
        <Button
          label="Link"
          @click="linkParticipant"
        />
      </template>
    </Dialog>
  </div>
</template>
