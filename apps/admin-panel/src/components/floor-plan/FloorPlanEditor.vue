<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useFloorPlanStore, type Position } from '~/stores/floorplan';
import { useUsersStore } from '~/stores/users';
import FloorPlanCanvas from './FloorPlanCanvas.vue';
import EditorToolbar from './toolbar/EditorToolbar.vue';
import FloorTabs from './panels/FloorTabs.vue';
import PropertiesPanel from './panels/PropertiesPanel.vue';
import TableObject from './objects/TableObject.vue';
import WallObject from './objects/WallObject.vue';
import StartingPoint from './objects/StartingPoint.vue';
import CommentObject from './objects/CommentObject.vue';
import MissionModal from '~/components/MissionModal.vue';
import MissionSelect from '~/components/MissionSelect.vue';

const props = defineProps<{
  code: string;
}>();

const store = useFloorPlanStore();
const usersStore = useUsersStore();

const gridSize = 30;
const showTableModal = ref(false);
const newTablePosition = ref<Position | null>(null);
const newTableLabel = ref('');
const newTableUser = ref<string | null>(null);
const showCommentModal = ref(false);
const newCommentPosition = ref<Position | null>(null);
const newCommentText = ref('');
const canvasRef = ref<any>(null);

// Group dragging state
const isDraggingGroup = ref(false);
const draggedObjectId = ref<string | null>(null);
const groupDragOffsets = ref<Map<string, { dx: number; dy: number }>>(new Map());

// Computed user options
const userOptions = computed(() =>
  usersStore.users.map((u) => ({
    value: u.username,
    label: `${u.username} (${u.fullName})`,
  })),
);

// Load data
onMounted(async () => {
  await Promise.all([
    store.fetchFloorPlan(props.code),
    usersStore.users.length === 0 ? fetchUsers() : Promise.resolve(),
  ]);
  window.addEventListener('keydown', handleKeyboard);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyboard);
  store.resetState();
});

async function fetchUsers() {
  // Fetch users if not already loaded
  try {
    const { internalClient } = await import('~/services/api');
    const response = await internalClient.get('/users');
    usersStore.setUsers(response.data);
  } catch (e) {
    console.error('Failed to fetch users:', e);
  }
}

// Handle canvas click based on mode
async function handleCanvasClick(position: Position) {
  // Check if in clipboard preview mode - paste at clicked position
  if (store.clipboardPreviewMode) {
    // Convert pixel position to grid position
    const gridPos = {
      x: position.x / gridSize,
      y: position.y / gridSize,
    };
    await store.pasteSelected(gridPos);
    return;
  }

  if (store.editorMode === 'table') {
    newTablePosition.value = position;
    newTableLabel.value = `T${(store.activeFloor?.tables.length || 0) + 1}`;
    showTableModal.value = true;
  } else if (store.editorMode === 'comment') {
    newCommentPosition.value = position;
    newCommentText.value = '';
    showCommentModal.value = true;
  } else if (store.editorMode === 'start') {
    // Move or create starting point at clicked position
    const newPos = {
      x: position.x / gridSize,
      y: position.y / gridSize,
    };
    await store.updateFloor(store.activeFloorId!, { startingPoint: newPos });
  } else if (store.editorMode === 'eraser') {
    // Clicking on empty space in eraser mode does nothing
  }
}

// Handle wall drawing
async function handleCanvasDrag(start: Position, end: Position) {
  if (store.editorMode === 'wall') {
    // Auto-detect orientation based on drag direction
    const deltaX = Math.abs(end.x - start.x);
    const deltaY = Math.abs(end.y - start.y);

    const orientation = deltaX >= deltaY ? 'horizontal' : 'vertical';
    const length =
      orientation === 'horizontal'
        ? deltaX / gridSize
        : deltaY / gridSize;

    if (length >= 1) {
      const normalizedStart = {
        x: Math.min(start.x, end.x) / gridSize,
        y: Math.min(start.y, end.y) / gridSize,
      };
      await store.addWall(normalizedStart, Math.round(length), orientation);
    }
  }
}

// Create table
async function handleCreateTable() {
  if (!newTablePosition.value || !newTableLabel.value.trim()) return;

  await store.addTable(
    newTableLabel.value.trim(),
    {
      x: newTablePosition.value.x / gridSize,
      y: newTablePosition.value.y / gridSize,
    },
    store.defaultTableSize,
    newTableUser.value || undefined,
  );

  showTableModal.value = false;
  newTablePosition.value = null;
  newTableLabel.value = '';
  newTableUser.value = null;
}

// Handle table selection/update
function handleTableSelect(tableId: string, addToSelection: boolean) {
  if (store.editorMode === 'eraser') {
    store.deleteTable(tableId);
  } else {
    store.selectObject(tableId, addToSelection);
  }
}

async function handleTableUpdate(tableId: string, updates: any) {
  // Check if this is part of a group drag
  if (isDraggingGroup.value && updates.position && draggedObjectId.value === tableId) {
    // This is the object being dragged - move all selected objects
    await handleGroupDrag(tableId, 'table', updates.position);
  } else if (!isDraggingGroup.value) {
    // Single object update
    await store.updateTable(tableId, updates);
  }
}

// Initialize group drag when an object starts dragging
function startGroupDrag(objectId: string) {
  if (!store.activeFloor || store.selectedObjectIds.length <= 1) return;

  isDraggingGroup.value = true;
  draggedObjectId.value = objectId;
  groupDragOffsets.value.clear();

  // Calculate offsets for all selected objects relative to the dragged one
  const draggedObj = getObjectById(objectId);
  if (!draggedObj) return;

  const draggedPos = 'position' in draggedObj ? draggedObj.position : draggedObj.start;

  for (const id of store.selectedObjectIds) {
    if (id === objectId || id === 'starting-point') continue;
    const obj = getObjectById(id);
    if (!obj) continue;

    const objPos = 'position' in obj ? obj.position : obj.start;
    groupDragOffsets.value.set(id, {
      dx: objPos.x - draggedPos.x,
      dy: objPos.y - draggedPos.y,
    });
  }

  // Handle starting point if selected
  if (store.selectedObjectIds.includes('starting-point') && store.activeFloor.startingPoint) {
    groupDragOffsets.value.set('starting-point', {
      dx: store.activeFloor.startingPoint.x - draggedPos.x,
      dy: store.activeFloor.startingPoint.y - draggedPos.y,
    });
  }
}

// Handle dragging all selected objects together
async function handleGroupDrag(draggedId: string, draggedType: string, newPosition: Position) {
  if (!store.activeFloor) return;

  const updates: Array<{ id: string; type: 'table' | 'comment' | 'wall' | 'start'; position?: Position; start?: Position }> = [];

  // Update the dragged object
  if (draggedType === 'table' || draggedType === 'comment') {
    updates.push({ id: draggedId, type: draggedType, position: newPosition });
  } else if (draggedType === 'wall') {
    updates.push({ id: draggedId, type: 'wall', start: newPosition });
  }

  // Update all other selected objects with their offsets
  for (const [id, offset] of groupDragOffsets.value.entries()) {
    const newPos = {
      x: newPosition.x + offset.dx,
      y: newPosition.y + offset.dy,
    };

    if (id === 'starting-point') {
      updates.push({ id, type: 'start', position: newPos });
    } else {
      const obj = getObjectById(id);
      if (!obj) continue;

      if ('label' in obj) {
        updates.push({ id, type: 'table', position: newPos });
      } else if ('text' in obj) {
        updates.push({ id, type: 'comment', position: newPos });
      } else if ('orientation' in obj) {
        updates.push({ id, type: 'wall', start: newPos });
      }
    }
  }

  await store.updateMultipleObjects(updates);
}

// End group drag
function endGroupDrag() {
  isDraggingGroup.value = false;
  draggedObjectId.value = null;
  groupDragOffsets.value.clear();
}

// Helper to get object by ID
function getObjectById(id: string) {
  if (!store.activeFloor) return null;
  return store.activeFloor.tables.find(t => t.id === id) ||
         store.activeFloor.comments.find(c => c.id === id) ||
         store.activeFloor.walls.find(w => w.id === id);
}

// Create comment
async function handleCreateComment() {
  if (!newCommentPosition.value || !newCommentText.value.trim()) return;

  await store.addComment(
    newCommentText.value.trim(),
    {
      x: newCommentPosition.value.x / gridSize,
      y: newCommentPosition.value.y / gridSize,
    },
    { width: 4, height: 2 },
  );

  showCommentModal.value = false;
  newCommentPosition.value = null;
  newCommentText.value = '';
}

// Handle comment selection/update
function handleCommentSelect(commentId: string, addToSelection: boolean) {
  if (store.editorMode === 'eraser') {
    store.deleteComment(commentId);
  } else {
    store.selectObject(commentId, addToSelection);
  }
}

async function handleCommentUpdate(commentId: string, updates: any) {
  // Check if this is part of a group drag
  if (isDraggingGroup.value && updates.position && draggedObjectId.value === commentId) {
    // This is the object being dragged - move all selected objects
    await handleGroupDrag(commentId, 'comment', updates.position);
  } else if (!isDraggingGroup.value) {
    // Single object update
    await store.updateComment(commentId, updates);
  }
}

// Handle wall selection
function handleWallSelect(wallId: string, addToSelection: boolean) {
  if (store.editorMode === 'eraser') {
    store.deleteWall(wallId);
  } else {
    store.selectObject(wallId, addToSelection);
  }
}

// Keyboard shortcuts
function handleKeyboard(e: KeyboardEvent) {
  // Ignore if typing in input
  if ((e.target as HTMLElement).tagName === 'INPUT') return;

  const isMod = e.metaKey || e.ctrlKey;

  if (isMod && e.key === 'z') {
    e.preventDefault();
    if (e.shiftKey) {
      store.redo();
    } else {
      store.undo();
    }
  } else if (isMod && e.key === 'c') {
    e.preventDefault();
    store.copySelected();
  } else if (isMod && e.key === 'v') {
    e.preventDefault();
    // Don't auto-paste, just enter preview mode (already done by copySelected)
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    deleteSelected();
  } else if (e.key === 'Escape') {
    // Cancel clipboard preview mode if active
    if (store.clipboardPreviewMode) {
      store.cancelClipboardPreview();
    } else {
      store.clearSelection();
      store.setEditorMode('select');
    }
  } else if (e.key === 'v' || e.key === 'V') {
    if (!isMod) {
      store.setEditorMode('select');
    }
  } else if (e.key === 'a' || e.key === 'A') {
    if (!isMod) {
      store.setEditorMode('area-select');
    }
  } else if (e.key === 't' || e.key === 'T') {
    store.setEditorMode('table');
  } else if (e.key === 'w' || e.key === 'W') {
    store.setEditorMode('wall');
  } else if (e.key === 'm' || e.key === 'M') {
    store.setEditorMode('comment');
  } else if (e.key === 's' || e.key === 'S') {
    store.setEditorMode('start');
  } else if (e.key === 'e' || e.key === 'E') {
    store.setEditorMode('eraser');
  } else if (e.key === 'g' || e.key === 'G') {
    store.toggleGrid();
  }
}

async function deleteSelected() {
  for (const id of [...store.selectedObjectIds]) {
    if (id === 'starting-point') {
      // Delete starting point
      await store.updateFloor(store.activeFloorId!, { startingPoint: undefined });
    } else {
      const isTable = store.activeFloor?.tables.some((t) => t.id === id);
      const isComment = store.activeFloor?.comments.some((c) => c.id === id);
      if (isTable) {
        await store.deleteTable(id);
      } else if (isComment) {
        await store.deleteComment(id);
      } else {
        await store.deleteWall(id);
      }
    }
  }
}

// Handle starting point selection/update
function handleStartingPointSelect(addToSelection: boolean) {
  if (store.editorMode === 'eraser') {
    // Delete starting point in eraser mode
    store.updateFloor(store.activeFloorId!, { startingPoint: undefined });
  } else {
    // Select starting point
    store.selectObject('starting-point', addToSelection);
  }
}

async function handleStartingPointUpdate(position: Position) {
  await store.updateFloor(store.activeFloorId!, { startingPoint: position });
}

// Tooltip handlers
function handleShowTooltip(text: string, e: any) {
  if (!canvasRef.value) return;
  const stage = e.target.getStage();
  const containerPos = stage.container().getBoundingClientRect();
  const pointerPos = stage.getPointerPosition();

  canvasRef.value.showTooltip(
    text,
    containerPos.left + pointerPos.x,
    containerPos.top + pointerPos.y
  );
}

function handleHideTooltip() {
  if (!canvasRef.value) return;
  canvasRef.value.hideTooltip();
}
</script>

<template>
  <div class="floor-plan-editor flex flex-col h-full">
    <!-- Toolbar -->
    <EditorToolbar />

    <!-- Main Content -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Canvas -->
      <div class="flex-1 relative">
        <FloorPlanCanvas
          ref="canvasRef"
          :grid-size="gridSize"
          @canvas-click="handleCanvasClick"
          @canvas-drag="handleCanvasDrag"
        >
          <!-- Walls -->
          <WallObject
            v-for="wall in store.activeFloor?.walls"
            :key="wall.id"
            :wall="wall"
            :grid-size="gridSize"
            @select="handleWallSelect"
            @mouseenter="(e) => handleShowTooltip(`Wall (${wall.orientation}, length: ${wall.length})`, e)"
            @mouseleave="handleHideTooltip"
          />

          <!-- Tables -->
          <TableObject
            v-for="table in store.activeFloor?.tables"
            :key="table.id"
            :table="table"
            :grid-size="gridSize"
            @select="handleTableSelect"
            @update="handleTableUpdate"
            @drag-start="startGroupDrag"
            @drag-end="endGroupDrag"
            @mouseenter="(e) => handleShowTooltip(table.boundUsername ? `${table.label} - ${table.boundUsername}` : table.label, e)"
            @mouseleave="handleHideTooltip"
          />

          <!-- Comments -->
          <CommentObject
            v-for="comment in store.activeFloor?.comments"
            :key="comment.id"
            :comment="comment"
            :grid-size="gridSize"
            @select="handleCommentSelect"
            @update="handleCommentUpdate"
            @drag-start="startGroupDrag"
            @drag-end="endGroupDrag"
            @mouseenter="(e) => handleShowTooltip(comment.text, e)"
            @mouseleave="handleHideTooltip"
          />

          <!-- Starting Point -->
          <StartingPoint
            v-if="store.activeFloor?.startingPoint"
            :position="store.activeFloor.startingPoint"
            :grid-size="gridSize"
            @select="handleStartingPointSelect"
            @update="handleStartingPointUpdate"
            @mouseenter="(e) => handleShowTooltip('Starting Point', e)"
            @mouseleave="handleHideTooltip"
          />
        </FloorPlanCanvas>
      </div>

      <!-- Properties Panel -->
      <PropertiesPanel />
    </div>

    <!-- Floor Tabs -->
    <FloorTabs />

    <!-- Create Table Modal -->
    <MissionModal
      :show="showTableModal"
      title="Create Table"
      @close="showTableModal = false"
    >
      <div class="space-y-4">
        <div>
          <label class="tech-label">Label</label>
          <input
            v-model="newTableLabel"
            type="text"
            class="input-mission w-full"
            placeholder="Table label"
          />
        </div>

        <div>
          <label class="tech-label">Bind to User (optional)</label>
          <MissionSelect
            v-model="newTableUser"
            :options="(userOptions as any)"
            option-label="label"
            option-value="value"
            placeholder="Select user..."
          />
        </div>
      </div>

      <template #actions>
        <button class="btn-secondary" @click="showTableModal = false">Cancel</button>
        <button class="btn-primary" @click="handleCreateTable">Create</button>
      </template>
    </MissionModal>

    <!-- Create Comment Modal -->
    <MissionModal
      :show="showCommentModal"
      title="Create Comment"
      @close="showCommentModal = false"
    >
      <div class="space-y-4">
        <div>
          <label class="tech-label">Comment Text</label>
          <textarea
            v-model="newCommentText"
            class="input-mission w-full"
            placeholder="Enter comment text..."
            rows="4"
          />
        </div>
      </div>

      <template #actions>
        <button class="btn-secondary" @click="showCommentModal = false">Cancel</button>
        <button class="btn-primary" @click="handleCreateComment">Create</button>
      </template>
    </MissionModal>
  </div>
</template>
