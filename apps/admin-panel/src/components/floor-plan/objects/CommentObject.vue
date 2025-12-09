<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useFloorPlanStore, type CommentBlock } from '~/stores/floorplan';

const props = withDefaults(
  defineProps<{
    comment: CommentBlock;
    gridSize?: number;
    readonly?: boolean;
  }>(),
  {
    gridSize: 30,
    readonly: false,
  },
);

const emit = defineEmits<{
  select: [commentId: string, addToSelection: boolean];
  update: [commentId: string, updates: Partial<CommentBlock>];
  dragStart: [commentId: string];
  dragEnd: [commentId: string];
  mouseenter: [e: any];
  mouseleave: [];
}>();

const store = useFloorPlanStore();
const transformerRef = ref<any>(null);
const groupRef = ref<any>(null);

const isSelected = computed(() => store.selectedObjectIds.includes(props.comment.id));

// Convert grid position to pixel position
const pixelPosition = computed(() => ({
  x: props.comment.position.x * props.gridSize,
  y: props.comment.position.y * props.gridSize,
}));

// Convert grid size to pixel size
const pixelSize = computed(() => ({
  width: props.comment.size.width * props.gridSize,
  height: props.comment.size.height * props.gridSize,
}));

// Colors
const fillColor = computed(() => 'rgba(255, 184, 48, 0.1)');
const strokeColor = computed(() => {
  if (isSelected.value) return '#00d4ff';
  return '#ffb830';
});
const textColor = computed(() => '#ffb830');

function handleDragStart() {
  if (props.readonly) return;
  if (!isSelected.value) {
    emit('select', props.comment.id, false);
  }
  emit('dragStart', props.comment.id);
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
  emit('update', props.comment.id, { position: newGridPos });
  emit('dragEnd', props.comment.id);
}

function handleClick(e: any) {
  if (props.readonly) return;
  e.cancelBubble = true;
  const addToSelection = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
  emit('select', props.comment.id, addToSelection);
}

function handleTransform(e: any) {
  if (props.readonly) return;
  const node = e.target;

  // Get the scaled dimensions in pixels
  const scaledWidth = node.width() * node.scaleX();
  const scaledHeight = node.height() * node.scaleY();

  // Snap to grid - round to nearest grid cell
  const snappedWidth = Math.max(props.gridSize * 2, Math.round(scaledWidth / props.gridSize) * props.gridSize);
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
  emit('update', props.comment.id, {
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
      id: `comment-${comment.id}`,
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
    <!-- Comment Rectangle -->
    <v-rect
      :config="{
        width: pixelSize.width,
        height: pixelSize.height,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: isSelected ? 3 : 2,
        cornerRadius: 4,
        dash: [8, 4],
        shadowColor: isSelected ? '#00d4ff' : 'transparent',
        shadowBlur: isSelected ? 15 : 0,
        shadowOpacity: 0.5,
      }"
    />

    <!-- Comment Text -->
    <v-text
      :config="{
        text: comment.text,
        x: 8,
        y: 8,
        width: pixelSize.width - 16,
        height: pixelSize.height - 16,
        fontSize: 12,
        fontFamily: 'JetBrains Mono, monospace',
        fill: textColor,
        align: 'left',
        verticalAlign: 'top',
        wrap: 'word',
        ellipsis: true,
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
