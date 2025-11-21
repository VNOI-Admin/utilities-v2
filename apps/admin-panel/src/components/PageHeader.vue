<template>
  <div>
    <h1 class="text-4xl font-display font-bold text-glow flex items-center gap-3">
      <span class="text-mission-accent">█</span>
      {{ title }}
    </h1>
    <p v-if="subtitle" class="text-sm font-mono text-gray-500 mt-2 uppercase tracking-wider">
      {{ subtitle }}
    </p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string;
  subtitle?: string;
}

withDefaults(defineProps<Props>(), {
  subtitle: '',
});
</script>
