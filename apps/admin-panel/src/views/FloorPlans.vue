<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useFloorPlanStore } from '~/stores/floorplan';
import PageHeader from '~/components/PageHeader.vue';
import SearchInput from '~/components/SearchInput.vue';
import MissionModal from '~/components/MissionModal.vue';
import { Plus, Edit, Eye, Trash2, Map } from 'lucide-vue-next';

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
  <div class="floor-plans-page p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <PageHeader title="Floor Plans" subtitle="Manage floor plan layouts for user positioning" />

      <button class="btn-primary flex items-center gap-2" @click="showCreateModal = true">
        <Plus :size="18" />
        <span>New Plan</span>
      </button>
    </div>

    <!-- Search -->
    <div class="mb-6">
      <SearchInput v-model="searchQuery" placeholder="Search floor plans..." />
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="text-center py-12 text-white/60">
      Loading...
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="text-center py-12 text-mission-red">
      {{ store.error }}
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredPlans.length === 0" class="text-center py-12">
      <Map :size="48" class="mx-auto text-white/20 mb-4" />
      <p class="text-white/60">
        {{ searchQuery ? 'No floor plans match your search' : 'No floor plans yet' }}
      </p>
      <button
        v-if="!searchQuery"
        class="btn-primary mt-4"
        @click="showCreateModal = true"
      >
        Create your first floor plan
      </button>
    </div>

    <!-- Floor Plans Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="plan in filteredPlans"
        :key="plan.code"
        class="mission-card p-4 hover:border-mission-accent/50 transition-colors cursor-pointer group"
        @click="viewPlan(plan.code)"
      >
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="text-lg font-medium text-white group-hover:text-mission-accent transition-colors">
              {{ plan.name }}
            </h3>
            <p class="text-sm text-white/40 font-mono">{{ plan.code }}</p>
          </div>

          <div
            class="w-3 h-3 rounded-full"
            :class="plan.isActive ? 'bg-mission-accent' : 'bg-white/20'"
            :title="plan.isActive ? 'Active' : 'Inactive'"
          />
        </div>

        <p v-if="plan.description" class="text-sm text-white/60 mb-4 line-clamp-2">
          {{ plan.description }}
        </p>

        <div class="flex items-center justify-between text-sm text-white/40">
          <span>{{ plan.floors.length }} floor(s)</span>

          <div class="flex items-center gap-2" @click.stop>
            <button
              class="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
              title="View"
              @click="viewPlan(plan.code)"
            >
              <Eye :size="16" />
            </button>
            <button
              class="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
              title="Edit"
              @click="editPlan(plan.code)"
            >
              <Edit :size="16" />
            </button>
            <button
              class="p-1.5 rounded hover:bg-mission-red/20 hover:text-mission-red transition-colors"
              title="Delete"
              @click="confirmDelete(plan.code)"
            >
              <Trash2 :size="16" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <MissionModal
      :show="showCreateModal"
      title="Create Floor Plan"
      @close="showCreateModal = false"
    >
      <div class="space-y-4">
        <div>
          <label class="tech-label">Code</label>
          <input
            v-model="newPlan.code"
            type="text"
            class="input-mission w-full"
            placeholder="floor-plan-1"
          />
          <p class="text-xs text-white/40 mt-1">Unique identifier (lowercase, no spaces)</p>
        </div>

        <div>
          <label class="tech-label">Name</label>
          <input
            v-model="newPlan.name"
            type="text"
            class="input-mission w-full"
            placeholder="Main Building Floor Plan"
          />
        </div>

        <div>
          <label class="tech-label">Description (optional)</label>
          <textarea
            v-model="newPlan.description"
            class="input-mission w-full"
            rows="3"
            placeholder="Description of this floor plan..."
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
      title="Delete Floor Plan"
      @close="showDeleteModal = false"
    >
      <p class="text-white/60">
        Are you sure you want to delete the floor plan
        <span class="text-white font-medium">{{ selectedPlan }}</span>?
        This action cannot be undone.
      </p>

      <template #actions>
        <button class="btn-secondary" @click="showDeleteModal = false">Cancel</button>
        <button class="btn-danger" @click="handleDelete">Delete</button>
      </template>
    </MissionModal>
  </div>
</template>
