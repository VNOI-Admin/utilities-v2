<template>
  <div>
    <h1 class="text-2xl font-semibold tracking-tight text-gray-100">
      {{ title }}
    </h1>
    <p v-if="subtitle" class="text-sm text-mission-muted mt-1">
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
