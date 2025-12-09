<script setup lang="ts">
import { computed } from 'vue';
import { useFloorPlanStore, type Position } from '~/stores/floorplan';

const props = withDefaults(
  defineProps<{
    position: Position;
    gridSize?: number;
    readonly?: boolean;
  }>(),
  {
    gridSize: 30,
    readonly: false,
  },
);

const emit = defineEmits<{
  select: [addToSelection: boolean];
  update: [position: Position];
  mouseenter: [e: any];
  mouseleave: [];
}>();

const store = useFloorPlanStore();

const isSelected = computed(() => store.selectedObjectIds.includes('starting-point'));

const pixelPosition = computed(() => ({
  x: props.position.x * props.gridSize,
  y: props.position.y * props.gridSize,
}));

const strokeColor = computed(() => (isSelected.value ? '#00ff9d' : '#00d4ff'));

function handleDragStart() {
  if (props.readonly) return;
  if (!isSelected.value) {
    emit('select', false);
  }
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
  emit('update', newGridPos);
}

function handleClick(e: any) {
  if (props.readonly) return;
  e.cancelBubble = true;
  const addToSelection = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
  emit('select', addToSelection);
}
</script>

<template>
  <v-group
    :config="{
      x: pixelPosition.x,
      y: pixelPosition.y,
      draggable: !readonly && store.editorMode === 'select',
      id: 'starting-point',
    }"
    @dragstart="handleDragStart"
    @dragmove="handleDragMove"
    @dragend="handleDragEnd"
    @click="handleClick"
    @tap="handleClick"
    @mouseenter="(e: any) => emit('mouseenter', e)"
    @mouseleave="() => emit('mouseleave')"
  >
    <!-- Table-like Rectangle -->
    <v-rect
      :config="{
        width: props.gridSize,
        height: props.gridSize,
        fill: 'rgba(0, 212, 255, 0.3)',
        stroke: strokeColor,
        strokeWidth: isSelected ? 4 : 3,
        cornerRadius: 4,
        shadowColor: isSelected ? '#00ff9d' : '#00d4ff',
        shadowBlur: isSelected ? 15 : 10,
        shadowOpacity: 0.5,
      }"
    />

    <!-- Starting Point Label -->
    <v-text
      :config="{
        text: 'START',
        x: props.gridSize / 2,
        y: props.gridSize / 2,
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
        fontStyle: 'bold',
        fill: strokeColor,
        align: 'center',
        verticalAlign: 'middle',
        offsetX: 17,
      }"
    />
  </v-group>
</template>
