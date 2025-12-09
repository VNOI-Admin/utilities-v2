<script setup lang="ts">
import { useFloorPlanStore, type EditorMode } from '~/stores/floorplan';
import { MousePointer2, MousePointerSquareDashed, Square, Slash, Navigation, MessageSquare, Eraser, Grid3x3, Magnet, ZoomIn, ZoomOut, RotateCcw } from 'lucide-vue-next';
import CanvasSizeControl from './CanvasSizeControl.vue';
import DefaultTableSizeControl from './DefaultTableSizeControl.vue';

const store = useFloorPlanStore();

interface Tool {
  mode: EditorMode;
  icon: any;
  label: string;
  shortcut?: string;
}

const tools: Tool[] = [
  { mode: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { mode: 'area-select', icon: MousePointerSquareDashed, label: 'Area Select', shortcut: 'A' },
  { mode: 'table', icon: Square, label: 'Table', shortcut: 'T' },
  { mode: 'wall', icon: Slash, label: 'Wall', shortcut: 'W' },
  { mode: 'comment', icon: MessageSquare, label: 'Comment', shortcut: 'M' },
  { mode: 'start', icon: Navigation, label: 'Start', shortcut: 'S' },
  { mode: 'eraser', icon: Eraser, label: 'Eraser', shortcut: 'E' },
];

function selectTool(mode: EditorMode) {
  store.setEditorMode(mode);
}

function zoomIn() {
  store.setZoom(store.zoom * 1.2);
}

function zoomOut() {
  store.setZoom(store.zoom / 1.2);
}

function resetZoom() {
  store.setZoom(1);
  store.setPan({ x: 0, y: 0 });
}
</script>

<template>
  <div class="editor-toolbar flex items-center gap-2 px-4 py-2 bg-mission-dark border-b border-white/10">
    <!-- Tools -->
    <div class="flex items-center gap-1 border-r border-white/10 pr-4">
      <button
        v-for="tool in tools"
        :key="tool.mode"
        class="toolbar-btn"
        :class="{ active: store.editorMode === tool.mode }"
        :title="`${tool.label} (${tool.shortcut})`"
        @click="selectTool(tool.mode)"
      >
        <component :is="tool.icon" :size="18" />
      </button>
    </div>

    <!-- View Options -->
    <div class="flex items-center gap-1 border-r border-white/10 pr-4">
      <button
        class="toolbar-btn"
        :class="{ active: store.gridVisible }"
        title="Toggle Grid (G)"
        @click="store.toggleGrid()"
      >
        <Grid3x3 :size="18" />
      </button>
      <button
        class="toolbar-btn"
        :class="{ active: store.snapToGrid }"
        title="Snap to Grid"
        @click="store.toggleSnapToGrid()"
      >
        <Magnet :size="18" />
      </button>
    </div>

    <!-- Zoom Controls -->
    <div class="flex items-center gap-1 border-r border-white/10 pr-4">
      <button class="toolbar-btn" title="Zoom Out (-)" @click="zoomOut">
        <ZoomOut :size="18" />
      </button>
      <span class="text-white/60 text-sm font-mono w-12 text-center">
        {{ Math.round(store.zoom * 100) }}%
      </span>
      <button class="toolbar-btn" title="Zoom In (+)" @click="zoomIn">
        <ZoomIn :size="18" />
      </button>
      <button class="toolbar-btn" title="Reset Zoom" @click="resetZoom">
        <RotateCcw :size="18" />
      </button>
    </div>

    <!-- Default Table Size Controls -->
    <DefaultTableSizeControl />

    <!-- Canvas Size Controls -->
    <CanvasSizeControl />

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Undo/Redo -->
    <div class="flex items-center gap-1">
      <button
        class="toolbar-btn"
        :disabled="!store.canUndo"
        title="Undo (Ctrl+Z)"
        @click="store.undo()"
      >
        <RotateCcw :size="18" class="scale-x-[-1]" />
      </button>
      <button
        class="toolbar-btn"
        :disabled="!store.canRedo"
        title="Redo (Ctrl+Shift+Z)"
        @click="store.redo()"
      >
        <RotateCcw :size="18" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.toolbar-btn {
  @apply p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed;
}

.toolbar-btn.active {
  @apply text-mission-accent bg-mission-accent/20;
}
</style>
