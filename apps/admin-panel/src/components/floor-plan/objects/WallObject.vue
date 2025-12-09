<script setup lang="ts">
import { computed } from 'vue';
import { useFloorPlanStore, type WallSegment } from '~/stores/floorplan';

const props = withDefaults(
  defineProps<{
    wall: WallSegment;
    gridSize?: number;
    readonly?: boolean;
  }>(),
  {
    gridSize: 30,
    readonly: false,
  },
);

const emit = defineEmits<{
  select: [wallId: string, addToSelection: boolean];
  mouseenter: [e: any];
  mouseleave: [];
}>();

const store = useFloorPlanStore();

const isSelected = computed(() => store.selectedObjectIds.includes(props.wall.id));

// Calculate line points based on orientation and length
const linePoints = computed(() => {
  const startX = props.wall.start.x * props.gridSize;
  const startY = props.wall.start.y * props.gridSize;

  if (props.wall.orientation === 'horizontal') {
    const endX = startX + props.wall.length * props.gridSize;
    return [startX, startY, endX, startY];
  } else {
    const endY = startY + props.wall.length * props.gridSize;
    return [startX, startY, startX, endY];
  }
});

const strokeColor = computed(() => (isSelected.value ? '#00d4ff' : '#ffb830'));

function handleClick(e: any) {
  if (props.readonly) return;
  e.cancelBubble = true;
  const addToSelection = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
  emit('select', props.wall.id, addToSelection);
}
</script>

<template>
  <v-line
    :config="{
      points: linePoints,
      stroke: strokeColor,
      strokeWidth: isSelected ? 6 : 4,
      lineCap: 'round',
      lineJoin: 'round',
      shadowColor: isSelected ? '#00d4ff' : 'transparent',
      shadowBlur: isSelected ? 10 : 0,
      hitStrokeWidth: 20,
    }"
    @click="handleClick"
    @tap="handleClick"
    @mouseenter="(e: any) => emit('mouseenter', e)"
    @mouseleave="() => emit('mouseleave')"
  />
</template>
