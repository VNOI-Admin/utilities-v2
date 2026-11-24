import { computed, type Ref } from 'vue';
import type { VisualConfig } from '../../config';
import type { BroadcastData, QueueRun } from '../../data';

export interface QueueRowLayout {
  run: QueueRun;
  bottom: number;
  zIndex: number;
  pinned: boolean;
}

const FTS_WAIT_TIME = 2 * 60 * 1000;
const SNAPSHOT_WINDOW = 60 * 1000;

export function useQueueRows(
  data: BroadcastData,
  visual: Ref<VisualConfig>,
  size: Ref<{ width: number; height: number }>,
) {
  const mountedAt = Date.now();
  const pinnedSince = new Map<string, number>();

  const pinnedIds = computed(() => {
    const now = data.now.value.getTime();
    const ids = new Set<string>();
    for (const run of data.queue.value) {
      if (!run.firstToSolve) continue;
      if (!pinnedSince.has(run.id)) {
        pinnedSince.set(run.id, now - mountedAt < SNAPSHOT_WINDOW ? run.submittedAt.getTime() : now);
      }
      if (now < (pinnedSince.get(run.id) as number) + FTS_WAIT_TIME) ids.add(run.id);
    }
    return ids;
  });

  return computed<QueueRowLayout[]>(() => {
    const c = visual.value;
    const { width, height } = size.value;
    const queue = data.queue.value;
    const pinned = pinnedIds.value;
    const step = c.QUEUE_ROW_HEIGHT + c.QUEUE_ROW_Y_PADDING;
    const allowedMaxRows = Math.min(
      Math.floor((width / c.QUEUE_ROW_WIDTH) * ((height - c.QUEUE_FTS_BOTTOM_OFFSET) / step)),
      c.QUEUE_MAX_ROWS,
    );
    const totalPinned = queue.filter((run) => pinned.has(run.id)).length;
    let pinnedCount = 0;
    let regularCount = 0;
    const rows = queue.map((run, index) => {
      const isPinned = pinned.has(run.id);
      const bottom = isPinned ? height - step * (totalPinned - pinnedCount++) : step * regularCount++;
      return { run, bottom, pinned: isPinned, zIndex: c.QUEUE_BASIC_ZINDEX + queue.length - index };
    });
    const allowedRegular = allowedMaxRows - pinnedCount;
    return rows.filter((row, index) => row.pinned || index < allowedRegular);
  });
}
