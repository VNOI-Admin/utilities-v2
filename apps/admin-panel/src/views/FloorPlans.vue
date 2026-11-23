<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useFloorPlanStore } from '~/stores/floorplan';
import PageHeader from '~/components/PageHeader.vue';
import SearchInput from '~/components/SearchInput.vue';
import MissionModal from '~/components/MissionModal.vue';
import { Plus, Pencil, Eye, Trash2 } from 'lucide-vue-next';

const router = useRouter();
const store = useFloorPlanStore();

const searchQuery = ref('');
const showCreateModal = ref(false);
const showDeleteModal = ref(false);
const selectedPlan = ref<string | null>(null);

const newPlan = ref({
  code: '',
  name: '',
  description: '',
});

// Filtered floor plans
const filteredPlans = computed(() => {
  if (!searchQuery.value) return store.floorPlans;
  const query = searchQuery.value.toLowerCase();
  return store.floorPlans.filter(
    (fp) =>
      fp.code.toLowerCase().includes(query) ||
      fp.name.toLowerCase().includes(query) ||
      fp.description?.toLowerCase().includes(query),
  );
});

onMounted(() => {
  store.fetchFloorPlans();
});

async function handleCreate() {
  if (!newPlan.value.code.trim() || !newPlan.value.name.trim()) return;

  try {
    const plan = await store.createFloorPlan({
      code: newPlan.value.code.trim(),
      name: newPlan.value.name.trim(),
      description: newPlan.value.description.trim() || undefined,
    });
    showCreateModal.value = false;
    newPlan.value = { code: '', name: '', description: '' };
    router.push(`/floor-plans/${plan.code}/edit`);
  } catch (e) {
    // Error is handled by store
  }
}

function confirmDelete(code: string) {
  selectedPlan.value = code;
  showDeleteModal.value = true;
}

async function handleDelete() {
  if (!selectedPlan.value) return;
  await store.deleteFloorPlan(selectedPlan.value);
  showDeleteModal.value = false;
  selectedPlan.value = null;
}

function viewPlan(code: string) {
  router.push(`/floor-plans/${code}/view`);
}

function editPlan(code: string) {
  router.push(`/floor-plans/${code}/edit`);
}
</script>

<template>
  <div class="floor-plans-page p-4 md:p-8 max-w-[1440px] mx-auto space-y-5">
    <!-- Header -->
    <div class="flex flex-wrap items-end gap-3">
      <PageHeader class="flex-1 min-w-0" title="Floor plans" />

      <button class="btn-primary" @click="showCreateModal = true">
        <Plus :size="16" :stroke-width="2" />
        <span>New floor plan</span>
      </button>
    </div>

    <!-- Search -->
    <div class="flex flex-wrap items-center gap-2">
      <SearchInput
        v-model="searchQuery"
        placeholder="Search name, code or description"
        container-class="w-full md:w-80"
      />
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="mission-card overflow-hidden">
      <div v-for="i in 4" :key="i" class="h-16 border-b border-white/[0.06] last:border-0 animate-pulse bg-white/[0.02]"></div>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="p-4 rounded-xl bg-mission-red/10 text-mission-red text-sm">
      {{ store.error }}
    </div>

    <!-- Empty State -->
    <EmptyState
      v-else-if="filteredPlans.length === 0"
      :title="searchQuery ? 'No floor plans match your search' : 'No floor plans yet'"
      :subtitle="searchQuery ? 'Try another name or code.' : 'Create one to place tables and bind users to seats.'"
    >
      <template #action>
        <button
          v-if="!searchQuery"
          class="btn-primary mt-4"
          @click="showCreateModal = true"
        >
          <Plus :size="16" :stroke-width="2" />
          <span>New floor plan</span>
        </button>
      </template>
    </EmptyState>

    <!-- Floor Plans Table -->
    <MissionTable
      v-else
      :items="filteredPlans"
      item-key="code"
      grid-template-columns="minmax(0, 2fr) minmax(0, 1fr) 80px 100px 120px"
      min-width="680px"
      clickable
      :show-hover-arrow="false"
      @row-click="(plan) => viewPlan(plan.code)"
    >
      <template #header>
        <div>Name</div>
        <div>Code</div>
        <div>Floors</div>
        <div>Status</div>
        <div class="text-right">Actions</div>
      </template>

      <template #row="{ item: plan }">
        <div class="min-w-0">
          <div class="font-medium truncate">{{ plan.name }}</div>
          <div v-if="plan.description" class="text-sm text-mission-muted truncate" :title="plan.description">
            {{ plan.description }}
          </div>
        </div>
        <div class="font-mono text-sm text-mission-muted truncate">{{ plan.code }}</div>
        <div class="text-sm tabular-nums">{{ plan.floors.length }}</div>
        <div>
          <StatusBadge v-if="plan.isActive" status="completed" text="Active" />
          <StatusBadge v-else variant="gray" text="Inactive" />
        </div>
        <div class="flex items-center justify-end gap-1" @click.stop>
          <button
            class="p-2 rounded-lg text-mission-muted hover:text-gray-100 hover:bg-white/[0.06] transition-colors"
            title="View"
            @click="viewPlan(plan.code)"
          >
            <Eye :size="16" :stroke-width="2" />
          </button>
          <button
            class="p-2 rounded-lg text-mission-muted hover:text-gray-100 hover:bg-white/[0.06] transition-colors"
            title="Edit"
            @click="editPlan(plan.code)"
          >
            <Pencil :size="16" :stroke-width="2" />
          </button>
          <button
            class="p-2 rounded-lg text-mission-muted hover:text-mission-red hover:bg-mission-red/10 transition-colors"
            title="Delete"
            @click="confirmDelete(plan.code)"
          >
            <Trash2 :size="16" :stroke-width="2" />
          </button>
        </div>
      </template>
    </MissionTable>

    <!-- Create Modal -->
    <MissionModal
      :show="showCreateModal"
      title="New floor plan"
      @close="showCreateModal = false"
    >
      <div class="space-y-4">
        <div>
          <label class="tech-label block mb-1.5">Code</label>
          <input
            v-model="newPlan.code"
            type="text"
            class="input-mission font-mono"
            placeholder="floor-plan-1"
          />
          <p class="text-xs text-mission-muted mt-1.5">Unique, lowercase, no spaces.</p>
        </div>

        <div>
          <label class="tech-label block mb-1.5">Name</label>
          <input
            v-model="newPlan.name"
            type="text"
            class="input-mission"
            placeholder="Main building"
          />
        </div>

        <div>
          <label class="tech-label block mb-1.5">Description (optional)</label>
          <textarea
            v-model="newPlan.description"
            class="input-mission"
            rows="3"
          />
        </div>
      </div>

      <template #actions>
        <button class="btn-secondary" @click="showCreateModal = false">Cancel</button>
        <button class="btn-primary" @click="handleCreate">Create</button>
      </template>
    </MissionModal>

    <!-- Delete Confirmation Modal -->
    <MissionModal
      :show="showDeleteModal"
      title="Delete floor plan?"
      max-width="md"
      @close="showDeleteModal = false"
    >
      <p class="text-sm text-gray-300">
        This deletes <span class="font-mono text-gray-100">{{ selectedPlan }}</span> and all of its floors. This can't be undone.
      </p>

      <template #actions>
        <button class="btn-secondary" @click="showDeleteModal = false">Cancel</button>
        <button class="btn-danger" @click="handleDelete">Delete</button>
      </template>
    </MissionModal>
  </div>
</template>
