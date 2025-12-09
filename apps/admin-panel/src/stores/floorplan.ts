import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { internalClient } from '~/services/api';
import { findPath } from '~/components/floor-plan/utils/pathfinding';

// Types
export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface TableObject {
  id: string;
  label: string;
  position: Position;
  size: Size;
  boundUsername?: string;
}

export interface WallSegment {
  id: string;
  start: Position;
  length: number;
  orientation: 'horizontal' | 'vertical';
}

export interface CommentBlock {
  id: string;
  text: string;
  position: Position;
  size: Size;
}

export interface Floor {
  id: string;
  name: string;
  gridWidth: number;
  gridHeight: number;
  startingPoint?: Position;
  tables: TableObject[];
  walls: WallSegment[];
  comments: CommentBlock[];
}

export interface FloorPlan {
  code: string;
  name: string;
  description?: string;
  floors: Floor[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type EditorMode = 'select' | 'area-select' | 'table' | 'wall' | 'start' | 'comment' | 'eraser';

export const useFloorPlanStore = defineStore('floorplan', () => {
  // State
  const floorPlans = ref<FloorPlan[]>([]);
  const currentFloorPlan = ref<FloorPlan | null>(null);
  const activeFloorId = ref<string | null>(null);
  const selectedObjectIds = ref<string[]>([]);
  const clipboard = ref<(TableObject | WallSegment | CommentBlock)[]>([]);
  const editorMode = ref<EditorMode>('select');
  const zoom = ref(1);
  const pan = ref<Position>({ x: 0, y: 0 });
  const gridVisible = ref(true);
  const snapToGrid = ref(true);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isDirty = ref(false);
  const defaultTableSize = ref<Size>({ width: 1, height: 1 });
  const clipboardPreviewMode = ref(false);

  // Pathfinding state
  const selectedUserForPath = ref<string | null>(null);
  const calculatedPath = ref<Position[]>([]);

  // History for undo/redo
  const history = ref<string[]>([]);
  const historyIndex = ref(-1);
  const maxHistorySize = 50;

  // Computed
  const activeFloor = computed(() => {
    if (!currentFloorPlan.value || !activeFloorId.value) return null;
    return currentFloorPlan.value.floors.find((f) => f.id === activeFloorId.value) || null;
  });

  const selectedObjects = computed(() => {
    if (!activeFloor.value) return [];
    const tables = activeFloor.value.tables.filter((t) => selectedObjectIds.value.includes(t.id));
    const walls = activeFloor.value.walls.filter((w) => selectedObjectIds.value.includes(w.id));
    return [...tables, ...walls];
  });

  const boundTables = computed(() => activeFloor.value?.tables.filter((t) => t.boundUsername) || []);

  const unboundTables = computed(
    () => activeFloor.value?.tables.filter((t) => !t.boundUsername) || [],
  );

  const canUndo = computed(() => historyIndex.value > 0);
  const canRedo = computed(() => historyIndex.value < history.value.length - 1);

  // Floor Plan CRUD
  async function fetchFloorPlans() {
    loading.value = true;
    error.value = null;
    try {
      const response = await internalClient.get('/floor-plan');
      floorPlans.value = response.data;
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'Failed to fetch floor plans';
    } finally {
      loading.value = false;
    }
  }

  async function fetchFloorPlan(code: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await internalClient.get(`/floor-plan/${code}`);
      currentFloorPlan.value = response.data;
      if (response.data.floors.length > 0 && !activeFloorId.value) {
        activeFloorId.value = response.data.floors[0].id;
      }
      saveToHistory();
      isDirty.value = false;
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'Failed to fetch floor plan';
    } finally {
      loading.value = false;
    }
  }

  async function createFloorPlan(data: { code: string; name: string; description?: string }) {
    loading.value = true;
    error.value = null;
    try {
      const response = await internalClient.post('/floor-plan', data);
      floorPlans.value.push(response.data);
      return response.data;
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'Failed to create floor plan';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function updateFloorPlan(code: string, data: Partial<FloorPlan>) {
    loading.value = true;
    error.value = null;
    try {
      const response = await internalClient.patch(`/floor-plan/${code}`, data);
      const index = floorPlans.value.findIndex((fp) => fp.code === code);
      if (index !== -1) {
        floorPlans.value[index] = response.data;
      }
      if (currentFloorPlan.value?.code === code) {
        currentFloorPlan.value = response.data;
      }
      return response.data;
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'Failed to update floor plan';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function deleteFloorPlan(code: string) {
    loading.value = true;
    error.value = null;
    try {
      await internalClient.delete(`/floor-plan/${code}`);
      floorPlans.value = floorPlans.value.filter((fp) => fp.code !== code);
      if (currentFloorPlan.value?.code === code) {
        currentFloorPlan.value = null;
        activeFloorId.value = null;
      }
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'Failed to delete floor plan';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  // Floor Management
  async function addFloor(name: string, gridWidth = 20, gridHeight = 20) {
    if (!currentFloorPlan.value) return null;
    try {
      const response = await internalClient.post(`/floor-plan/${currentFloorPlan.value.code}/floors`, {
        name,
        gridWidth,
        gridHeight,
      });
      currentFloorPlan.value.floors.push(response.data);
      activeFloorId.value = response.data.id;
      isDirty.value = true;
      saveToHistory();
      return response.data;
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'Failed to add floor';
      throw e;
    }
  }

  async function updateFloor(floorId: string, data: Partial<Floor>) {
    if (!currentFloorPlan.value) return null;
    try {
      const response = await internalClient.patch(
        `/floor-plan/${currentFloorPlan.value.code}/floors/${floorId}`,
        data,
      );
      const index = currentFloorPlan.value.floors.findIndex((f) => f.id === floorId);
      if (index !== -1) {
        currentFloorPlan.value.floors[index] = response.data;
      }
      isDirty.value = true;
      saveToHistory();
      return response.data;
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'Failed to update floor';
      throw e;
    }
  }

  async function deleteFloor(floorId: string) {
    if (!currentFloorPlan.value) return;
    try {
      await internalClient.delete(`/floor-plan/${currentFloorPlan.value.code}/floors/${floorId}`);
      currentFloorPlan.value.floors = currentFloorPlan.value.floors.filter((f) => f.id !== floorId);
      if (activeFloorId.value === floorId) {
        activeFloorId.value = currentFloorPlan.value.floors[0]?.id || null;
      }
      isDirty.value = true;
      saveToHistory();
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'Failed to delete floor';
      throw e;
    }
  }

  function setActiveFloor(floorId: string) {
    activeFloorId.value = floorId;
    clearSelection();
  }

  // Table Management
  async function addTable(label: string, position: Position, size?: Size, boundUsername?: string) {
    if (!currentFloorPlan.value || !activeFloorId.value) return null;
    try {
      const response = await internalClient.post(
        `/floor-plan/${currentFloorPlan.value.code}/floors/${activeFloorId.value}/tables`,
        { label, position, size, boundUsername },
      );
      const floor = currentFloorPlan.value.floors.find((f) => f.id === activeFloorId.value);
      if (floor) {
        floor.tables.push(response.data);
      }
      isDirty.value = true;
      saveToHistory();
      return response.data;
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'Failed to add table';
      throw e;
    }
  }

  async function updateTable(tableId: string, updates: Partial<TableObject>) {
    if (!currentFloorPlan.value || !activeFloorId.value) return null;
    try {
      const response = await internalClient.patch(
        `/floor-plan/${currentFloorPlan.value.code}/floors/${activeFloorId.value}/tables/${tableId}`,
        updates,
      );
      const floor = currentFloorPlan.value.floors.find((f) => f.id === activeFloorId.value);
      if (floor) {
        const index = floor.tables.findIndex((t) => t.id === tableId);
        if (index !== -1) {
          floor.tables[index] = response.data;
        }
      }
      isDirty.value = true;
      return response.data;
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'Failed to update table';
      throw e;
    }
  }

  async function deleteTable(tableId: string) {
    if (!currentFloorPlan.value || !activeFloorId.value) return;
    try {
      await internalClient.delete(
        `/floor-plan/${currentFloorPlan.value.code}/floors/${activeFloorId.value}/tables/${tableId}`,
      );
      const floor = currentFloorPlan.value.floors.find((f) => f.id === activeFloorId.value);
      if (floor) {
        floor.tables = floor.tables.filter((t) => t.id !== tableId);
      }
      selectedObjectIds.value = selectedObjectIds.value.filter((id) => id !== tableId);
      isDirty.value = true;
      saveToHistory();
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'Failed to delete table';
      throw e;
    }
  }

  async function copyTable(tableId: string, newPosition: Position, newLabel?: string, boundUsername?: string) {
    if (!currentFloorPlan.value || !activeFloorId.value) return null;
    try {
      const response = await internalClient.post(
        `/floor-plan/${currentFloorPlan.value.code}/floors/${activeFloorId.value}/tables/${tableId}/copy`,
        { newPosition, newLabel, boundUsername },
      );
      const floor = currentFloorPlan.value.floors.find((f) => f.id === activeFloorId.value);
      if (floor) {
        floor.tables.push(response.data);
      }
      isDirty.value = true;
      saveToHistory();
      return response.data;
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'Failed to copy table';
      throw e;
    }
  }

  async function bindTable(tableId: string, username: string) {
    if (!currentFloorPlan.value || !activeFloorId.value) return null;
    try {
      const response = await internalClient.post(
        `/floor-plan/${currentFloorPlan.value.code}/floors/${activeFloorId.value}/tables/${tableId}/bind`,
        { username },
      );
      const floor = currentFloorPlan.value.floors.find((f) => f.id === activeFloorId.value);
      if (floor) {
        const index = floor.tables.findIndex((t) => t.id === tableId);
        if (index !== -1) {
          floor.tables[index] = response.data;
        }
      }
      isDirty.value = true;
      saveToHistory();
      return response.data;
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'Failed to bind table';
      throw e;
    }
  }

  async function unbindTable(tableId: string) {
    if (!currentFloorPlan.value || !activeFloorId.value) return null;
    try {
      const response = await internalClient.delete(
        `/floor-plan/${currentFloorPlan.value.code}/floors/${activeFloorId.value}/tables/${tableId}/bind`,
      );
      const floor = currentFloorPlan.value.floors.find((f) => f.id === activeFloorId.value);
      if (floor) {
        const index = floor.tables.findIndex((t) => t.id === tableId);
        if (index !== -1) {
          floor.tables[index] = response.data;
        }
      }
      isDirty.value = true;
      saveToHistory();
      return response.data;
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'Failed to unbind table';
      throw e;
    }
  }

  // Wall Management
  async function addWall(start: Position, length: number, orientation: 'horizontal' | 'vertical') {
    if (!currentFloorPlan.value || !activeFloorId.value) return null;
    try {
      const response = await internalClient.post(
        `/floor-plan/${currentFloorPlan.value.code}/floors/${activeFloorId.value}/walls`,
        { start, length, orientation },
      );
      const floor = currentFloorPlan.value.floors.find((f) => f.id === activeFloorId.value);
      if (floor) {
        floor.walls.push(response.data);
      }
      isDirty.value = true;
      saveToHistory();
      return response.data;
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'Failed to add wall';
      throw e;
    }
  }

  async function updateWall(wallId: string, updates: Partial<WallSegment>) {
    if (!currentFloorPlan.value || !activeFloorId.value) return null;
    try {
      const response = await internalClient.patch(
        `/floor-plan/${currentFloorPlan.value.code}/floors/${activeFloorId.value}/walls/${wallId}`,
        updates,
      );
      const floor = currentFloorPlan.value.floors.find((f) => f.id === activeFloorId.value);
      if (floor) {
        const index = floor.walls.findIndex((w) => w.id === wallId);
        if (index !== -1) {
          floor.walls[index] = response.data;
        }
      }
      isDirty.value = true;
      return response.data;
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'Failed to update wall';
      throw e;
    }
  }

  async function deleteWall(wallId: string) {
    if (!currentFloorPlan.value || !activeFloorId.value) return;
    try {
      await internalClient.delete(
        `/floor-plan/${currentFloorPlan.value.code}/floors/${activeFloorId.value}/walls/${wallId}`,
      );
      const floor = currentFloorPlan.value.floors.find((f) => f.id === activeFloorId.value);
      if (floor) {
        floor.walls = floor.walls.filter((w) => w.id !== wallId);
      }
      selectedObjectIds.value = selectedObjectIds.value.filter((id) => id !== wallId);
      isDirty.value = true;
      saveToHistory();
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'Failed to delete wall';
      throw e;
    }
  }

  // Comment Management
  async function addComment(text: string, position: Position, size?: Size) {
    if (!currentFloorPlan.value || !activeFloorId.value) return null;
    try {
      const response = await internalClient.post(
        `/floor-plan/${currentFloorPlan.value.code}/floors/${activeFloorId.value}/comments`,
        { text, position, size },
      );
      const floor = currentFloorPlan.value.floors.find((f) => f.id === activeFloorId.value);
      if (floor) {
        floor.comments.push(response.data);
      }
      isDirty.value = true;
      saveToHistory();
      return response.data;
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'Failed to add comment';
      throw e;
    }
  }

  async function updateComment(commentId: string, updates: Partial<CommentBlock>) {
    if (!currentFloorPlan.value || !activeFloorId.value) return null;
    try {
      const response = await internalClient.patch(
        `/floor-plan/${currentFloorPlan.value.code}/floors/${activeFloorId.value}/comments/${commentId}`,
        updates,
      );
      const floor = currentFloorPlan.value.floors.find((f) => f.id === activeFloorId.value);
      if (floor) {
        const index = floor.comments.findIndex((c) => c.id === commentId);
        if (index !== -1) {
          floor.comments[index] = response.data;
        }
      }
      isDirty.value = true;
      return response.data;
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'Failed to update comment';
      throw e;
    }
  }

  async function deleteComment(commentId: string) {
    if (!currentFloorPlan.value || !activeFloorId.value) return;
    try {
      await internalClient.delete(
        `/floor-plan/${currentFloorPlan.value.code}/floors/${activeFloorId.value}/comments/${commentId}`,
      );
      const floor = currentFloorPlan.value.floors.find((f) => f.id === activeFloorId.value);
      if (floor) {
        floor.comments = floor.comments.filter((c) => c.id !== commentId);
      }
      selectedObjectIds.value = selectedObjectIds.value.filter((id) => id !== commentId);
      isDirty.value = true;
      saveToHistory();
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'Failed to delete comment';
      throw e;
    }
  }

  // Selection
  function selectObject(objectId: string, addToSelection = false) {
    if (addToSelection) {
      if (!selectedObjectIds.value.includes(objectId)) {
        selectedObjectIds.value.push(objectId);
      }
    } else {
      selectedObjectIds.value = [objectId];
    }
  }

  function deselectObject(objectId: string) {
    selectedObjectIds.value = selectedObjectIds.value.filter((id) => id !== objectId);
  }

  function clearSelection() {
    selectedObjectIds.value = [];
  }

  function selectAll() {
    if (!activeFloor.value) return;
    selectedObjectIds.value = [
      ...activeFloor.value.tables.map((t) => t.id),
      ...activeFloor.value.walls.map((w) => w.id),
    ];
  }

  // Clipboard
  function copySelected() {
    if (!activeFloor.value) return;
    const tables = activeFloor.value.tables.filter((t) => selectedObjectIds.value.includes(t.id));
    const walls = activeFloor.value.walls.filter((w) => selectedObjectIds.value.includes(w.id));
    const comments = activeFloor.value.comments.filter((c) => selectedObjectIds.value.includes(c.id));
    clipboard.value = [...tables, ...walls, ...comments];
    clipboardPreviewMode.value = true;
  }

  function cancelClipboardPreview() {
    clipboardPreviewMode.value = false;
  }

  async function pasteSelected(offsetPosition?: Position) {
    if (!activeFloor.value || clipboard.value.length === 0) return;

    clipboardPreviewMode.value = false; // Exit preview mode
    const newObjectIds: string[] = [];

    // Calculate offset
    let offset: Position;
    if (offsetPosition) {
      // Find the top-left corner of all clipboard items
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;

      for (const item of clipboard.value) {
        if ('label' in item || 'text' in item) {
          minX = Math.min(minX, item.position.x);
          minY = Math.min(minY, item.position.y);
        } else if ('start' in item) {
          minX = Math.min(minX, item.start.x);
          minY = Math.min(minY, item.start.y);
        }
      }

      // Calculate offset from original position to clicked position
      offset = {
        x: offsetPosition.x - minX,
        y: offsetPosition.y - minY,
      };
    } else {
      offset = { x: 2, y: 2 }; // Default offset 2 grid cells
    }

    for (const item of clipboard.value) {
      if ('label' in item) {
        // It's a table
        const newTable = await addTable(
          item.label + ' (copy)',
          { x: item.position.x + offset.x, y: item.position.y + offset.y },
          item.size,
          item.boundUsername,
        );
        if (newTable) newObjectIds.push(newTable.id);
      } else if ('text' in item) {
        // It's a comment
        const newComment = await addComment(
          item.text,
          { x: item.position.x + offset.x, y: item.position.y + offset.y },
          item.size,
        );
        if (newComment) newObjectIds.push(newComment.id);
      } else if ('orientation' in item) {
        // It's a wall
        const newWall = await addWall(
          { x: item.start.x + offset.x, y: item.start.y + offset.y },
          item.length,
          item.orientation,
        );
        if (newWall) newObjectIds.push(newWall.id);
      }
    }

    // Select the newly pasted objects
    selectedObjectIds.value = newObjectIds;
  }

  // Editor Mode
  function setEditorMode(mode: EditorMode) {
    editorMode.value = mode;
    if (mode !== 'select') {
      clearSelection();
    }
  }

  // View Controls
  function setZoom(value: number) {
    zoom.value = Math.max(0.25, Math.min(4, value));
  }

  function setPan(position: Position) {
    pan.value = position;
  }

  function toggleGrid() {
    gridVisible.value = !gridVisible.value;
  }

  function toggleSnapToGrid() {
    snapToGrid.value = !snapToGrid.value;
  }

  // History
  function saveToHistory() {
    if (!currentFloorPlan.value) return;

    // Remove future states if we're not at the end
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1);
    }

    // Save current state
    history.value.push(JSON.stringify(currentFloorPlan.value));
    historyIndex.value = history.value.length - 1;

    // Limit history size
    if (history.value.length > maxHistorySize) {
      history.value.shift();
      historyIndex.value--;
    }
  }

  function undo() {
    if (!canUndo.value) return;
    historyIndex.value--;
    currentFloorPlan.value = JSON.parse(history.value[historyIndex.value]);
    isDirty.value = true;
  }

  function redo() {
    if (!canRedo.value) return;
    historyIndex.value++;
    currentFloorPlan.value = JSON.parse(history.value[historyIndex.value]);
    isDirty.value = true;
  }

  // Batch update multiple objects (for group dragging)
  async function updateMultipleObjects(updates: Array<{ id: string; type: 'table' | 'comment' | 'wall' | 'start'; position?: Position; start?: Position }>) {
    if (!activeFloor.value) return;

    for (const update of updates) {
      if (update.type === 'table') {
        const table = activeFloor.value.tables.find(t => t.id === update.id);
        if (table && update.position) {
          await updateTable(update.id, { position: update.position });
        }
      } else if (update.type === 'comment') {
        const comment = activeFloor.value.comments.find(c => c.id === update.id);
        if (comment && update.position) {
          await updateComment(update.id, { position: update.position });
        }
      } else if (update.type === 'wall') {
        const wall = activeFloor.value.walls.find(w => w.id === update.id);
        if (wall && update.start) {
          await updateWall(update.id, { start: update.start });
        }
      } else if (update.type === 'start' && update.position) {
        await updateFloor(activeFloorId.value!, { startingPoint: update.position });
      }
    }
  }

  // Grid Snapping Helper with boundary enforcement
  function snapPosition(position: Position, gridSize = 30): Position {
    const floor = activeFloor.value;
    const maxWidth = (floor?.gridWidth || 20) * gridSize;
    const maxHeight = (floor?.gridHeight || 20) * gridSize;

    let x = position.x;
    let y = position.y;

    // Snap to grid if enabled
    if (snapToGrid.value) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }

    // Enforce boundaries
    x = Math.max(0, Math.min(x, maxWidth));
    y = Math.max(0, Math.min(y, maxHeight));

    return { x, y };
  }

  // Reset state
  function resetState() {
    currentFloorPlan.value = null;
    activeFloorId.value = null;
    selectedObjectIds.value = [];
    clipboard.value = [];
    editorMode.value = 'select';
    zoom.value = 1;
    pan.value = { x: 0, y: 0 };
    history.value = [];
    historyIndex.value = -1;
    isDirty.value = false;
    error.value = null;
    selectedUserForPath.value = null;
    calculatedPath.value = [];
  }

  function setDefaultTableSize(size: Size) {
    defaultTableSize.value = size;
  }

  // Pathfinding
  function setSelectedUserForPath(username: string | null) {
    selectedUserForPath.value = username;

    if (!username || !activeFloor.value) {
      calculatedPath.value = [];
      return;
    }

    // Find the table bound to this user
    const targetTable = activeFloor.value.tables.find(t => t.boundUsername === username);
    if (!targetTable) {
      calculatedPath.value = [];
      return;
    }

    // Find the starting point
    const startingPoint = activeFloor.value.startingPoint;
    if (!startingPoint) {
      calculatedPath.value = [];
      return;
    }

    // Find the nearest walkable cell next to the target table
    // Try cells around the table perimeter (2 cells away to account for buffer zone)
    const candidates: Position[] = [];
    const bufferDistance = 2; // 1 for table + 1 for buffer

    // Top edge
    for (let x = targetTable.position.x; x < targetTable.position.x + targetTable.size.width; x++) {
      candidates.push({ x, y: targetTable.position.y - bufferDistance });
    }

    // Bottom edge
    for (let x = targetTable.position.x; x < targetTable.position.x + targetTable.size.width; x++) {
      candidates.push({ x, y: targetTable.position.y + targetTable.size.height + bufferDistance - 1 });
    }

    // Left edge
    for (let y = targetTable.position.y; y < targetTable.position.y + targetTable.size.height; y++) {
      candidates.push({ x: targetTable.position.x - bufferDistance, y });
    }

    // Right edge
    for (let y = targetTable.position.y; y < targetTable.position.y + targetTable.size.height; y++) {
      candidates.push({ x: targetTable.position.x + targetTable.size.width + bufferDistance - 1, y });
    }

    // Filter out invalid candidates and find the closest one to starting point
    const validCandidates = candidates.filter(pos =>
      pos.x >= 0 &&
      pos.x < activeFloor.value!.gridWidth &&
      pos.y >= 0 &&
      pos.y < activeFloor.value!.gridHeight
    );

    // Try to find a path to each candidate and pick the shortest
    let shortestPath: Position[] = [];

    // Create a modified tables array excluding the target table
    const otherTables = activeFloor.value.tables.filter(t => t.id !== targetTable.id);

    for (const candidate of validCandidates) {
      const path = findPath(
        startingPoint,
        candidate,
        activeFloor.value.gridWidth,
        activeFloor.value.gridHeight,
        otherTables, // Exclude target table so we can reach adjacent cells
        activeFloor.value.walls,
      );

      if (path.length > 0 && (shortestPath.length === 0 || path.length < shortestPath.length)) {
        shortestPath = path;
      }
    }

    // Add a final segment connecting to the table center
    if (shortestPath.length > 0) {
      const tableCenterX = targetTable.position.x + targetTable.size.width / 2;
      const tableCenterY = targetTable.position.y + targetTable.size.height / 2;

      shortestPath.push({
        x: tableCenterX,
        y: tableCenterY,
      });
    }

    calculatedPath.value = shortestPath;
  }

  return {
    // State
    floorPlans,
    currentFloorPlan,
    activeFloorId,
    selectedObjectIds,
    clipboard,
    editorMode,
    zoom,
    pan,
    gridVisible,
    snapToGrid,
    loading,
    error,
    isDirty,
    defaultTableSize,
    clipboardPreviewMode,
    selectedUserForPath,
    calculatedPath,

    // Computed
    activeFloor,
    selectedObjects,
    boundTables,
    unboundTables,
    canUndo,
    canRedo,

    // Floor Plan CRUD
    fetchFloorPlans,
    fetchFloorPlan,
    createFloorPlan,
    updateFloorPlan,
    deleteFloorPlan,

    // Floor Management
    addFloor,
    updateFloor,
    deleteFloor,
    setActiveFloor,

    // Table Management
    addTable,
    updateTable,
    deleteTable,
    copyTable,
    bindTable,
    unbindTable,

    // Wall Management
    addWall,
    updateWall,
    deleteWall,

    // Comment Management
    addComment,
    updateComment,
    deleteComment,

    // Selection
    selectObject,
    deselectObject,
    clearSelection,
    selectAll,

    // Clipboard
    copySelected,
    pasteSelected,
    cancelClipboardPreview,

    // Editor Mode
    setEditorMode,

    // View Controls
    setZoom,
    setPan,
    toggleGrid,
    toggleSnapToGrid,
    setDefaultTableSize,

    // History
    saveToHistory,
    undo,
    redo,

    // Helpers
    snapPosition,
    updateMultipleObjects,
    resetState,

    // Pathfinding
    setSelectedUserForPath,
  };
});
