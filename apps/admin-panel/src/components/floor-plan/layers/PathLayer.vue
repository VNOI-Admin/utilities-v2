<script setup lang="ts">
import { computed } from 'vue';
import type { Position } from '~/stores/floorplan';

const props = defineProps<{
  path: Position[];
  gridSize: number;
}>();

// Convert grid positions to pixel positions
const pixelPath = computed(() => {
  return props.path.map(pos => ({
    x: pos.x * props.gridSize,
    y: pos.y * props.gridSize,
  }));
});

// Convert path to flat array of coordinates for Konva Line
const linePoints = computed(() => {
  const points: number[] = [];
  for (const pos of pixelPath.value) {
    points.push(pos.x, pos.y);
  }
  return points;
});
</script>

<template>
  <v-group v-if="pixelPath.length > 1">
    <!-- Draw dotted line path -->
    <v-line
      :config="{
        points: linePoints,
        stroke: '#00d4ff',
        strokeWidth: 3,
        dash: [10, 5],
        lineCap: 'round',
        lineJoin: 'round',
        listening: false,
      }"
    />

    <!-- Draw circles at each waypoint -->
    <v-circle
      v-for="(pos, index) in pixelPath"
      :key="`waypoint-${index}`"
      :config="{
        x: pos.x,
        y: pos.y,
        radius: 4,
        fill: '#00d4ff',
        listening: false,
      }"
    />
  </v-group>
</template>
