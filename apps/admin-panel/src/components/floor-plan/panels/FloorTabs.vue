<script setup lang="ts">
import { ref } from 'vue';
import { useFloorPlanStore } from '~/stores/floorplan';
import { Plus, X, Edit2 } from 'lucide-vue-next';

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
  <div class="floor-tabs flex items-center gap-2 px-4 py-2 bg-mission-dark border-t border-white/10 overflow-x-auto">
    <span class="text-white/40 text-sm mr-2">Floors:</span>

    <!-- Floor Tabs -->
    <template v-for="floor in store.currentFloorPlan?.floors" :key="floor.id">
      <div
        v-if="editingFloorId === floor.id"
        class="flex items-center gap-1"
      >
        <input
          v-model="editingName"
          type="text"
          class="input-mission px-2 py-1 text-sm w-32"
          @keyup.enter="saveEdit"
          @keyup.escape="cancelEdit"
        />
        <button class="text-mission-accent hover:text-white" @click="saveEdit">
          Save
        </button>
        <button class="text-white/40 hover:text-white" @click="cancelEdit">
          Cancel
        </button>
      </div>

      <button
        v-else
        class="floor-tab flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
        :class="{
          'bg-mission-accent/20 text-mission-accent': store.activeFloorId === floor.id,
          'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white': store.activeFloorId !== floor.id,
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
            class="opacity-50 hover:opacity-100 cursor-pointer text-mission-red"
            @click.stop="handleDeleteFloor(floor.id)"
          />
        </template>
      </button>
    </template>

    <!-- Add Floor Button -->
    <button
      v-if="!readonly"
      class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
      @click="showAddModal = true"
    >
      <Plus :size="16" />
      <span>Add</span>
    </button>

    <!-- Add Floor Modal -->
    <Teleport to="body">
      <div
        v-if="showAddModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="showAddModal = false"
      >
        <div class="bg-mission-dark rounded-xl p-6 w-96 border border-white/10">
          <h3 class="text-lg font-medium text-white mb-4">Add New Floor</h3>
          <input
            v-model="newFloorName"
            type="text"
            placeholder="Floor name"
            class="input-mission w-full mb-4"
            @keyup.enter="handleAddFloor"
          />
          <div class="flex justify-end gap-2">
            <button class="btn-secondary" @click="showAddModal = false">Cancel</button>
            <button class="btn-primary" @click="handleAddFloor">Add Floor</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
