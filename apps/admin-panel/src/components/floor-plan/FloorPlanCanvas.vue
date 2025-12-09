<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useFloorPlanStore, type Position } from '~/stores/floorplan';
import CanvasTooltip, { type TooltipData } from './CanvasTooltip.vue';

const props = withDefaults(
  defineProps<{
    readonly?: boolean;
    gridSize?: number;
  }>(),
  {
    readonly: false,
    gridSize: 30,
  },
);

const emit = defineEmits<{
  canvasClick: [position: Position];
  canvasDrag: [start: Position, end: Position];
}>();

const store = useFloorPlanStore();
const tooltip = ref<TooltipData | null>(null);

function showTooltip(text: string, x: number, y: number) {
  tooltip.value = { text, x, y };
}

function hideTooltip() {
  tooltip.value = null;
}

const stageRef = ref<any>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const stageConfig = ref({
  width: 800,
  height: 600,
});

const isDrawing = ref(false);
const drawStart = ref<Position | null>(null);
const drawEnd = ref<Position | null>(null);
const ghostPosition = ref<Position | null>(null);
const isSelecting = ref(false);
const selectionStart = ref<Position | null>(null);
const selectionEnd = ref<Position | null>(null);

// Computed grid dimensions
const gridWidth = computed(() => store.activeFloor?.gridWidth || 20);
const gridHeight = computed(() => store.activeFloor?.gridHeight || 20);

// Generate grid lines
const gridLines = computed(() => {
  const lines: { points: number[]; stroke: string }[] = [];
  const width = gridWidth.value * props.gridSize;
  const height = gridHeight.value * props.gridSize;

  // Vertical lines
  for (let x = 0; x <= gridWidth.value; x++) {
    lines.push({
      points: [x * props.gridSize, 0, x * props.gridSize, height],
      stroke: 'rgba(255, 255, 255, 0.1)',
    });
  }

  // Horizontal lines
  for (let y = 0; y <= gridHeight.value; y++) {
    lines.push({
      points: [0, y * props.gridSize, width, y * props.gridSize],
      stroke: 'rgba(255, 255, 255, 0.1)',
    });
  }

  return lines;
});

// Resize handler
function handleResize() {
  if (containerRef.value) {
    stageConfig.value.width = containerRef.value.offsetWidth;
    stageConfig.value.height = containerRef.value.offsetHeight;
  }
}

// Convert screen coordinates to canvas coordinates accounting for zoom and pan
function getCanvasPosition(stage: any): Position {
  const pointerPos = stage.getPointerPosition();

  // Use Konva's built-in transformation to convert pointer position
  // from screen space to stage space (accounting for scale and position)
  const transform = stage.getAbsoluteTransform().copy();
  transform.invert();
  const canvasPos = transform.point(pointerPos);

  return { x: canvasPos.x, y: canvasPos.y };
}

// Mouse event handlers
function handleStageMouseDown(e: any) {
  if (props.readonly) return;

  const stage = e.target.getStage();
  const pos = getCanvasPosition(stage);
  const snapped = store.snapPosition(pos, props.gridSize);

  // Check if in clipboard preview mode - paste on click
  if (store.clipboardPreviewMode && e.target === stage) {
    emit('canvasClick', snapped);
    return;
  }

  if (store.editorMode === 'wall') {
    // Check if clicked on empty space
    if (e.target === stage) {
      isDrawing.value = true;
      drawStart.value = snapped;
      drawEnd.value = snapped;
    }
  } else if (store.editorMode === 'table') {
    // Check if clicked on empty space
    if (e.target === stage) {
      emit('canvasClick', snapped);
    }
  } else if (store.editorMode === 'comment') {
    // Check if clicked on empty space
    if (e.target === stage) {
      emit('canvasClick', snapped);
    }
  } else if (store.editorMode === 'start') {
    // Check if clicked on empty space
    if (e.target === stage) {
      emit('canvasClick', snapped);
    }
  } else if (store.editorMode === 'select') {
    // In select mode, clicking empty space just clears selection
    if (e.target === stage) {
      store.clearSelection();
    }
  } else if (store.editorMode === 'area-select') {
    // In area-select mode, start area selection
    if (e.target === stage) {
      isSelecting.value = true;
      selectionStart.value = pos;
      selectionEnd.value = pos;
      store.clearSelection();
    }
  }
}

function handleStageMouseMove(e: any) {
  if (props.readonly) return;

  const stage = e.target.getStage();
  const pos = getCanvasPosition(stage);
  const snapped = store.snapPosition(pos, props.gridSize);

  // Update selection rectangle if in area selection mode
  if (isSelecting.value && selectionStart.value) {
    selectionEnd.value = pos;
  }

  // Update ghost position for clipboard preview mode
  if (store.clipboardPreviewMode && store.clipboard.length > 0) {
    ghostPosition.value = snapped;
  } else if (store.editorMode === 'table' || store.editorMode === 'start' || store.editorMode === 'comment') {
    ghostPosition.value = snapped;
  } else if (store.editorMode === 'wall') {
    if (isDrawing.value && drawStart.value) {
      // Auto-detect orientation based on drag direction
      const deltaX = Math.abs(snapped.x - drawStart.value.x);
      const deltaY = Math.abs(snapped.y - drawStart.value.y);

      // Determine orientation based on which axis has more movement
      if (deltaX >= deltaY) {
        // Horizontal wall
        drawEnd.value = { x: snapped.x, y: drawStart.value.y };
      } else {
        // Vertical wall
        drawEnd.value = { x: drawStart.value.x, y: snapped.y };
      }
    } else {
      // Show ghost position for wall start
      ghostPosition.value = snapped;
    }
  } else {
    ghostPosition.value = null;
  }
}

function handleStageMouseUp() {
  // Handle wall drawing
  if (isDrawing.value && drawStart.value && drawEnd.value) {
    emit('canvasDrag', drawStart.value, drawEnd.value);
    isDrawing.value = false;
    drawStart.value = null;
    drawEnd.value = null;
  }

  // Handle area selection
  if (isSelecting.value && selectionStart.value && selectionEnd.value) {
    selectObjectsInArea(selectionStart.value, selectionEnd.value);
    isSelecting.value = false;
    selectionStart.value = null;
    selectionEnd.value = null;
  }
}

function selectObjectsInArea(start: Position, end: Position) {
  if (!store.activeFloor) return;

  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);

  const selectedIds: string[] = [];

  // Check tables
  for (const table of store.activeFloor.tables) {
    const tableX = table.position.x * props.gridSize;
    const tableY = table.position.y * props.gridSize;
    const tableRight = tableX + table.size.width * props.gridSize;
    const tableBottom = tableY + table.size.height * props.gridSize;

    // Check if table intersects with selection rectangle
    if (!(tableRight < minX || tableX > maxX || tableBottom < minY || tableY > maxY)) {
      selectedIds.push(table.id);
    }
  }

  // Check comments
  for (const comment of store.activeFloor.comments) {
    const commentX = comment.position.x * props.gridSize;
    const commentY = comment.position.y * props.gridSize;
    const commentRight = commentX + comment.size.width * props.gridSize;
    const commentBottom = commentY + comment.size.height * props.gridSize;

    // Check if comment intersects with selection rectangle
    if (!(commentRight < minX || commentX > maxX || commentBottom < minY || commentY > maxY)) {
      selectedIds.push(comment.id);
    }
  }

  // Check walls
  for (const wall of store.activeFloor.walls) {
    const wallX = wall.start.x * props.gridSize;
    const wallY = wall.start.y * props.gridSize;
    const wallEndX = wall.orientation === 'horizontal' ? wallX + wall.length * props.gridSize : wallX;
    const wallEndY = wall.orientation === 'vertical' ? wallY + wall.length * props.gridSize : wallY;

    const wallMinX = Math.min(wallX, wallEndX);
    const wallMaxX = Math.max(wallX, wallEndX);
    const wallMinY = Math.min(wallY, wallEndY);
    const wallMaxY = Math.max(wallY, wallEndY);

    // Check if wall intersects with selection rectangle
    if (!(wallMaxX < minX || wallMinX > maxX || wallMaxY < minY || wallMinY > maxY)) {
      selectedIds.push(wall.id);
    }
  }

  // Check starting point
  if (store.activeFloor.startingPoint) {
    const startX = store.activeFloor.startingPoint.x * props.gridSize;
    const startY = store.activeFloor.startingPoint.y * props.gridSize;
    const startRight = startX + props.gridSize;
    const startBottom = startY + props.gridSize;

    if (!(startRight < minX || startX > maxX || startBottom < minY || startY > maxY)) {
      selectedIds.push('starting-point');
    }
  }

  // Update selection
  if (selectedIds.length > 0) {
    store.selectedObjectIds = selectedIds;
  }
}

function handleStageMouseLeave() {
  ghostPosition.value = null;
  // Cancel selection if mouse leaves
  if (isSelecting.value) {
    isSelecting.value = false;
    selectionStart.value = null;
    selectionEnd.value = null;
  }
}

// Zoom handling
function handleWheel(e: any) {
  e.evt.preventDefault();
  const scaleBy = 1.1;
  const stage = stageRef.value?.getStage();
  if (!stage) return;

  const oldScale = store.zoom;
  const mousePointTo = {
    x: stage.getPointerPosition().x / oldScale - stage.x() / oldScale,
    y: stage.getPointerPosition().y / oldScale - stage.y() / oldScale,
  };

  const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
  store.setZoom(newScale);

  const newPos = {
    x: -(mousePointTo.x - stage.getPointerPosition().x / newScale) * newScale,
    y: -(mousePointTo.y - stage.getPointerPosition().y / newScale) * newScale,
  };
  store.setPan(newPos);
}

// Preview line for wall drawing
const previewLine = computed(() => {
  if (!isDrawing.value || !drawStart.value || !drawEnd.value) return null;
  return {
    points: [drawStart.value.x, drawStart.value.y, drawEnd.value.x, drawEnd.value.y],
    stroke: '#ffb830',
    strokeWidth: 4,
    dash: [10, 5],
  };
});

// Selection rectangle for area selection
const selectionRect = computed(() => {
  if (!isSelecting.value || !selectionStart.value || !selectionEnd.value) return null;
  const minX = Math.min(selectionStart.value.x, selectionEnd.value.x);
  const minY = Math.min(selectionStart.value.y, selectionEnd.value.y);
  const width = Math.abs(selectionEnd.value.x - selectionStart.value.x);
  const height = Math.abs(selectionEnd.value.y - selectionStart.value.y);
  return { x: minX, y: minY, width, height };
});

// Clipboard preview ghosts
interface TableGhost {
  type: 'table';
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

interface CommentGhost {
  type: 'comment';
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}

interface WallGhost {
  type: 'wall';
  key: string;
  points: number[];
}

type Ghost = TableGhost | CommentGhost | WallGhost;

const clipboardGhosts = computed<Ghost[]>(() => {
  if (!store.clipboardPreviewMode || !ghostPosition.value || store.clipboard.length === 0) {
    return [];
  }

  // Find the top-left corner of all clipboard items
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;

  for (const item of store.clipboard) {
    if ('label' in item || 'text' in item) {
      // Table or Comment
      const pos = item.position;
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
    } else if ('start' in item) {
      // Wall
      const pos = item.start;
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
    }
  }

  // Calculate offset from original position to ghost position
  const offsetX = (ghostPosition.value.x / props.gridSize) - minX;
  const offsetY = (ghostPosition.value.y / props.gridSize) - minY;

  // Create ghost objects with offset positions
  return store.clipboard.map((item, index): Ghost => {
    if ('label' in item) {
      // Table
      return {
        type: 'table' as const,
        key: `ghost-table-${index}`,
        x: (item.position.x + offsetX) * props.gridSize,
        y: (item.position.y + offsetY) * props.gridSize,
        width: item.size.width * props.gridSize,
        height: item.size.height * props.gridSize,
        label: item.label,
      };
    } else if ('text' in item) {
      // Comment
      return {
        type: 'comment' as const,
        key: `ghost-comment-${index}`,
        x: (item.position.x + offsetX) * props.gridSize,
        y: (item.position.y + offsetY) * props.gridSize,
        width: item.size.width * props.gridSize,
        height: item.size.height * props.gridSize,
        text: item.text,
      };
    } else {
      // Wall
      const startX = (item.start.x + offsetX) * props.gridSize;
      const startY = (item.start.y + offsetY) * props.gridSize;
      const endX = item.orientation === 'horizontal'
        ? startX + item.length * props.gridSize
        : startX;
      const endY = item.orientation === 'vertical'
        ? startY + item.length * props.gridSize
        : startY;

      return {
        type: 'wall' as const,
        key: `ghost-wall-${index}`,
        points: [startX, startY, endX, endY],
      };
    }
  });
});

onMounted(() => {
  handleResize();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

// Expose stage ref and tooltip functions for parent components
defineExpose({ stageRef, showTooltip, hideTooltip });
</script>

<template>
  <div ref="containerRef" class="floor-plan-canvas w-full h-full bg-mission-black relative overflow-hidden">
    <v-stage
      ref="stageRef"
      :config="{
        ...stageConfig,
        scaleX: store.zoom,
        scaleY: store.zoom,
        x: store.pan.x,
        y: store.pan.y,
        draggable: store.editorMode === 'select',
      }"
      @mousedown="handleStageMouseDown"
      @mousemove="handleStageMouseMove"
      @mouseup="handleStageMouseUp"
      @mouseleave="handleStageMouseLeave"
      @wheel="handleWheel"
    >
      <!-- Grid Layer -->
      <v-layer v-if="store.gridVisible">
        <!-- Canvas Boundary -->
        <v-rect
          :config="{
            x: 0,
            y: 0,
            width: gridWidth * gridSize,
            height: gridHeight * gridSize,
            stroke: 'rgba(255, 184, 48, 0.5)',
            strokeWidth: 2,
            dash: [10, 5],
            listening: false,
          }"
        />

        <v-line
          v-for="(line, index) in gridLines"
          :key="`grid-${index}`"
          :config="{
            points: line.points,
            stroke: line.stroke,
            strokeWidth: 1,
            listening: false,
          }"
        />
      </v-layer>

      <!-- Objects Layer (walls, tables, starting point) -->
      <v-layer>
        <slot />
      </v-layer>

      <!-- Preview Layer -->
      <v-layer>
        <!-- Wall drawing preview line -->
        <v-line v-if="previewLine" :config="previewLine" />

        <!-- Ghost preview for table placement -->
        <v-rect
          v-if="ghostPosition && store.editorMode === 'table'"
          :config="{
            x: ghostPosition.x,
            y: ghostPosition.y,
            width: gridSize,
            height: gridSize,
            fill: 'rgba(255, 255, 255, 0.1)',
            stroke: 'rgba(255, 255, 255, 0.5)',
            strokeWidth: 2,
            dash: [5, 5],
            cornerRadius: 4,
            listening: false,
          }"
        />

        <!-- Ghost preview for starting point placement -->
        <v-rect
          v-if="ghostPosition && store.editorMode === 'start'"
          :config="{
            x: ghostPosition.x,
            y: ghostPosition.y,
            width: gridSize,
            height: gridSize,
            fill: 'rgba(0, 212, 255, 0.2)',
            stroke: '#00d4ff',
            strokeWidth: 2,
            dash: [5, 5],
            cornerRadius: 4,
            listening: false,
          }"
        />

        <!-- Ghost preview for comment placement -->
        <v-rect
          v-if="ghostPosition && store.editorMode === 'comment'"
          :config="{
            x: ghostPosition.x,
            y: ghostPosition.y,
            width: gridSize * 4,
            height: gridSize * 2,
            fill: 'rgba(255, 184, 48, 0.1)',
            stroke: '#ffb830',
            strokeWidth: 2,
            dash: [5, 5],
            cornerRadius: 4,
            listening: false,
          }"
        />

        <!-- Ghost preview for wall start point -->
        <v-circle
          v-if="ghostPosition && store.editorMode === 'wall' && !isDrawing"
          :config="{
            x: ghostPosition.x,
            y: ghostPosition.y,
            radius: 5,
            fill: '#ffb830',
            stroke: '#ffb830',
            strokeWidth: 2,
            opacity: 0.7,
            listening: false,
          }"
        />

        <!-- Area selection rectangle -->
        <v-rect
          v-if="selectionRect"
          :config="{
            x: selectionRect.x,
            y: selectionRect.y,
            width: selectionRect.width,
            height: selectionRect.height,
            fill: 'rgba(0, 212, 255, 0.1)',
            stroke: '#00d4ff',
            strokeWidth: 2,
            dash: [5, 5],
            listening: false,
          }"
        />

        <!-- Clipboard preview ghosts -->
        <template v-if="store.clipboardPreviewMode && clipboardGhosts.length > 0">
          <template v-for="ghost in clipboardGhosts" :key="ghost.key">
            <!-- Table ghost -->
            <v-rect
              v-if="ghost.type === 'table'"
              :config="{
                x: ghost.x,
                y: ghost.y,
                width: ghost.width,
                height: ghost.height,
                fill: 'rgba(255, 255, 255, 0.1)',
                stroke: '#00d4ff',
                strokeWidth: 2,
                dash: [5, 5],
                cornerRadius: 4,
                listening: false,
              }"
            />
            <v-text
              v-if="ghost.type === 'table'"
              :config="{
                text: ghost.label,
                x: ghost.x + ghost.width / 2,
                y: ghost.y + ghost.height / 2,
                fontSize: 14,
                fontFamily: 'JetBrains Mono, monospace',
                fill: '#00d4ff',
                align: 'center',
                verticalAlign: 'middle',
                offsetX: ghost.label.length * 4,
                listening: false,
              }"
            />

            <!-- Comment ghost -->
            <v-rect
              v-if="ghost.type === 'comment'"
              :config="{
                x: ghost.x,
                y: ghost.y,
                width: ghost.width,
                height: ghost.height,
                fill: 'rgba(255, 184, 48, 0.1)',
                stroke: '#00d4ff',
                strokeWidth: 2,
                dash: [5, 5],
                cornerRadius: 4,
                listening: false,
              }"
            />
            <v-text
              v-if="ghost.type === 'comment'"
              :config="{
                text: ghost.text,
                x: ghost.x + 8,
                y: ghost.y + 8,
                width: ghost.width - 16,
                height: ghost.height - 16,
                fontSize: 12,
                fontFamily: 'JetBrains Mono, monospace',
                fill: '#00d4ff',
                align: 'left',
                verticalAlign: 'top',
                wrap: 'word',
                ellipsis: true,
                listening: false,
              }"
            />

            <!-- Wall ghost -->
            <v-line
              v-if="ghost.type === 'wall'"
              :config="{
                points: ghost.points,
                stroke: '#00d4ff',
                strokeWidth: 4,
                dash: [5, 5],
                listening: false,
              }"
            />
          </template>
        </template>
      </v-layer>
    </v-stage>

    <!-- Zoom indicator -->
    <div class="absolute bottom-4 right-4 text-white/50 text-sm font-mono">
      {{ Math.round(store.zoom * 100) }}%
    </div>

    <!-- Tooltip -->
    <CanvasTooltip :tooltip="tooltip" />
  </div>
</template>
