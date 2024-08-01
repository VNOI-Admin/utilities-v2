<script setup lang="ts">
import { OVERLAY_KEYS, OverlayKey } from "@libs/common/types/overlay";

const overlay = ref<OverlayKey | undefined>(undefined);
</script>

<template>
<!-- create a div with two cards, each card is a mode with keys of OVERLAY_KEYS using v-btn transparent, width for each one is 50% of vw -->
  <div class="flex flex-col items-center justify-center h-full">
    <div class="flex w-full">
      <v-btn
        v-for="key in Object.keys(OVERLAY_KEYS)"
        :key="key"
        @click="overlay = OVERLAY_KEYS[key]"
        class="w-1/2"
        text
      >
        {{ key }}
      </v-btn>
    </div>
    <div class="flex w-full">
      <v-overlay
        v-if="overlay === OVERLAY_KEYS.USER_STREAM"
        :value="true"
        color="white"
        opacity="0.5"
      >
        <v-progress-circular
          indeterminate
          color="primary"
        />
      </v-overlay>
      <v-overlay
        v-else-if="overlay === OVERLAY_KEYS.MULTI_USER_STREAM"
        :value="true"
        color="red"
        opacity="0.5"
      >
        <v-icon
          color="white"
        >
          mdi-alert-circle
        </v-icon>
      </v-overlay>
    </div>
  </div>
</template>
