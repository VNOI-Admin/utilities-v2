<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <Segmented :model-value="variant" :options="VARIANT_OPTIONS" @update:model-value="setVariant" />
      <div class="flex flex-wrap items-center gap-2">
        <ToggleButton
          :model-value="multipleMode"
          label="Multiple mode"
          show-indicator
          indicator-variant="amber"
          title="Stage changes on each position, then put them on air together with Show all"
          @update:model-value="setMultipleMode"
        />
        <button type="button" class="btn-secondary" :disabled="saving" @click="showAll">
          <Eye :size="16" :stroke-width="2" />
          Show all
        </button>
        <button type="button" class="btn-danger" :disabled="saving || !variantShown" @click="hideAll">
          <EyeOff :size="16" :stroke-width="2" />
          Hide all
        </button>
      </div>
    </div>

    <div class="grid gap-3" :class="variant === 'split' ? 'md:grid-cols-2' : 'grid-cols-1'">
      <div
        v-for="position in positions"
        :key="position"
        class="mission-card p-4 space-y-3"
        :class="{ '!border-mission-accent/60': selectedPosition === position }"
      >
        <div class="flex flex-wrap items-center gap-3">
          <component
            :is="POSITION_META[position].icon"
            :size="20"
            :stroke-width="2"
            :class="widgetFor(position) ? 'text-mission-ok' : 'text-mission-line'"
          />
          <span class="font-medium">{{ POSITION_META[position].label }}</span>
          <span v-if="staged[position]" class="rounded-full bg-mission-amber/15 px-2 py-0.5 text-xs text-mission-amber">Staged</span>
          <div class="ml-auto flex items-center gap-2">
            <button
              type="button"
              class="btn-secondary !px-3 !py-1.5"
              :class="{ '!bg-mission-accent !text-mission-ink': selectedPosition === position }"
              :disabled="selectedPosition !== undefined && selectedPosition !== position"
              @click="selectPosition(position)"
            >
              {{ selectedPosition === position ? 'Selected' : widgetFor(position) ? 'Replace here' : 'Show here' }}
            </button>
            <button
              type="button"
              class="btn-danger !px-3 !py-1.5"
              :disabled="saving || (!widgetFor(position) && !staged[position])"
              @click="hidePosition(position)"
            >
              Hide
            </button>
          </div>
        </div>
        <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt class="text-mission-muted">Team</dt>
          <dd class="truncate">{{ describeTeam(position) }}</dd>
          <dt class="text-mission-muted">Media</dt>
          <dd class="truncate">{{ describeMedia(position) }}</dd>
        </dl>
      </div>
    </div>

    <section v-if="selectedPosition" class="mission-card p-4 md:p-6 space-y-5">
      <div class="flex items-center gap-3">
        <h2 class="font-semibold flex-1">{{ POSITION_META[selectedPosition].label }}</h2>
        <button type="button" class="btn-secondary !px-3 !py-1.5" @click="resetSelection">Cancel</button>
      </div>

      <TeamPicker
        v-if="!selectedUsername"
        :rows="data.rows.value"
        :contest-id="state.contestId"
        :on-air="onAirUsernames"
        @pick="selectedUsername = $event"
      />

      <template v-else>
        <div class="space-y-2">
          <span class="tech-label">Team</span>
          <button
            type="button"
            class="input-mission flex items-center justify-between gap-3 text-left"
            @click="selectedUsername = undefined"
          >
            <span class="truncate">{{ teamLabel(selectedUsername) }}</span>
            <ChevronDown :size="16" :stroke-width="2" class="flex-shrink-0" />
          </button>
        </div>

        <div class="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
          <span class="tech-label">Main content</span>
          <Segmented v-model="primary" :options="mediaOptions()" />
          <span class="tech-label">Additional content</span>
          <Segmented v-model="secondary" :options="mediaOptions(primary)" />
          <span class="tech-label">Name, ranking, submissions</span>
          <ToggleButton
            class="justify-self-start"
            :model-value="showTaskStatus"
            :label="showTaskStatus ? 'Shown' : 'Hidden'"
            @update:model-value="showTaskStatus = $event"
          />
        </div>

        <button type="button" class="btn-primary" :disabled="saving" @click="confirm">
          <Eye :size="16" :stroke-width="2" />
          {{ multipleMode ? 'Stage' : 'Show' }}
        </button>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue';
import {
  AppWindow,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpLeft,
  ArrowUpRight,
  ChevronDown,
  Eye,
  EyeOff,
  LayoutGrid,
  PanelBottom,
  PanelTop,
  Rows2,
} from 'lucide-vue-next';
import ToggleButton from '~/components/ToggleButton.vue';
import { TEAM_VIEW_IDS, type BroadcastWidget, type MediaKind, type TeamViewPosition, type TeamViewSettings } from '../types';
import { useBroadcastControl } from './context';
import Segmented, { type SegmentedOption } from './Segmented.vue';
import { useStored } from './storage';
import TeamPicker from './TeamPicker.vue';

type Variant = 'single' | 'pvp' | 'split';
type MediaChoice = MediaKind | 'none';

const VARIANT_POSITIONS: Record<Variant, TeamViewPosition[]> = {
  single: ['SINGLE'],
  pvp: ['PVP_TOP', 'PVP_BOTTOM'],
  split: ['TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_RIGHT'],
};

const VARIANT_OPTIONS: SegmentedOption<Variant>[] = [
  { value: 'single', label: 'Single', icon: AppWindow },
  { value: 'pvp', label: 'PVP', icon: Rows2 },
  { value: 'split', label: 'Split screen', icon: LayoutGrid },
];

const POSITION_META: Record<TeamViewPosition, { label: string; icon: Component }> = {
  SINGLE: { label: 'Full screen', icon: AppWindow },
  PVP_TOP: { label: 'Top', icon: PanelTop },
  PVP_BOTTOM: { label: 'Bottom', icon: PanelBottom },
  TOP_LEFT: { label: 'Top left', icon: ArrowUpLeft },
  TOP_RIGHT: { label: 'Top right', icon: ArrowUpRight },
  BOTTOM_LEFT: { label: 'Bottom left', icon: ArrowDownLeft },
  BOTTOM_RIGHT: { label: 'Bottom right', icon: ArrowDownRight },
};

const MEDIA_LABELS: Record<MediaChoice, string> = { screen: 'Screen', camera: 'Camera', none: 'Empty' };

const ALL_POSITIONS = Object.keys(TEAM_VIEW_IDS) as TeamViewPosition[];

const { state, data, saving, loaded, apply } = useBroadcastControl();

const variant = useStored<Variant>('broadcast.teamView.variant', 'single');
const primary = useStored<MediaChoice>('broadcast.teamView.primary', 'screen');
const secondary = useStored<MediaChoice>('broadcast.teamView.secondary', 'camera');
const showTaskStatus = useStored<boolean>('broadcast.teamView.showTaskStatus', true);

const multipleMode = ref(false);
const staged = ref<Partial<Record<TeamViewPosition, TeamViewSettings>>>({});
const selectedPosition = ref<TeamViewPosition>();
const selectedUsername = ref<string>();

const positions = computed(() => VARIANT_POSITIONS[variant.value]);

const widgetFor = (position: TeamViewPosition) =>
  state.value.widgets[TEAM_VIEW_IDS[position]] as BroadcastWidget<TeamViewSettings> | undefined;

const variantShown = computed(() => positions.value.some((position) => widgetFor(position)));

const onAirUsernames = computed(
  () => new Set(ALL_POSITIONS.map((position) => widgetFor(position)?.settings.username).filter((u): u is string => !!u)),
);

const initialised = ref(false);
watch(
  loaded,
  (isLoaded) => {
    if (!isLoaded || initialised.value) return;
    initialised.value = true;
    const shownPosition = ALL_POSITIONS.find((position) => widgetFor(position));
    const settings = shownPosition && widgetFor(shownPosition)?.settings;
    if (!shownPosition || !settings) return;
    const shownVariant = (Object.keys(VARIANT_POSITIONS) as Variant[]).find((v) =>
      VARIANT_POSITIONS[v].includes(shownPosition),
    );
    if (shownVariant) variant.value = shownVariant;
    primary.value = settings.primary ?? 'none';
    secondary.value = settings.secondary ?? 'none';
    showTaskStatus.value = settings.showTaskStatus;
  },
  { immediate: true },
);

watch(primary, (value) => {
  if (value !== 'none' && secondary.value === value) secondary.value = 'none';
});

const mediaOptions = (exclude?: MediaChoice): SegmentedOption<MediaChoice>[] =>
  (['screen', 'camera', 'none'] as MediaChoice[]).map((value) => ({
    value,
    label: MEDIA_LABELS[value],
    disabled: value !== 'none' && value === exclude,
  }));

const teamLabel = (username: string) => {
  const row = data.rowsByUsername.value.get(username);
  return row ? `${row.rank}. ${row.name} (${username})` : username;
};

const effective = (position: TeamViewPosition) => staged.value[position] ?? widgetFor(position)?.settings;

const describeTeam = (position: TeamViewPosition) => {
  const settings = effective(position);
  return settings ? teamLabel(settings.username) : 'Nothing shown';
};

const describeMedia = (position: TeamViewPosition) => {
  const settings = effective(position);
  if (!settings) return '—';
  const media = [settings.primary, settings.secondary].filter(Boolean).map((m) => MEDIA_LABELS[m as MediaKind]);
  return media.length ? media.join(', ') : 'Empty';
};

const resetSelection = () => {
  selectedPosition.value = undefined;
  selectedUsername.value = undefined;
};

const selectPosition = (position: TeamViewPosition) => {
  if (selectedPosition.value === position) return resetSelection();
  selectedPosition.value = position;
  selectedUsername.value = effective(position)?.username;
};

const setVariant = (next: Variant) => {
  variant.value = next;
  resetSelection();
};

const setMultipleMode = (next: boolean) => {
  multipleMode.value = next;
  if (!next) staged.value = {};
};

const teamViewWidget = (position: TeamViewPosition, settings: TeamViewSettings): BroadcastWidget<TeamViewSettings> => ({
  id: TEAM_VIEW_IDS[position],
  type: 'teamView',
  location: TEAM_VIEW_IDS[position],
  settings,
});

const putOnAir = (entries: [TeamViewPosition, TeamViewSettings][]) =>
  apply((current) => {
    const widgets = { ...current.widgets };
    const keep = new Set(VARIANT_POSITIONS[variant.value].map((position) => TEAM_VIEW_IDS[position]));
    for (const position of ALL_POSITIONS) {
      if (!keep.has(TEAM_VIEW_IDS[position])) delete widgets[TEAM_VIEW_IDS[position]];
    }
    for (const [position, settings] of entries) widgets[TEAM_VIEW_IDS[position]] = teamViewWidget(position, settings);
    return { ...current, widgets };
  });

const removePositions = (targets: TeamViewPosition[]) =>
  apply((current) => {
    const widgets = { ...current.widgets };
    for (const position of targets) delete widgets[TEAM_VIEW_IDS[position]];
    return { ...current, widgets };
  });

const confirm = async () => {
  const position = selectedPosition.value;
  const username = selectedUsername.value;
  if (!position || !username) return;
  const settings: TeamViewSettings = {
    username,
    position,
    primary: primary.value === 'none' ? null : primary.value,
    secondary: secondary.value === 'none' ? null : secondary.value,
    showTaskStatus: showTaskStatus.value,
  };
  if (multipleMode.value) {
    staged.value = { ...staged.value, [position]: settings };
    resetSelection();
    return;
  }
  if (await putOnAir([[position, settings]])) resetSelection();
};

const hidePosition = async (position: TeamViewPosition) => {
  if (staged.value[position]) {
    const next = { ...staged.value };
    delete next[position];
    staged.value = next;
  }
  if (widgetFor(position)) await removePositions([position]);
};

const showAll = async () => {
  const entries = positions.value
    .map((position) => [position, effective(position)] as const)
    .filter((entry): entry is readonly [TeamViewPosition, TeamViewSettings] => !!entry[1])
    .map(([position, settings]) => [position, settings] as [TeamViewPosition, TeamViewSettings]);
  if (await putOnAir(entries)) staged.value = {};
};

const hideAll = () => removePositions(positions.value);
</script>
