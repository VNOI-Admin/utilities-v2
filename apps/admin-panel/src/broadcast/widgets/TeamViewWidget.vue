<template>
  <div class="team-view-widget" :style="{ '--appear': `${visual.TEAM_VIEW_APPEAR_TIME}ms` }">
    <Transition name="team" appear>
      <TeamViewContent
        :key="`${widget.settings.username}|${widget.settings.position}`"
        :settings="widget.settings"
        :location="location"
        :data="data"
        :visual="visual"
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { WidgetProps } from '../widget-props';
import type { TeamViewSettings } from '../types';
import TeamViewContent from './teamview/TeamViewContent.vue';

const props = defineProps<WidgetProps<TeamViewSettings>>();

const location = computed(
  () =>
    props.visual.WIDGET_POSITIONS[props.widget.location] ?? {
      positionX: 0,
      positionY: 0,
      sizeX: 1488,
      sizeY: 984,
    },
);
</script>

<style scoped>
.team-view-widget {
  position: relative;
  width: 100%;
  height: 100%;
}

.team-enter-active {
  transition: opacity var(--appear) ease-out;
}

.team-leave-active {
  transition: opacity var(--appear) ease-in;
}

.team-enter-from,
.team-leave-to {
  opacity: 0;
}
</style>
