<script setup lang="ts">
interface Props {
  title: string;
  icon: string;
  subtitle?: string;
}

const props = defineProps<Props>();
</script>

<template>
  <v-card
    class="pa-3 width-100"
  >
  <!-- make a card with icon, title, subtitle, and after that a slot -->
  <v-card-title>
    <v-icon>{{ props.icon }}</v-icon>
    <span class="ml-2">{{ props.title }}</span>
  </v-card-title>
  <v-card-subtitle v-if="props.subtitle">{{ props.subtitle }}</v-card-subtitle>
  <v-card-text>
    <slot></slot>
  </v-card-text>
  </v-card>
</template>
