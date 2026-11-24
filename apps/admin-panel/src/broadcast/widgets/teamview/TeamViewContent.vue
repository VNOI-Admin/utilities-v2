<template>
  <div class="team-view" :style="{ '--radius': visual.GLOBAL_BORDER_RADIUS }">
    <template v-if="variant === 'single' || variant === 'split'">
      <div v-if="settings.primary" class="primary">
        <StreamPlayer class="rounded" :src="sources[settings.primary]" />
      </div>
      <div class="grid" :style="variant === 'single' ? singleGrid : splitGrid">
        <div v-if="settings.secondary" class="secondary">
          <StreamPlayer class="rounded" :src="sources[settings.secondary]" />
        </div>
        <div v-if="settings.showTaskStatus" class="task-status" :class="{ 'with-secondary': !!settings.secondary }">
          <ContestantViewCorner :row="row" :data="data" :visual="visual" />
        </div>
      </div>
    </template>
    <template v-else>
      <div class="pvp-grid" :style="pvp.grid">
        <div v-if="settings.primary" class="pvp-cell" :style="{ gridColumn: '1 / 2', gridRow: isTop ? '1 / 4' : '2 / 5' }">
          <StreamPlayer :src="sources[settings.primary]" />
        </div>
        <div v-if="settings.secondary" class="pvp-cell" :style="{ gridColumn: '2', gridRow: isTop ? '1 / 2' : '4 / 5' }">
          <StreamPlayer :src="sources[settings.secondary]" />
        </div>
        <div
          class="pvp-back"
          :style="{ gridColumn: '2', gridRow: isTop ? '3 / 4' : '2 / 3', background: visual.PVP_BACKGROUND }"
        />
      </div>
      <div v-if="settings.showTaskStatus" class="pvp-status" :class="{ top: isTop }" :style="pvp.status">
        <ContestantViewLine
          class="pvp-line"
          :row="row"
          :data="data"
          :visual="visual"
          :is-top="isTop"
          :tasks-container-y="(pvp.secondaryY / 9) * 16"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Location, VisualConfig } from '../../config';
import type { BroadcastData } from '../../data';
import type { TeamViewSettings } from '../../types';
import ContestantViewCorner from './ContestantViewCorner.vue';
import ContestantViewLine from './ContestantViewLine.vue';
import StreamPlayer from './StreamPlayer.vue';
import { useTeamMedia } from './useTeamMedia';

const PVP_ASPECT_RATIO_WIDTH = 16;
const PVP_ASPECT_RATIO_HEIGHT = 9;
const PVP_TABLE_ROW_HEIGHT_MULTIPLIER = 2.5;
const PVP_TABLE_ROW_HEIGHT_OFFSET_MULTIPLIER = 0.5;

const props = defineProps<{
  settings: TeamViewSettings;
  location: Location;
  data: BroadcastData;
  visual: VisualConfig;
}>();

const variant = computed(() => {
  const position = props.settings.position;
  if (!position || position === 'SINGLE') return 'single';
  if (position === 'PVP_TOP' || position === 'PVP_BOTTOM') return 'pvp';
  return 'split';
});

const isTop = computed(() => props.settings.position === 'PVP_TOP');

const row = computed(() => props.data.rowsByUsername.value.get(props.settings.username));

const mediaUser = computed(() => row.value?.participant.mapToUser ?? null);

const sources = useTeamMedia(mediaUser);

const singleGrid = computed(() => {
  const { sizeX, sizeY } = props.location;
  const achievementY = sizeY - (sizeX / 16) * 9;
  const secondaryY =
    achievementY > 0 ? achievementY : (sizeY * props.visual.TEAMVIEW_FULLSCREEN_SECONDARY_FACTOR) / 2;
  return {
    gridTemplateColumns: `1fr ${((secondaryY * 2) / 9) * 16}px`,
    gridTemplateRows: `1fr ${secondaryY}px ${secondaryY}px ${Math.max(achievementY, 0)}px`,
  };
});

const splitGrid = computed(() => {
  const secondaryY = props.location.sizeY * props.visual.SPLITSCREEN_SECONDARY_FACTOR;
  const half = secondaryY / props.visual.PVP_SECONDARY_DIVISOR;
  return {
    gridTemplateColumns: `1fr ${(secondaryY / PVP_ASPECT_RATIO_HEIGHT) * PVP_ASPECT_RATIO_WIDTH}px`,
    gridTemplateRows: `1fr ${half}px ${half}px`,
  };
});

const pvp = computed(() => {
  const { sizeX, sizeY } = props.location;
  const rowHeight = props.visual.PVP_TABLE_ROW_HEIGHT;
  const primaryY = sizeY - 0.5 * rowHeight;
  const secondaryY = ((sizeX - (primaryY / 9) * 16) / 16) * 9;
  const tall = rowHeight * PVP_TABLE_ROW_HEIGHT_MULTIPLIER;
  const offset = rowHeight * PVP_TABLE_ROW_HEIGHT_OFFSET_MULTIPLIER;
  const columns = [primaryY, secondaryY].map((y) => `${(y / PVP_ASPECT_RATIO_HEIGHT) * PVP_ASPECT_RATIO_WIDTH}px`);
  return {
    secondaryY,
    grid: {
      gridTemplateColumns: columns.join(' '),
      gridTemplateRows: isTop.value
        ? `${secondaryY}px 1fr ${tall}px ${offset}px`
        : `${offset}px ${tall}px 1fr ${secondaryY}px`,
    },
    status: { height: `${rowHeight * 3}px` },
  };
});
</script>

<style scoped>
.team-view {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: start;
  align-items: flex-end;
}

.primary {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 1;
  overflow: hidden;
}

.rounded {
  border-radius: var(--radius);
  border-top-right-radius: 0;
}

.grid {
  position: relative;
  z-index: 3;
  display: grid;
  width: 100%;
  height: 100%;
  border-radius: var(--radius);
}

.secondary {
  grid-column: 2 / 3;
  grid-row: 2 / 4;
  overflow: hidden;
  z-index: 3;
}

.task-status {
  grid-column: 2 / 3;
  grid-row: 1 / 4;
  display: grid;
  align-items: end;
  overflow: hidden;
  border-radius: var(--radius);
}

.task-status.with-secondary {
  grid-row: 1 / 2;
}

.pvp-grid {
  position: relative;
  z-index: 1;
  display: grid;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: var(--radius);
}

.pvp-cell {
  overflow: hidden;
}

.pvp-status {
  position: absolute;
  top: 0;
  width: 100%;
  z-index: 2;
  overflow: hidden;
  display: grid;
  justify-items: end;
}

.pvp-status.top {
  top: auto;
  bottom: 0;
}

.pvp-line {
  right: 0;
}
</style>
