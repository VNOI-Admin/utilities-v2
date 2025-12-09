<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useFloorPlanStore, type TableObject } from '~/stores/floorplan';

const props = withDefaults(
  defineProps<{
    table: TableObject;
    gridSize?: number;
    readonly?: boolean;
  }>(),
  {
    gridSize: 30,
    readonly: false,
  },
);

const emit = defineEmits<{
  select: [tableId: string, addToSelection: boolean];
  update: [tableId: string, updates: Partial<TableObject>];
  dragStart: [tableId: string];
  dragEnd: [tableId: string];
  mouseenter: [e: any];
  mouseleave: [];
}>();

const store = useFloorPlanStore();
const transformerRef = ref<any>(null);
const groupRef = ref<any>(null);

const isSelected = computed(() => store.selectedObjectIds.includes(props.table.id));
const isBound = computed(() => !!props.table.boundUsername);

// Convert grid position to pixel position
const pixelPosition = computed(() => ({
  x: props.table.position.x * props.gridSize,
  y: props.table.position.y * props.gridSize,
}));

// Convert grid size to pixel size
const pixelSize = computed(() => ({
  width: props.table.size.width * props.gridSize,
  height: props.table.size.height * props.gridSize,
}));

// Colors based on bound state
const fillColor = computed(() => (isBound.value ? 'rgba(0, 255, 157, 0.2)' : 'rgba(26, 26, 26, 0.8)'));
const strokeColor = computed(() => {
  if (isSelected.value) return '#00d4ff';
  return isBound.value ? '#00ff9d' : 'rgba(255, 255, 255, 0.3)';
});
const textColor = computed(() => (isBound.value ? '#00ff9d' : '#ffffff'));

function handleDragStart() {
  if (props.readonly) return;
  if (!isSelected.value) {
    emit('select', props.table.id, false);
  }
  emit('dragStart', props.table.id);
}

function handleDragMove(e: any) {
  if (props.readonly) return;
  const node = e.target;
  const snapped = store.snapPosition(
    { x: node.x(), y: node.y() },
    props.gridSize,
  );
  node.x(snapped.x);
  node.y(snapped.y);
}

function handleDragEnd(e: any) {
  if (props.readonly) return;
  const node = e.target;
  const newGridPos = {
    x: Math.round(node.x() / props.gridSize),
    y: Math.round(node.y() / props.gridSize),
  };
  emit('update', props.table.id, { position: newGridPos });
  emit('dragEnd', props.table.id);
}

function handleClick(e: any) {
  if (props.readonly) return;
  e.cancelBubble = true;
  const addToSelection = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
  emit('select', props.table.id, addToSelection);
}

function handleTransform(e: any) {
  if (props.readonly) return;
  const node = e.target;

  // Get the scaled dimensions in pixels
  const scaledWidth = node.width() * node.scaleX();
  const scaledHeight = node.height() * node.scaleY();

  // Snap to grid - round to nearest grid cell
  const snappedWidth = Math.max(props.gridSize, Math.round(scaledWidth / props.gridSize) * props.gridSize);
  const snappedHeight = Math.max(props.gridSize, Math.round(scaledHeight / props.gridSize) * props.gridSize);

  // Update the node dimensions directly and reset scale
  node.width(snappedWidth);
  node.height(snappedHeight);
  node.scaleX(1);
  node.scaleY(1);
}

function handleTransformEnd(e: any) {
  if (props.readonly) return;
  const node = e.target;

  // Get current dimensions (already snapped from handleTransform)
  const finalWidth = node.width();
  const finalHeight = node.height();

  // Convert to grid units
  const newWidth = Math.round(finalWidth / props.gridSize);
  const newHeight = Math.round(finalHeight / props.gridSize);

  // Emit the update
  emit('update', props.table.id, {
    size: { width: newWidth, height: newHeight },
  });
}

// Attach transformer when selected
watch(
  isSelected,
  (selected) => {
    if (selected && transformerRef.value && groupRef.value && !props.readonly) {
      const transformer = transformerRef.value.getNode();
      const group = groupRef.value.getNode();

      transformer.nodes([group]);
      const layer = transformer.getLayer();
      if (layer) {
        layer.batchDraw();
      }
    }
  },
  { flush: 'post' },
);
</script>

<template>
  <v-group
    ref="groupRef"
    :config="{
      x: pixelPosition.x,
      y: pixelPosition.y,
      width: pixelSize.width,
      height: pixelSize.height,
      draggable: !readonly && store.editorMode === 'select',
      id: `table-${table.id}`,
    }"
    @dragstart="handleDragStart"
    @dragmove="handleDragMove"
    @dragend="handleDragEnd"
    @click="handleClick"
    @tap="handleClick"
    @transform="handleTransform"
    @transformend="handleTransformEnd"
    @mouseenter="(e: any) => emit('mouseenter', e)"
    @mouseleave="() => emit('mouseleave')"
  >
    <!-- Table Rectangle -->
    <v-rect
      :config="{
        width: pixelSize.width,
        height: pixelSize.height,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: isSelected ? 3 : 2,
        cornerRadius: 4,
        shadowColor: isSelected ? '#00d4ff' : 'transparent',
        shadowBlur: isSelected ? 15 : 0,
        shadowOpacity: 0.5,
      }"
    />

    <!-- Table Label -->
    <v-text
      :config="{
        text: table.label,
        x: pixelSize.width / 2,
        y: pixelSize.height / 2 - (isBound ? 8 : 0),
        fontSize: 14,
        fontFamily: 'JetBrains Mono, monospace',
        fill: textColor,
        align: 'center',
        verticalAlign: 'middle',
        offsetX: table.label.length * 4,
      }"
    />

    <!-- Bound Username -->
    <v-text
      v-if="isBound"
      :config="{
        text: table.boundUsername,
        x: pixelSize.width / 2,
        y: pixelSize.height / 2 + 8,
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
        fill: 'rgba(255, 255, 255, 0.6)',
        align: 'center',
        verticalAlign: 'middle',
        offsetX: (table.boundUsername?.length || 0) * 3,
      }"
    />
  </v-group>

  <!-- Transformer for resize -->
  <v-transformer
    v-if="isSelected && !readonly"
    ref="transformerRef"
    :config="{
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      rotateEnabled: false,
      borderStroke: '#00d4ff',
      anchorFill: '#00d4ff',
      anchorStroke: '#00d4ff',
      anchorSize: 8,
      keepRatio: false,
      centeredScaling: false,
      ignoreStroke: true,
    }"
  />
</template>
