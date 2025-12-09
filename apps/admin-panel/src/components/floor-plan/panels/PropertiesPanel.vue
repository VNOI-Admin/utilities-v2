<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useFloorPlanStore, type TableObject, type WallSegment } from '~/stores/floorplan';
import { useUsersStore } from '~/stores/users';
import { Trash2, Link, Unlink } from 'lucide-vue-next';
import MissionSelect from '~/components/MissionSelect.vue';

const store = useFloorPlanStore();
const usersStore = useUsersStore();

const selectedObject = computed(() => {
  if (store.selectedObjects.length !== 1) return null;
  return store.selectedObjects[0];
});

const isTable = computed(() => selectedObject.value && 'label' in selectedObject.value);
const isWall = computed(() => selectedObject.value && 'orientation' in selectedObject.value);

const selectedTable = computed(() => (isTable.value ? (selectedObject.value as TableObject) : null));
const selectedWall = computed(() => (isWall.value ? (selectedObject.value as WallSegment) : null));

// Editable fields
const editLabel = ref('');
const editWidth = ref(1);
const editHeight = ref(1);
const selectedUser = ref<string | null>(null);

// Sync with selection
watch(selectedTable, (table) => {
  if (table) {
    editLabel.value = table.label;
    editWidth.value = table.size.width;
    editHeight.value = table.size.height;
    selectedUser.value = table.boundUsername || null;
  }
});

// User options for binding
const userOptions = computed(() =>
  usersStore.users.map((u) => ({
    value: u.username,
    label: `${u.username} (${u.fullName})`,
  })),
);

async function updateLabel() {
  if (!selectedTable.value || !editLabel.value.trim()) return;
  await store.updateTable(selectedTable.value.id, { label: editLabel.value.trim() });
}

async function updateSize() {
  if (!selectedTable.value) return;
  await store.updateTable(selectedTable.value.id, {
    size: { width: editWidth.value, height: editHeight.value },
  });
}

async function bindToUser() {
  if (!selectedTable.value || !selectedUser.value) return;
  await store.bindTable(selectedTable.value.id, selectedUser.value);
}

async function unbindFromUser() {
  if (!selectedTable.value) return;
  await store.unbindTable(selectedTable.value.id);
  selectedUser.value = null;
}

async function deleteSelected() {
  if (!selectedObject.value) return;

  if (isTable.value) {
    await store.deleteTable(selectedObject.value.id);
  } else if (isWall.value) {
    await store.deleteWall(selectedObject.value.id);
  }
}
</script>

<template>
  <div class="properties-panel w-96 bg-mission-dark border-l border-white/10 p-4 overflow-y-auto">
    <h3 class="text-sm font-medium text-white/40 uppercase mb-4">Properties</h3>

    <template v-if="selectedObject">
      <!-- Table Properties -->
      <template v-if="selectedTable">
        <div class="space-y-4">
          <!-- Label -->
          <div>
            <label class="tech-label">Label</label>
            <input
              v-model="editLabel"
              type="text"
              class="input-mission w-full"
              @blur="updateLabel"
              @keyup.enter="updateLabel"
            />
          </div>

          <!-- Position (read-only) -->
          <div>
            <label class="tech-label">Position</label>
            <div class="grid grid-cols-2 gap-2">
              <div class="text-white/60 text-sm">
                X: {{ selectedTable.position.x }}
              </div>
              <div class="text-white/60 text-sm">
                Y: {{ selectedTable.position.y }}
              </div>
            </div>
          </div>

          <!-- Size -->
          <div>
            <label class="tech-label">Size (cells)</label>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <input
                  v-model.number="editWidth"
                  type="number"
                  min="1"
                  class="input-mission w-full"
                  @blur="updateSize"
                  @keyup.enter="updateSize"
                />
              </div>
              <div>
                <input
                  v-model.number="editHeight"
                  type="number"
                  min="1"
                  class="input-mission w-full"
                  @blur="updateSize"
                  @keyup.enter="updateSize"
                />
              </div>
            </div>
          </div>

          <!-- User Binding -->
          <div>
            <label class="tech-label">Bound User</label>
            <div v-if="selectedTable.boundUsername" class="flex items-center gap-2 mb-2">
              <span class="text-mission-accent text-sm">{{ selectedTable.boundUsername }}</span>
              <button
                class="p-1 text-white/40 hover:text-mission-red"
                title="Unbind user"
                @click="unbindFromUser"
              >
                <Unlink :size="14" />
              </button>
            </div>
            <div v-else class="flex items-center gap-2">
              <div class="flex-1 min-w-0">
                <MissionSelect
                  v-model="selectedUser"
                  :options="(userOptions as any)"
                  option-label="label"
                  option-value="value"
                  placeholder="Select user..."
                />
              </div>
              <button
                class="p-2 text-white/40 hover:text-mission-accent disabled:opacity-30 flex-shrink-0"
                :disabled="!selectedUser"
                title="Bind user"
                @click="bindToUser"
              >
                <Link :size="16" />
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Wall Properties -->
      <template v-else-if="selectedWall">
        <div class="space-y-4">
          <div>
            <label class="tech-label">Type</label>
            <div class="text-white capitalize">
              {{ selectedWall.orientation }} Wall
            </div>
          </div>

          <div>
            <label class="tech-label">Start Position</label>
            <div class="grid grid-cols-2 gap-2">
              <div class="text-white/60 text-sm">X: {{ selectedWall.start.x }}</div>
              <div class="text-white/60 text-sm">Y: {{ selectedWall.start.y }}</div>
            </div>
          </div>

          <div>
            <label class="tech-label">Length</label>
            <div class="text-white">{{ selectedWall.length }} cells</div>
          </div>
        </div>
      </template>

      <!-- Delete Button -->
      <button
        class="w-full mt-6 py-2 px-4 rounded-lg bg-mission-red/20 text-mission-red hover:bg-mission-red/30 flex items-center justify-center gap-2 transition-colors"
        @click="deleteSelected"
      >
        <Trash2 :size="16" />
        <span>Delete</span>
      </button>
    </template>

    <!-- No Selection -->
    <template v-else>
      <div class="text-white/40 text-sm">
        {{ store.selectedObjectIds.length > 1 ? `${store.selectedObjectIds.length} objects selected` : 'No object selected' }}
      </div>
    </template>
  </div>
</template>
