<script setup lang="ts">
import { ref } from 'vue';
import { useFloorPlanStore } from '~/stores/floorplan';
import { Plus, X, Edit2 } from 'lucide-vue-next';
import MissionModal from '~/components/MissionModal.vue';

defineProps<{
  readonly?: boolean;
}>();

const store = useFloorPlanStore();

const showAddModal = ref(false);
const newFloorName = ref('');
const editingFloorId = ref<string | null>(null);
const editingName = ref('');

async function handleAddFloor() {
  if (!newFloorName.value.trim()) return;
  await store.addFloor(newFloorName.value.trim());
  newFloorName.value = '';
  showAddModal.value = false;
}

function startEdit(floor: { id: string; name: string }) {
  editingFloorId.value = floor.id;
  editingName.value = floor.name;
}

async function saveEdit() {
  if (!editingFloorId.value || !editingName.value.trim()) return;
  await store.updateFloor(editingFloorId.value, { name: editingName.value.trim() });
  editingFloorId.value = null;
  editingName.value = '';
}

function cancelEdit() {
  editingFloorId.value = null;
  editingName.value = '';
}

async function handleDeleteFloor(floorId: string) {
  if (confirm('Are you sure you want to delete this floor?')) {
    await store.deleteFloor(floorId);
  }
}
</script>

<template>
  <div class="floor-tabs flex items-center gap-2 px-4 py-2 bg-mission-dark border-t border-white/[0.06] overflow-x-auto">
    <span class="text-mission-muted text-xs mr-1">Floors</span>

    <!-- Floor Tabs -->
    <template v-for="floor in store.currentFloorPlan?.floors" :key="floor.id">
      <div
        v-if="editingFloorId === floor.id"
        class="flex items-center gap-1"
      >
        <input
          v-model="editingName"
          type="text"
          class="input-mission !px-2 !py-1 text-sm w-32"
          @keyup.enter="saveEdit"
          @keyup.escape="cancelEdit"
        />
        <button class="px-2 py-1 rounded-lg text-sm text-mission-accent hover:bg-white/[0.06]" @click="saveEdit">
          Save
        </button>
        <button class="px-2 py-1 rounded-lg text-sm text-mission-muted hover:text-gray-100 hover:bg-white/[0.06]" @click="cancelEdit">
          Cancel
        </button>
      </div>

      <button
        v-else
        class="floor-tab flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors"
        :class="{
          'border-gray-100 bg-gray-100 text-mission-ink': store.activeFloorId === floor.id,
          'border-white/10 bg-mission-dark text-mission-muted hover:text-gray-100': store.activeFloorId !== floor.id,
        }"
        @click="store.setActiveFloor(floor.id)"
      >
        <span>{{ floor.name }}</span>

        <template v-if="!readonly && store.activeFloorId === floor.id">
          <Edit2
            :size="14"
            class="opacity-50 hover:opacity-100 cursor-pointer"
            @click.stop="startEdit(floor)"
          />
          <X
            v-if="(store.currentFloorPlan?.floors.length || 0) > 1"
            :size="14"
            class="opacity-50 hover:opacity-100 cursor-pointer"
            @click.stop="handleDeleteFloor(floor.id)"
          />
        </template>
      </button>
    </template>

    <!-- Add Floor Button -->
    <button
      v-if="!readonly"
      class="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border border-dashed border-white/15 text-mission-muted hover:text-gray-100 hover:border-white/30 transition-colors"
      @click="showAddModal = true"
    >
      <Plus :size="14" />
      <span>Add floor</span>
    </button>

    <!-- Add Floor Modal -->
    <MissionModal
      :show="showAddModal"
      title="Add floor"
      max-width="sm"
      @close="showAddModal = false"
    >
      <input
        v-model="newFloorName"
        type="text"
        placeholder="Floor name"
        class="input-mission"
        @keyup.enter="handleAddFloor"
      />

      <template #actions>
        <button class="btn-secondary" @click="showAddModal = false">Cancel</button>
        <button class="btn-primary" @click="handleAddFloor">Add floor</button>
      </template>
    </MissionModal>
  </div>
</template>
