<template>
  <div class="p-4 md:p-8 max-w-[1440px] mx-auto space-y-6">
    <!-- Page Header -->
    <div class="flex flex-wrap items-end gap-3">
      <PageHeader
        class="flex-1 min-w-0"
        title="Overview"
        :subtitle="liveContests.length ? `Live: ${liveContests.map(c => c.name || c.code).join(', ')}` : 'No contest is running'"
      />
      <RefreshButton :loading="loading" @click="loadMetrics" />
    </div>

    <!-- Metrics Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <router-link
        v-for="kpi in kpis"
        :key="kpi.label"
        :to="kpi.to"
        class="rounded-card p-5 text-mission-ink transition hover:brightness-105"
        :class="kpi.bg"
      >
        <div class="text-sm text-mission-ink/60">{{ kpi.label }}</div>
        <div class="mt-1 text-3xl font-semibold tabular-nums">
          {{ loading ? '–' : kpi.value }}<span v-if="kpi.total !== undefined && !loading" class="text-base font-medium text-mission-ink/50">/{{ kpi.total }}</span>
        </div>
        <div class="mt-1 text-xs text-mission-ink/60">{{ loading ? ' ' : kpi.hint }}</div>
      </router-link>
    </div>

    <div class="mission-card p-5">
      <div class="flex items-center gap-2 mb-1">
        <h2 class="font-semibold flex-1">Needs attention</h2>
        <span class="text-sm text-mission-muted tabular-nums">{{ loading ? '' : attention.length }}</span>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="space-y-3 py-2">
        <div v-for="i in 3" :key="i" class="h-12 rounded-xl bg-mission-gray animate-pulse"></div>
      </div>
      <p v-else-if="!attention.length" class="py-8 text-center text-sm text-mission-muted">
        Nothing needs you right now.
      </p>
      <div
        v-for="(item, i) in loading ? [] : attention"
        :key="item.title"
        class="flex items-center gap-3 py-3"
        :class="{ 'border-t border-white/[0.06]': i > 0 }"
      >
        <span class="w-1 self-stretch rounded-full" :class="TONE[item.tone]"></span>
        <div class="flex-1 min-w-0">
          <div class="font-medium">{{ item.title }}</div>
          <div class="text-sm text-mission-muted truncate" :title="item.detail">{{ item.detail }}</div>
        </div>
        <router-link :to="item.to" class="btn-secondary !px-3 !py-1.5 text-xs">{{ item.cta }}</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { UserEntity } from '@libs/api/internal';
import { internalApi } from '~/services/api';
import { usePrintingStore } from '~/stores/printing';
import { useRemoteControlStore } from '~/stores/remoteControl';

type Tone = 'bad' | 'warn' | 'info';
interface AttentionItem {
  tone: Tone;
  title: string;
  detail: string;
  cta: string;
  to: string;
}

const TONE: Record<Tone, string> = { bad: 'bg-mission-red', warn: 'bg-mission-amber', info: 'bg-mission-blue' };
const STUCK_PRINT_MS = 5 * 60 * 1000;
const HIGH_USAGE = 85;
const HIGH_PING = 200;

const printingStore = usePrintingStore();
const remoteControlStore = useRemoteControlStore();

const loading = ref(true);
const contestants = ref<UserEntity[]>([]);
const liveContests = ref<{ code: string; name?: string }[]>([]);
const unlinked = ref<{ contest: string; username: string }[]>([]);

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const activeContestants = computed(() => contestants.value.filter(u => u.isActive));
const online = computed(() => activeContestants.value.filter(u => u.machineUsage?.isOnline));
const queued = computed(() => printingStore.printJobs.filter(j => j.status === 'queued'));
const stuckPrints = computed(() => queued.value.filter(j => Date.now() - new Date(j.requestedAt).getTime() > STUCK_PRINT_MS));
const runningJobs = computed(() => remoteControlStore.jobs.filter(j => (j.statusCounts?.pending ?? 0) + (j.statusCounts?.running ?? 0) > 0));
const failedJobs = computed(() => remoteControlStore.jobs.slice(0, 10).filter(j => (j.statusCounts?.failed ?? 0) > 0));

function machineIssue(u: UserEntity): string | null {
  const m = u.machineUsage;
  if (!m?.isOnline) return null;
  if (m.cpu > HIGH_USAGE) return `CPU ${Math.round(m.cpu)}%`;
  if (m.memory > HIGH_USAGE) return `memory ${Math.round(m.memory)}%`;
  if (m.disk > HIGH_USAGE) return `disk ${Math.round(m.disk)}%`;
  if (m.ping > HIGH_PING) return `ping ${Math.round(m.ping)} ms`;
  return null;
}

const kpis = computed(() => [
  {
    label: 'Contestants online',
    value: online.value.length,
    total: activeContestants.value.length,
    hint: `${activeContestants.value.length - online.value.length} offline`,
    to: '/users',
    bg: 'bg-mission-blue',
  },
  {
    label: 'Print queue',
    value: queued.value.length,
    hint: `${stuckPrints.value.length} waiting over 5 min`,
    to: '/printing',
    bg: 'bg-mission-pink',
  },
  {
    label: 'Live contests',
    value: liveContests.value.length,
    hint: unlinked.value.length ? `${plural(unlinked.value.length, 'participant')} not linked` : 'All participants linked',
    to: '/contests',
    bg: 'bg-mission-purple',
  },
  {
    label: 'Remote jobs running',
    value: runningJobs.value.length,
    hint: failedJobs.value.length ? `${plural(failedJobs.value.length, 'recent job')} with failures` : 'No recent failures',
    to: '/remote-control/jobs',
    bg: 'bg-mission-mint',
  },
]);

const attention = computed<AttentionItem[]>(() => {
  const items: AttentionItem[] = [];

  const offline = activeContestants.value.filter(u => !u.machineUsage?.isOnline);
  if (offline.length) {
    items.push({ tone: 'bad', title: `${plural(offline.length, 'contestant machine')} offline`, detail: offline.map(u => u.username).join(', '), cta: 'Users', to: '/users' });
  }

  for (const client of printingStore.printClients.filter(c => c.isActive && !c.isOnline)) {
    const waiting = queued.value.filter(j => j.clientId === client.clientId).length;
    items.push({ tone: 'bad', title: `Printer ${client.clientId} is offline`, detail: `${plural(waiting, 'job')} in its queue`, cta: 'Printing', to: '/printing' });
  }

  for (const job of failedJobs.value) {
    items.push({ tone: 'bad', title: `${job.scriptName} failed on ${plural(job.statusCounts?.failed ?? 0, 'machine')}`, detail: `Job ${job.jobId} by ${job.createdBy}`, cta: 'Open job', to: `/remote-control/jobs/${job.jobId}` });
  }

  const busy = online.value.map(u => ({ u, issue: machineIssue(u) })).filter(x => x.issue);
  if (busy.length) {
    items.push({ tone: 'warn', title: `${plural(busy.length, 'machine')} under heavy load`, detail: busy.map(x => `${x.u.username} (${x.issue})`).join(', '), cta: 'Users', to: '/users' });
  }

  if (stuckPrints.value.length) {
    items.push({ tone: 'warn', title: `${plural(stuckPrints.value.length, 'print job')} waiting over 5 min`, detail: stuckPrints.value.map(j => `${j.username} · ${j.filename}`).join(', '), cta: 'Printing', to: '/printing' });
  }

  for (const contest of liveContests.value) {
    const missing = unlinked.value.filter(p => p.contest === contest.code);
    if (missing.length) {
      items.push({ tone: 'info', title: `${plural(missing.length, 'participant')} in ${contest.code} not linked to a user`, detail: missing.map(p => p.username).join(', '), cta: 'Link', to: `/contests/${contest.code}` });
    }
  }

  return items;
});

async function loadUnlinked(codes: string[]) {
  const lists = await Promise.all(codes.map(code => internalApi.contest.getParticipants(code)));
  unlinked.value = lists.flat().filter(p => !p.mapToUser).map(p => ({ contest: p.contest, username: p.username }));
}

async function loadMetrics() {
  loading.value = true;
  const results = await Promise.allSettled([
    internalApi.user.getUsers({ role: 'contestant' }).then(users => { contestants.value = users; }),
    printingStore.fetchJobs(),
    printingStore.fetchClients(),
    remoteControlStore.fetchJobs(),
    internalApi.contest.findAll({ filter: 'ongoing' }).then(async (contests: { code: string; name?: string }[]) => {
      liveContests.value = contests;
      await loadUnlinked(contests.map(c => c.code));
    }),
  ]);
  for (const r of results) if (r.status === 'rejected') console.error('Failed to load overview data:', r.reason);
  loading.value = false;
}

onMounted(() => {
  loadMetrics();
});
</script>
