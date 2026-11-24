<template>
  <div class="p-4 md:p-8 max-w-[1440px] mx-auto space-y-5">
    <!-- Header -->
    <header class="space-y-4">
      <BackButton to="/contests" label="Contests" button-class="!px-3 !py-1.5 text-xs" />
      <div v-if="contest" class="flex flex-wrap items-start gap-3">
        <div class="flex-1 min-w-0">
          <PageHeader :title="contest.name" />
          <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-mission-muted">
            <span class="font-mono">{{ contest.code }}</span>
            <StatusBadge v-bind="contestStatusBadge(contestStatus)" />
            <span class="tabular-nums">{{ formatSchedule(contest.start_time, contest.end_time) }}</span>
            <span v-if="contest.frozen_at" class="tabular-nums">Freeze at {{ formatClock(contest.frozen_at) }}</span>
            <span>{{ rankingFormat }} format</span>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <!-- Force Sync Submissions button -->
          <button
            @click="forceSyncSubmissions"
            :disabled="forceSyncingSubmissions"
            class="btn-secondary"
            title="Fetch every submission from VNOJ again and rebuild the ranking"
          >
            <RotateCw
              :size="16"
              :stroke-width="2"
              :class="{ 'animate-spin': forceSyncingSubmissions }"
            />
            <span>{{ forceSyncingSubmissions ? 'Syncing submissions…' : 'Sync submissions' }}</span>
          </button>
          <!-- Resync button -->
          <button
            @click="resyncContest"
            :disabled="resyncingContest"
            class="btn-secondary"
            title="Fetch contest details, problems and participants from VNOJ again"
          >
            <RotateCw
              :size="16"
              :stroke-width="2"
              :class="{ 'animate-spin': resyncingContest }"
            />
            <span>{{ resyncingContest ? 'Resyncing…' : 'Resync contest' }}</span>
          </button>
          <!-- Recalculate submission data (rank change, score) from stored submissions -->
          <button
            @click="recalculateContestData"
            :disabled="recalculatingData"
            class="btn-secondary"
            title="Rebuild rank changes, scores and standings from the stored submissions"
          >
            <Calculator
              :size="16"
              :stroke-width="2"
              :class="{ 'animate-pulse': recalculatingData }"
            />
            <span>{{ recalculatingData ? 'Recalculating…' : 'Recalculate data' }}</span>
          </button>
          <!-- Re-render every accepted submission's reaction video -->
          <button
            @click="regenerateAllReactions"
            :disabled="regeneratingAllReactions"
            class="btn-secondary"
            title="Render the reaction video of every accepted submission again"
          >
            <Video
              :size="16"
              :stroke-width="2"
              :class="{ 'animate-pulse': regeneratingAllReactions }"
            />
            <span>{{ regeneratingAllReactions ? 'Queueing…' : 'Regenerate reactions' }}</span>
          </button>
          <!-- Delete button -->
          <button @click="showDeleteModal = true" class="btn-danger">
            <Trash2 :size="16" :stroke-width="2" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Loading State -->
    <LoadingSpinner v-if="loading" message="Loading contest…" />

    <!-- Error State -->
    <div v-else-if="error" class="mission-card p-8 max-w-md mx-auto text-center">
      <AlertCircle :size="40" :stroke-width="2" class="mx-auto mb-3 text-mission-red" />
      <p class="text-sm text-mission-red mb-4">{{ error }}</p>
      <router-link to="/contests" class="btn-secondary">
        Back to contests
      </router-link>
    </div>

    <!-- Contest Detail Content -->
    <div v-else-if="contest" class="space-y-5">
      <!-- Tab Navigation -->
      <nav class="flex gap-6 border-b border-white/[0.06] overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          @click="changeTab(tab.id)"
          class="-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 pt-1 text-sm font-medium transition-colors"
          :class="activeTab === tab.id
            ? 'border-mission-accent text-gray-100'
            : 'border-transparent text-mission-muted hover:text-gray-100'"
        >
          {{ tab.label }}
          <span v-if="tab.count !== undefined" class="text-xs font-normal text-mission-muted tabular-nums">{{ tab.count }}</span>
          <span
            v-if="tab.id === 'participants' && unmappedParticipantsCount > 0"
            class="rounded-full bg-mission-amber/15 px-2 py-0.5 text-xs text-mission-amber tabular-nums"
          >
            {{ unmappedParticipantsCount }} unlinked
          </span>
        </button>
      </nav>

      <!-- Tab Content -->
      <!-- RANKING TAB -->
      <div v-show="activeTab === 'ranking'">
        <LoadingSpinner v-if="loadingParticipants || loadingProblems" message="Loading ranking…" container-class="py-16" />
        <EmptyState
          v-else-if="participants.length === 0"
          icon="participants"
          title="No participants yet"
          subtitle="Sync participants from VNOJ on the Participants tab."
        />
        <div v-else class="mission-card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-white/[0.06] text-xs text-mission-muted">
                  <th class="px-4 py-3 text-left font-medium w-12">#</th>
                  <th class="px-3 py-3 text-left font-medium min-w-[180px]">Team</th>
                  <th class="px-3 py-3 text-right font-medium w-16">{{ primaryLabel(rankingFormat) }}</th>
                  <th class="px-3 py-3 text-right font-medium w-20">{{ secondaryLabel(rankingFormat) }}</th>
                  <th
                    v-for="problem in sortedProblems"
                    :key="problem._id"
                    class="px-1 py-3 text-center font-medium w-14"
                    :title="problemTitle(problem.letter, problem.fullName)"
                  >
                    {{ problem.letter }}
                  </th>
                  <th class="w-3"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/[0.06]">
                <tr
                  v-for="row in rankingData"
                  :key="row.participant._id"
                  class="hover:bg-white/[0.03] transition-colors"
                >
                  <!-- Rank -->
                  <td class="px-4 py-2 text-mission-muted tabular-nums">
                    {{ row.rank }}
                  </td>
                  <!-- Display Name -->
                  <td class="px-3 py-2 max-w-[280px]">
                    <div class="font-medium truncate">{{ row.participant.displayName }}</div>
                    <div class="text-xs text-mission-muted truncate">
                      {{ row.participant.username }}<template v-if="groupLabel(row.participant)"> · {{ groupLabel(row.participant) }}</template>
                    </div>
                  </td>
                  <!-- Primary metric (Score for VNOJ, Solved for ICPC) -->
                  <td class="px-3 py-2 text-right font-semibold tabular-nums">
                    {{ row.primary }}
                  </td>
                  <!-- Secondary metric (Time for VNOJ, Penalty for ICPC) -->
                  <td class="px-3 py-2 text-right text-mission-muted tabular-nums">
                    {{ row.secondary }}
                  </td>
                  <!-- Problem Cells -->
                  <td
                    v-for="problem in sortedProblems"
                    :key="problem._id"
                    class="px-1 py-2"
                  >
                    <div
                      class="mx-auto h-8 min-w-[3rem] px-1 rounded-lg flex items-center justify-center gap-0.5 text-xs tabular-nums"
                      :class="rankCellClass(row.problemStates[problem.code])"
                      :title="rankCellTitle(problemTitle(problem.letter, problem.fullName), row.problemStates[problem.code])"
                    >
                      <template v-if="rankingFormat === 'VNOJ' && row.problemStates[problem.code]?.attempted">
                        <span class="font-semibold">{{ row.problemStates[problem.code].points }}</span>
                        <span v-if="row.problemStates[problem.code].solved" class="text-[10px] opacity-70">{{ row.problemStates[problem.code].time }}′</span>
                        <span v-else-if="row.problemStates[problem.code].pending > 0" class="text-[10px] opacity-70">+{{ row.problemStates[problem.code].pending }}?</span>
                      </template>
                      <template v-else-if="row.problemStates[problem.code]?.solved">
                        <span class="font-semibold">{{ row.problemStates[problem.code].time }}′</span>
                        <span v-if="row.problemStates[problem.code].tries > 1" class="text-[10px] opacity-70">+{{ row.problemStates[problem.code].tries - 1 }}</span>
                      </template>
                      <span v-else-if="row.problemStates[problem.code]?.attempted" class="font-semibold">−{{ row.problemStates[problem.code].tries }}</span>
                      <span v-else class="w-1 h-1 rounded-full bg-white/15"></span>
                    </div>
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- PARTICIPANTS TAB -->
      <div v-show="activeTab === 'participants'" class="space-y-4">
        <!-- Search and filters -->
        <div class="flex flex-wrap items-center gap-2">
          <SearchInput
            v-model="participantSearch"
            placeholder="Search name or username"
            container-class="w-full md:w-72"
          />
          <ToggleButton v-model="unlinkedOnly" :label="`Unlinked only · ${unmappedParticipantsCount}`" />
          <div class="flex flex-wrap items-center gap-2 md:ml-auto">
            <RefreshButton
              :loading="syncingParticipants"
              label="Sync from VNOJ"
              @click="syncParticipants"
            />
            <button
              @click="quickMapAll"
              :disabled="quickMappingAll"
              class="btn-secondary"
              title="Link each unlinked participant to the contestant account with the same username"
            >
              <RotateCw
                v-if="quickMappingAll"
                :size="16"
                :stroke-width="2"
                class="animate-spin"
              />
              <Link2 v-else :size="16" :stroke-width="2" />
              <span>{{ quickMappingAll ? 'Linking…' : 'Auto-link by username' }}</span>
            </button>
            <button
              @click="showAddParticipantModal = true"
              class="btn-primary"
            >
              <UserPlus :size="16" :stroke-width="2" />
              Add participant
            </button>
          </div>
        </div>

        <!-- Participants Table -->
        <LoadingSpinner v-if="loadingParticipants" message="Loading participants…" container-class="py-16" />
        <EmptyState
          v-else-if="filteredParticipants.length === 0"
          icon="participants"
          :title="participants.length ? 'No participants match' : 'No participants yet'"
          :subtitle="participants.length ? 'Try another search or turn off “Unlinked only”.' : 'Sync from VNOJ or add participants by hand.'"
        />
        <MissionTable
          v-else
          :items="filteredParticipants"
          item-key="_id"
          grid-template-columns="minmax(0, 1.2fr) minmax(0, 1.4fr) minmax(220px, auto)"
          min-width="760px"
          row-class="hover:bg-white/[0.03]"
        >
          <template #header>
            <div>Participant</div>
            <div>Linked account</div>
            <div class="text-right">Actions</div>
          </template>
          <template #row="{ item: participant }">
            <div class="min-w-0">
              <div class="font-medium truncate">{{ participant.displayName }}</div>
              <div class="text-xs text-mission-muted truncate">
                {{ participant.username }}<template v-if="groupLabel(participant)"> · {{ groupLabel(participant) }}</template>
              </div>
            </div>
            <div class="min-w-0">
              <MissionSelect
                v-if="editingParticipant === participant._id"
                v-model="selectedUser[participant._id]"
                :options="availableUsers"
                :option-label="(user: any) => `${user.fullName} (${user.username})`"
                option-value="username"
                :disabled-options="(user: any) => isUserAlreadyMapped(user.username, participant._id)"
                placeholder="Choose an account"
              />
              <span v-else-if="participant.mapToUser" class="font-mono text-sm">{{ participant.mapToUser }}</span>
              <StatusBadge v-else variant="amber" text="Unlinked" />
            </div>
            <div class="flex items-center justify-end gap-2">
              <button
                v-if="editingParticipant === participant._id"
                @click="saveParticipantMapping(participant._id)"
                :disabled="linkingParticipant === participant._id"
                class="btn-primary !px-3 !py-1.5 text-xs"
              >
                {{ linkingParticipant === participant._id ? 'Saving…' : 'Save' }}
              </button>
              <button
                v-if="editingParticipant === participant._id"
                @click="cancelEditParticipant"
                class="btn-secondary !px-3 !py-1.5 text-xs"
              >
                Cancel
              </button>
              <button
                v-else
                @click="startEditParticipant(participant._id, participant.mapToUser)"
                class="btn-secondary !px-3 !py-1.5 text-xs"
              >
                {{ participant.mapToUser ? 'Change' : 'Link account' }}
              </button>
              <button
                v-if="participant.mapToUser && editingParticipant !== participant._id"
                @click="unlinkParticipant(participant._id)"
                :disabled="linkingParticipant === participant._id"
                class="btn-secondary !px-3 !py-1.5 text-xs"
              >
                Unlink
              </button>
              <button
                v-if="editingParticipant !== participant._id"
                @click="confirmDeleteParticipant(participant._id, participant.displayName)"
                class="p-1.5 rounded-lg text-mission-muted hover:text-mission-red hover:bg-mission-red/10 transition-colors"
                title="Remove participant"
              >
                <Trash2 :size="16" :stroke-width="2" />
              </button>
            </div>
          </template>
        </MissionTable>
      </div>

      <!-- PROBLEMS TAB -->
      <div v-show="activeTab === 'problems'">
        <LoadingSpinner v-if="loadingProblems" message="Loading problems…" container-class="py-16" />
        <EmptyState
          v-else-if="problems.length === 0"
          icon="problems"
          title="No problems yet"
          subtitle="Resync the contest to fetch its problems from VNOJ."
        />
        <MissionTable
          v-else
          :items="sortedProblems"
          item-key="_id"
          grid-template-columns="minmax(0, 1.2fr) minmax(240px, 1.4fr) 80px 90px minmax(140px, 1.2fr)"
          min-width="860px"
          row-class="hover:bg-white/[0.03]"
        >
          <template #header>
            <div>Problem</div>
            <div>Display name</div>
            <div class="text-right">{{ rankingFormat === 'VNOJ' ? 'Scored' : 'Solved' }}</div>
            <div class="text-right">Attempts</div>
            <div>{{ rankingFormat === 'VNOJ' ? 'Score rate' : 'AC rate' }}</div>
          </template>
          <template #row="{ item: problem }">
            <div class="flex items-center gap-3 min-w-0">
              <span class="min-w-[1.75rem] h-7 px-1.5 shrink-0 rounded-lg bg-mission-gray grid place-items-center text-xs font-semibold">
                {{ problem.letter }}
              </span>
              <div class="min-w-0">
                <div class="text-sm font-medium truncate">{{ problem.fullName }}</div>
                <div v-if="problem.fullName !== problem.code" class="font-mono text-xs text-mission-muted truncate">{{ problem.code }}</div>
              </div>
            </div>
            <div class="flex items-center gap-2 min-w-0">
              <input
                v-model="problemNameDrafts[problem._id]"
                type="text"
                :placeholder="problem.code"
                class="input-mission !py-1.5 min-w-0"
                @keyup.enter="saveProblemName(problem)"
              />
              <button
                @click="saveProblemName(problem)"
                :disabled="savingProblemId === problem._id || (problemNameDrafts[problem._id] ?? '').trim() === (problem.displayName ?? '')"
                class="btn-secondary !px-3 !py-1.5 text-xs shrink-0"
              >
                {{ savingProblemId === problem._id ? 'Saving…' : 'Save' }}
              </button>
            </div>
            <div class="text-right font-semibold tabular-nums">{{ problemStats(problem.code).solved }}</div>
            <div class="text-right text-mission-muted tabular-nums">{{ problemStats(problem.code).attempts }}</div>
            <div class="flex items-center gap-3">
              <div class="flex-1 h-1.5 rounded-full bg-mission-gray overflow-hidden">
                <div class="h-full bg-mission-ok" :style="{ width: `${problemStats(problem.code).rate}%` }"></div>
              </div>
              <span class="w-12 text-right text-xs text-mission-muted tabular-nums">{{ problemStats(problem.code).rate.toFixed(0) }}%</span>
            </div>
          </template>
        </MissionTable>
      </div>

      <!-- SUBMISSIONS TAB -->
      <div v-show="activeTab === 'submissions'" class="space-y-4">
        <!-- Filters -->
        <div class="flex flex-wrap items-center gap-2">
          <SearchInput
            v-model="submissionSearch"
            placeholder="Search username or problem"
            container-class="w-full md:w-72"
          />
          <FilterButtonGroup
            v-model="submissionStatusFilter"
            :options="mainVerdicts"
            :formatter="(v) => v === 'all' ? 'All' : v"
          />
          <MissionSelect
            :model-value="otherVerdicts.includes(submissionStatusFilter) ? submissionStatusFilter : null"
            @update:model-value="(v) => (submissionStatusFilter = v ?? 'all')"
            :options="otherVerdicts"
            :searchable="false"
            placeholder="Other verdicts"
            class="w-40"
          />
          <div class="flex items-center gap-3 md:ml-auto">
            <span class="text-sm text-mission-muted tabular-nums">{{ submissions.length }} of {{ totalSubmissions }}</span>
            <RefreshButton
              v-if="contestStatus === 'ongoing' || contestStatus === 'frozen'"
              :loading="loadingSubmissions"
              :label="autoRefresh ? 'Refresh · auto every 30s' : 'Refresh'"
              @click="refreshSubmissions"
            />
          </div>
        </div>

        <!-- Submissions Table -->
        <LoadingSpinner v-if="loadingSubmissions && submissions.length === 0" message="Loading submissions…" container-class="py-16" />
        <EmptyState
          v-else-if="submissions.length === 0"
          icon="submissions"
          title="No submissions found"
          :subtitle="submissionSearch || submissionStatusFilter !== 'all' ? 'Try another search or verdict.' : ''"
        />
        <MissionTable
          v-else
          :items="submissions"
          item-key="_id"
          grid-template-columns="90px minmax(0, 1.6fr) minmax(0, 1fr) 70px 60px 70px 90px 80px"
          min-width="880px"
          row-class="hover:bg-white/[0.03]"
        >
          <template #header>
            <div>Time</div>
            <div>Team</div>
            <div>Problem</div>
            <div>Verdict</div>
            <div class="text-right">Score</div>
            <div class="text-right">Penalty</div>
            <div class="text-center">Rank</div>
            <div class="text-center">Reaction</div>
          </template>
          <template #row="{ item: submission }">
            <div class="text-sm text-mission-muted tabular-nums" :title="formatFullDateTime(submission.submittedAt)">
              {{ formatClock(submission.submittedAt, true) }}
            </div>
            <div class="min-w-0">
              <div class="text-sm font-medium truncate">{{ participantsByUsername.get(submission.author)?.displayName || submission.author }}</div>
              <div
                v-if="participantsByUsername.get(submission.author)?.displayName !== submission.author"
                class="text-xs text-mission-muted truncate"
              >
                {{ submission.author }}
              </div>
            </div>
            <div class="flex items-center gap-2 min-w-0 text-sm">
              <span class="font-semibold shrink-0">{{ problemLabel(submission.problem_code) }}</span>
              <span class="text-xs text-mission-muted truncate" :title="submission.problem_code">{{ problemName(submission.problem_code) }}</span>
            </div>
            <div class="text-sm font-semibold" :class="getStatusClass(submission.submissionStatus)">
              {{ submission.submissionStatus }}
            </div>
            <div class="text-right text-sm tabular-nums">{{ submission.data.score }}</div>
            <div class="text-right text-sm text-mission-muted tabular-nums">{{ submission.data.penalty }}</div>
            <!-- Always show both ends of the move: holding a place is a
                 result too, and a blank cell reads as missing data. -->
            <div class="text-center text-sm tabular-nums">
              <span class="inline-flex items-center">
                <span class="text-mission-muted">{{ submission.data.old_rank }}</span>
                <ChevronRight :size="12" :stroke-width="2" class="mx-0.5 text-mission-muted" />
                <span
                  :class="submission.data.new_rank < submission.data.old_rank
                    ? 'text-mission-ok'
                    : submission.data.new_rank > submission.data.old_rank
                      ? 'text-mission-red'
                      : 'text-mission-muted'"
                >
                  {{ submission.data.new_rank }}
                </span>
              </span>
            </div>
            <div class="flex items-center justify-center gap-1">
              <!-- Quick view: only meaningful once a clip exists. -->
              <button
                v-if="submission.data.reaction"
                @click="openReactionPreview(submission)"
                title="Play the rendered reaction"
                class="p-1.5 rounded-lg text-mission-muted hover:text-gray-100 hover:bg-white/5 transition-colors"
              >
                <Play :size="14" :stroke-width="2" />
              </button>
              <span v-else-if="submission.submissionStatus !== 'AC'" class="text-mission-muted">—</span>
              <span v-else class="text-mission-muted" title="Not rendered yet">···</span>
              <!-- Regenerate: confirmed first, since it throws away the
                   existing clip and re-renders from the raw feeds. -->
              <button
                v-if="submission.submissionStatus === 'AC'"
                @click="askRegenerateSubmissionReaction(submission)"
                :disabled="regeneratingReactionIds.has(submission._id)"
                title="Render this reaction again"
                class="p-1.5 rounded-lg text-mission-muted hover:text-gray-100 hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCw
                  :size="14"
                  :stroke-width="2"
                  :class="{ 'animate-spin': regeneratingReactionIds.has(submission._id) }"
                />
              </button>
            </div>
          </template>
        </MissionTable>

        <!-- Pagination Controls -->
        <div v-if="totalPages > 1" class="flex flex-wrap items-center justify-between gap-3">
          <span class="text-sm text-mission-muted tabular-nums">Page {{ currentPage }} of {{ totalPages }}</span>

          <div class="flex items-center gap-1">
            <!-- Previous Button -->
            <button
              @click="prevPage"
              :disabled="currentPage === 1"
              class="btn-secondary !px-2.5 !py-1.5"
              title="Previous page"
            >
              <ChevronLeft :size="16" :stroke-width="2" />
            </button>

            <!-- Page Numbers -->
            <button
              v-for="(page, index) in getPageNumbers()"
              :key="`${page}-${index}`"
              @click="page !== '...' && goToPage(Number(page))"
              :disabled="page === '...'"
              class="min-w-[2rem] px-2 py-1.5 rounded-lg text-sm tabular-nums transition-colors"
              :class="page === currentPage
                ? 'bg-mission-accent text-mission-ink font-medium'
                : page === '...'
                ? 'text-mission-muted cursor-default'
                : 'text-mission-muted hover:text-gray-100 hover:bg-white/5'"
            >
              {{ page }}
            </button>

            <!-- Next Button -->
            <button
              @click="nextPage"
              :disabled="currentPage === totalPages"
              class="btn-secondary !px-2.5 !py-1.5"
              title="Next page"
            >
              <ChevronRight :size="16" :stroke-width="2" />
            </button>
          </div>
        </div>
      </div>

      <div v-show="activeTab === 'scoring'" class="max-w-3xl space-y-4">
        <section class="mission-card p-4 md:p-6 space-y-3">
          <h2 class="font-semibold">Ranking format</h2>
          <FilterButtonGroup
            :model-value="formatSelectValue"
            :options="FORMATS"
            :formatter="(f) => f === 'VNOJ' ? 'VNOJ · ranked by points' : 'ICPC · ranked by problems solved'"
            @update:model-value="selectFormat"
          />
          <p class="text-sm text-mission-muted">
            Changing the format immediately recomputes standings, ranks and the rank history of every submission.
          </p>
        </section>

        <section class="mission-card p-4 md:p-6 space-y-3">
          <h2 class="font-semibold">Penalty per attempt</h2>
          <div class="flex items-center gap-2 max-w-sm">
            <input
              v-model.number="penaltyInput"
              type="number"
              min="0"
              :disabled="savingScoring"
              class="input-mission tabular-nums"
              :placeholder="String(defaultPenalty)"
            />
            <span class="text-sm text-mission-muted whitespace-nowrap">minutes</span>
            <button
              class="btn-secondary shrink-0"
              :disabled="savingScoring || penaltyValue === (contest.penalty ?? null)"
              @click="applyPenalty"
            >
              {{ savingScoring ? 'Saving…' : 'Set' }}
            </button>
          </div>
          <p class="text-sm text-mission-muted">
            Every attempt before the first maximum-score submission is charged. Leave blank to use the
            format default ({{ defaultPenalty }} minutes for {{ formatSelectValue }}).
          </p>
        </section>

        <section v-if="formatSelectValue === 'VNOJ'" class="mission-card p-4 md:p-6 space-y-3">
          <div class="flex flex-wrap items-center gap-3">
            <h2 class="font-semibold flex-1">Last submission only</h2>
            <ToggleButton
              :model-value="contest.lso === true"
              :label="contest.lso ? 'On' : 'Off'"
              :disabled="savingScoring"
              @update:model-value="applyLso"
            />
          </div>
          <p class="text-sm text-mission-muted">
            Cumulative time counts only the latest scoring submission instead of the sum across problems.
            Penalties still apply.
          </p>
        </section>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <MissionModal
      :show="showDeleteModal"
      title="Delete contest"
      :loading="deleting"
      :error="deleteError"
      max-width="md"
      @close="closeDeleteModal"
    >
      <div class="space-y-4 text-sm">
        <p class="text-gray-300">
          This permanently deletes <span class="font-mono text-gray-100">{{ contest?.code }}</span> and everything synced for it:
        </p>

        <ul class="list-disc pl-5 space-y-1 text-mission-muted">
          <li>{{ participants.length }} participants</li>
          <li>{{ totalSubmissions }} submissions</li>
          <li>{{ problems.length }} problems</li>
          <li>Contest details and settings</li>
        </ul>

        <p class="text-mission-red">This can't be undone.</p>

        <div class="space-y-2">
          <label for="delete-confirm" class="tech-label block">
            Type <span class="font-mono text-gray-100">{{ contest?.code }}</span> to confirm
          </label>
          <input
            id="delete-confirm"
            v-model="deleteConfirmText"
            type="text"
            :placeholder="contest?.code"
            class="input-mission font-mono"
            autocomplete="off"
            @keyup.enter="deleteConfirmText === contest?.code && handleDeleteContest()"
          />
        </div>
      </div>

      <template #actions>
        <button
          type="button"
          @click="closeDeleteModal"
          :disabled="deleting"
          class="btn-secondary"
        >
          Cancel
        </button>
        <button
          type="button"
          @click="handleDeleteContest"
          :disabled="deleting || deleteConfirmText !== contest?.code"
          class="btn-danger"
        >
          <RotateCw
            v-if="deleting"
            :size="16"
            :stroke-width="2"
            class="animate-spin"
          />
          <Trash2 v-else :size="16" :stroke-width="2" />
          <span>{{ deleting ? 'Deleting…' : 'Delete contest' }}</span>
        </button>
      </template>
    </MissionModal>

    <!-- Add Participant Modal -->
    <MissionModal
      :show="showAddParticipantModal"
      title="Add participants"
      :loading="addingParticipant"
      :error="addParticipantError"
      max-width="2xl"
      @close="closeAddParticipantModal"
    >
      <div class="space-y-5">
        <!-- Mode Selection -->
        <div class="space-y-2">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="mode in ADD_MODES"
              :key="mode.id"
              type="button"
              @click="addParticipantMode = mode.id"
              class="px-3 py-1.5 border rounded-full text-sm transition-colors"
              :class="addParticipantMode === mode.id
                ? 'border-gray-100 bg-gray-100 text-mission-ink'
                : 'border-white/10 bg-mission-dark text-mission-muted hover:text-gray-100'"
            >
              {{ mode.label }}
            </button>
          </div>
          <p class="text-sm text-mission-muted">
            {{ ADD_MODES.find(m => m.id === addParticipantMode)?.hint }}
          </p>
        </div>

        <!-- Modal Body -->
        <!-- Mode: Existing User -->
        <div v-if="addParticipantMode === 'existing_user'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="tech-label mb-2 block">VNOJ username</label>
            <input
              v-model="newParticipant.participantUsername"
              type="text"
              placeholder="e.g. team_hanoi_01"
              class="input-mission font-mono"
            />
          </div>

          <div>
            <label class="tech-label mb-2 block">Account</label>
            <MissionSelect
              v-model="newParticipant.userId"
              :options="availableUsers"
              :option-label="(user: any) => `${user.fullName} (${user.username})`"
              option-value="username"
              placeholder="Choose an account"
            />
          </div>
        </div>

        <!-- Mode: CSV Import -->
        <div v-if="addParticipantMode === 'csv_import'" class="space-y-2">
          <label class="tech-label block">CSV rows: VNOJ username, account username</label>
          <textarea
            v-model="newParticipant.csvData"
            rows="8"
            placeholder="john_vnoj,john&#10;jane_vnoj,jane"
            class="input-mission font-mono resize-y"
          ></textarea>
          <p class="text-xs text-mission-muted tabular-nums">
            {{ (newParticipant.csvData || '').split('\n').filter(l => l.trim()).length }} rows
          </p>
        </div>

        <!-- Mode: Create User -->
        <div v-if="addParticipantMode === 'create_user'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="tech-label mb-2 block">VNOJ username</label>
            <input
              v-model="newParticipant.participantUsername"
              type="text"
              placeholder="VNOJ username"
              class="input-mission font-mono"
            />
          </div>

          <div>
            <label class="tech-label mb-2 block">Account username</label>
            <input
              v-model="newParticipant.backendUsername"
              type="text"
              placeholder="Account username"
              class="input-mission font-mono"
            />
          </div>

          <div>
            <label class="tech-label mb-2 block">Full name</label>
            <input
              v-model="newParticipant.fullName"
              type="text"
              placeholder="Full name"
              class="input-mission"
            />
          </div>

          <div>
            <label class="tech-label mb-2 block">Password</label>
            <input
              v-model="newParticipant.password"
              type="password"
              placeholder="Password"
              class="input-mission"
              autocomplete="new-password"
            />
          </div>
        </div>

        <!-- Mode: Auto Create User -->
        <div v-if="addParticipantMode === 'auto_create_user'" class="rounded-xl bg-mission-gray p-4 text-sm space-y-1">
          <div>
            <span class="text-2xl font-semibold tabular-nums">{{ unmappedParticipantsCount }}</span>
            <span class="text-mission-muted"> unlinked participants will get a new account with a random password.</span>
          </div>
          <p class="text-mission-muted">The passwords are shown once, right after creation. Copy them before closing.</p>
        </div>

        <!-- Success Stats (after submission) -->
        <div v-if="addParticipantResult" class="space-y-3">
          <div class="rounded-xl bg-mission-ok/10 px-4 py-3 text-sm flex flex-wrap items-center gap-x-4 gap-y-1">
            <span class="flex items-center gap-2 text-mission-ok font-medium">
              <Check :size="16" :stroke-width="2" />
              Done
            </span>
            <span class="tabular-nums"><span class="font-semibold">{{ addParticipantResult.added }}</span> <span class="text-mission-muted">added</span></span>
            <span class="tabular-nums"><span class="font-semibold">{{ addParticipantResult.skipped }}</span> <span class="text-mission-muted">skipped</span></span>
            <span class="tabular-nums"><span class="font-semibold">{{ addParticipantResult.total }}</span> <span class="text-mission-muted">total</span></span>
          </div>

          <!-- Error details -->
          <div v-if="addParticipantResult.errors && addParticipantResult.errors.length > 0" class="rounded-xl bg-mission-amber/10 px-4 py-3 text-sm">
            <div class="font-medium text-mission-amber mb-2">
              {{ addParticipantResult.errors.length }} {{ addParticipantResult.errors.length === 1 ? 'issue' : 'issues' }}
            </div>
            <ul class="max-h-32 overflow-y-auto space-y-1 text-mission-amber/90 list-disc pl-5">
              <li
                v-for="(error, index) in addParticipantResult.errors"
                :key="index"
              >
                {{ error }}
              </li>
            </ul>
          </div>

          <!-- Generated Credentials (for auto_create_user mode) -->
          <div v-if="addParticipantResult.generatedCredentials && addParticipantResult.generatedCredentials.length > 0" class="rounded-xl border border-white/[0.06] overflow-hidden">
            <div class="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
              <span class="text-sm font-medium">
                New accounts · {{ addParticipantResult.generatedCredentials.length }}
              </span>
              <button
                @click="copyCredentialsToClipboard"
                class="btn-secondary !px-3 !py-1.5 text-xs"
              >
                Copy all
              </button>
            </div>
            <div class="max-h-48 overflow-y-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-xs text-mission-muted border-b border-white/[0.06]">
                    <th class="text-left font-medium px-4 py-2">Username</th>
                    <th class="text-left font-medium px-4 py-2">Password</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/[0.06]">
                  <tr
                    v-for="cred in addParticipantResult.generatedCredentials"
                    :key="cred.username"
                  >
                    <td class="px-4 py-2 font-mono">{{ cred.username }}</td>
                    <td class="px-4 py-2 font-mono">{{ cred.password }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <template #actions>
        <button
          type="button"
          @click="closeAddParticipantModal"
          :disabled="addingParticipant"
          class="btn-secondary"
        >
          {{ addParticipantResult ? 'Close' : 'Cancel' }}
        </button>
        <button
          v-if="!addParticipantResult"
          type="button"
          @click="handleAddParticipants"
          :disabled="addingParticipant || !canSubmitParticipant"
          class="btn-primary"
        >
          <RotateCw
            v-if="addingParticipant"
            :size="16"
            :stroke-width="2"
            class="animate-spin"
          />
          <span>{{ addingParticipant ? 'Working…' : ADD_MODES.find(m => m.id === addParticipantMode)?.action }}</span>
        </button>
      </template>
    </MissionModal>

    <!-- Delete Participant Confirmation Modal -->
    <MissionModal
      :show="showDeleteParticipantModal"
      title="Remove participant"
      :loading="deletingParticipant"
      max-width="md"
      @close="closeDeleteParticipantModal"
    >
      <p class="text-sm text-gray-300">
        Remove <span class="font-medium text-gray-100">{{ participantToDelete?.displayName }}</span> from this contest? This can't be undone.
      </p>
      <template #actions>
        <button
          @click="closeDeleteParticipantModal"
          :disabled="deletingParticipant"
          class="btn-secondary"
        >
          Cancel
        </button>
        <button
          @click="handleDeleteParticipant"
          :disabled="deletingParticipant"
          class="btn-danger"
        >
          {{ deletingParticipant ? 'Removing…' : 'Remove' }}
        </button>
      </template>
    </MissionModal>

    <!-- Change Format Confirmation Modal -->
    <MissionModal
      :show="showFormatConfirm"
      title="Change contest format"
      :loading="savingFormat"
      max-width="lg"
      @close="cancelFormatChange"
    >
      <div class="space-y-4 text-sm">
        <div class="rounded-xl bg-mission-amber/10 px-4 py-3 text-mission-amber">
          This contest is {{ contestStatusBadge(contestStatus).text.toLowerCase() }}.
        </div>
        <p class="text-gray-300">
          Switching <span class="font-mono text-gray-100">{{ contest?.code }}</span> from
          {{ contest?.format ?? 'ICPC' }} to {{ pendingFormat }}
          immediately recomputes participant standings, ranks and every submission's rank
          history under different ranking rules. This can visibly reshuffle the live leaderboard
          and may take a moment for large contests.
        </p>
      </div>
      <template #actions>
        <button
          type="button"
          @click="cancelFormatChange"
          :disabled="savingFormat"
          class="btn-secondary"
        >
          Cancel
        </button>
        <button
          type="button"
          @click="confirmFormatChange"
          :disabled="savingFormat"
          class="btn-primary"
        >
          <RotateCw
            v-if="savingFormat"
            :size="16"
            :stroke-width="2"
            class="animate-spin"
          />
          <span>{{ savingFormat ? 'Applying…' : `Switch to ${pendingFormat}` }}</span>
        </button>
      </template>
    </MissionModal>

    <!-- Quick view of a rendered reaction -->
    <MissionModal
      :show="previewSubmission !== null"
      :title="previewSubmission ? `Reaction · ${previewSubmission.author} · ${problemTitleOf(previewSubmission.problem_code)}` : ''"
      max-width="sm"
      :show-actions="false"
      @close="closeReactionPreview"
    >
      <div v-if="previewSubmission">
        <video
          :src="previewSubmission.data.reaction"
          class="w-full rounded-xl bg-black"
          controls
          autoplay
          playsinline
        />
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-sm">
          <dt class="tech-label">Rank change</dt>
          <dd class="tabular-nums">
            {{ previewSubmission.data.old_rank }} → {{ previewSubmission.data.new_rank }}
          </dd>
          <dt class="tech-label">Score</dt>
          <dd class="tabular-nums">{{ previewSubmission.data.score }}</dd>
          <dt class="tech-label">Submitted</dt>
          <dd class="tabular-nums">{{ formatFullDateTime(previewSubmission.submittedAt) }}</dd>
        </dl>
        <div class="flex gap-3 pt-4">
          <a
            :href="previewSubmission.data.reaction"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-secondary flex-1"
          >
            Open in new tab
          </a>
        </div>
      </div>
    </MissionModal>

    <!-- Confirmation for a single re-render -->
    <MissionModal
      :show="regenTarget !== null"
      title="Regenerate reaction"
      max-width="lg"
      confirm-text="Regenerate"
      cancel-text="Cancel"
      loading-text="Queueing…"
      :loading="regenTarget !== null && regeneratingReactionIds.has(regenTarget._id)"
      @confirm="confirmRegenerateSubmissionReaction"
      @close="regenTarget = null"
    >
      <div v-if="regenTarget" class="space-y-4 text-sm">
        <p class="text-gray-300">
          Queue a fresh render for
          <span class="font-medium text-gray-100">{{ regenTarget.author }}</span> on
          <span class="font-medium text-gray-100">{{ problemTitleOf(regenTarget.problem_code) }}</span>?
        </p>
        <ul class="list-disc pl-5 space-y-1 text-mission-muted">
          <li>The stored clip is discarded and rendered again from the raw feeds.</li>
          <li>It will use the current rank change {{ regenTarget.data.old_rank }} → {{ regenTarget.data.new_rank }}.</li>
        </ul>
      </div>
    </MissionModal>

    <!-- Confirmation for the contest-wide re-render -->
    <MissionModal
      :show="showRegenAllConfirm"
      title="Regenerate all reactions"
      max-width="lg"
      confirm-text="Regenerate all"
      cancel-text="Cancel"
      loading-text="Queueing…"
      :loading="regeneratingAllReactions"
      @confirm="confirmRegenerateAllReactions"
      @close="showRegenAllConfirm = false"
    >
      <div class="space-y-4 text-sm">
        <p class="text-gray-300">
          Queue a fresh render for every accepted submission in
          <span class="font-mono text-gray-100">{{ contest?.code }}</span>.
        </p>
        <ul class="list-disc pl-5 space-y-1 text-mission-muted">
          <li>{{ acceptedSubmissionCount }} accepted {{ acceptedSubmissionCount === 1 ? 'submission' : 'submissions' }} on the loaded page.</li>
          <li>Every stored clip is discarded. Rendering runs one at a time and can take a while.</li>
        </ul>
      </div>
    </MissionModal>

    <!-- On-screen record of what was queued, so the outcome outlives the toast -->
    <Teleport to="body">
      <div
        v-if="reactionLog.length > 0"
        class="fixed bottom-4 right-4 z-40 w-96 max-w-[calc(100vw-2rem)] mission-card overflow-hidden shadow-2xl"
      >
        <div class="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
          <span class="text-sm font-medium">Reaction activity</span>
          <button
            @click="reactionLog = []"
            class="p-1 rounded-lg text-mission-muted hover:text-gray-100 hover:bg-white/5 transition-colors"
            title="Clear"
          >
            <X :size="14" :stroke-width="2" />
          </button>
        </div>
        <div class="max-h-48 overflow-y-auto divide-y divide-white/[0.06]">
          <div
            v-for="entry in reactionLog"
            :key="entry.id"
            class="px-4 py-2 text-xs flex gap-2"
            :class="entry.ok ? 'text-gray-300' : 'text-mission-red'"
          >
            <span class="text-mission-muted tabular-nums shrink-0">{{ entry.time }}</span>
            <span>{{ entry.message }}</span>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useContestsStore } from '~/stores/contests';
import type { ContestEntity, SubmissionEntity, ProblemEntity } from '~/stores/contests';
import { internalApi, internalClient } from '~/services/api';
import type { UserEntity, ParticipantResponse } from '@libs/api/internal';
import { useToast } from 'vue-toastification';
import { RotateCw, Trash2, UserPlus, AlertCircle, Check, ChevronRight, ChevronLeft, Link2, Calculator, Video, Play, X } from 'lucide-vue-next';
import { contestStatusBadge, formatClock, formatFullDateTime, formatSchedule } from '~/composables/useContestDisplay';
import {
  type ProblemState,
  type RankingFormat,
  buildProblemState,
  primaryLabel,
  primaryMetric,
  resolveFormat,
  secondaryLabel,
  secondaryMetric,
} from '~/common/ranking';
import { labelProblems, problemTitle } from '~/utils/problemName';

type AddMode = 'existing_user' | 'csv_import' | 'create_user' | 'auto_create_user';
const ADD_MODES: { id: AddMode; label: string; hint: string; action: string }[] = [
  { id: 'existing_user', label: 'Link existing user', hint: 'Add one VNOJ participant and link it to an account that already exists.', action: 'Add participant' },
  { id: 'csv_import', label: 'Import CSV', hint: 'Add many participants at once, one row per participant.', action: 'Import' },
  { id: 'create_user', label: 'Create new user', hint: 'Create a new account and add it as a participant.', action: 'Create and add' },
  { id: 'auto_create_user', label: 'Create accounts for unlinked', hint: 'Create an account for every participant that has no linked account yet.', action: 'Create accounts' },
];

const ALL_VERDICTS = ['AC', 'PAC', 'WA', 'TLE', 'RTE', 'CE', 'RE', 'MLE', 'OLE', 'IR', 'SC', 'IE', 'AB', 'PENDING', 'UNKNOWN'];
const FORMATS: RankingFormat[] = ['ICPC', 'VNOJ'];

const route = useRoute();
const router = useRouter();
const contestsStore = useContestsStore();
const toast = useToast();

// State
const loading = ref(false);
const loadingParticipants = ref(false);
const loadingSubmissions = ref(false);
const loadingProblems = ref(false);
const error = ref('');
const contest = ref<ContestEntity | null>(null);
const participants = ref<ParticipantResponse[]>([]);
const submissions = ref<SubmissionEntity[]>([]);
const problems = ref<ProblemEntity[]>([]);
const availableUsers = ref<UserEntity[]>([]);

// Draft display-name values per problem (keyed by _id) for the Problems tab editor.
const problemNameDrafts = ref<Record<string, string>>({});
const savingProblemId = ref<string | null>(null);
const savingFormat = ref(false);
const formatSelectValue = ref<'ICPC' | 'VNOJ'>('ICPC');
const pendingFormat = ref<'ICPC' | 'VNOJ' | null>(null);
const showFormatConfirm = ref(false);

const savingScoring = ref(false);
// null means "unset" — the contest falls back to the format's default penalty.
const penaltyInput = ref<number | '' | null>(null);
const penaltyValue = computed(() => (penaltyInput.value === '' ? null : penaltyInput.value));

// Judge defaults: ICPC charges 20 minutes per attempt, VNOJ only 5.
const defaultPenalty = computed(() => (formatSelectValue.value === 'VNOJ' ? 5 : 20));

// Keep the dropdown in sync with the loaded contest's actual format.
watch(
  () => contest.value?.format,
  (fmt) => {
    formatSelectValue.value = (fmt ?? 'ICPC') as 'ICPC' | 'VNOJ';
  },
  { immediate: true },
);

watch(
  () => contest.value?.penalty,
  (penalty) => {
    penaltyInput.value = penalty ?? null;
  },
  { immediate: true },
);

// Tab state
const validTabs = ['ranking', 'participants', 'problems', 'submissions', 'scoring'] as const;
type TabType = typeof validTabs[number];

// Initialize activeTab from URL query parameter
const getInitialTab = (): TabType => {
  const tabFromQuery = route.query.tab as string;
  if (tabFromQuery && validTabs.includes(tabFromQuery as TabType)) {
    return tabFromQuery as TabType;
  }
  return 'ranking';
};

const activeTab = ref<TabType>(getInitialTab());
const tabs = computed<{ id: TabType; label: string; count?: number }[]>(() => [
  { id: 'ranking', label: 'Ranking' },
  { id: 'participants', label: 'Participants', count: participants.value.length },
  { id: 'problems', label: 'Problems', count: problems.value.length },
  { id: 'submissions', label: 'Submissions', count: totalSubmissions.value },
  { id: 'scoring', label: 'Scoring' },
]);

// Participant state
const participantSearch = ref('');
const unlinkedOnly = ref(false);
const editingParticipant = ref<string | null>(null);
const selectedUser = ref<Record<string, string>>({});
const linkingParticipant = ref<string | null>(null);
const syncingParticipants = ref(false);

// Resync state
const resyncingContest = ref(false);
const forceSyncingSubmissions = ref(false);
const recalculatingData = ref(false);
const regeneratingAllReactions = ref(false);
// Per-row spinner state, so queueing one submission does not lock the others.
const regeneratingReactionIds = ref(new Set<string>());
const previewSubmission = ref<SubmissionEntity | null>(null);
const regenTarget = ref<SubmissionEntity | null>(null);
const showRegenAllConfirm = ref(false);
// Toasts vanish; re-rendering is slow enough that the operator wants a record
// of what they queued while it runs.
const reactionLog = ref<{ id: number; time: string; message: string; ok: boolean }[]>([]);
let reactionLogSeq = 0;

const acceptedSubmissionCount = computed(
  () => submissions.value.filter((submission) => submission.submissionStatus === 'AC').length,
);

function logReaction(message: string, ok = true) {
  reactionLog.value = [
    { id: ++reactionLogSeq, time: new Date().toLocaleTimeString(), message, ok },
    ...reactionLog.value,
  ].slice(0, 50);
}

// Submission state
const submissionSearch = ref('');
const submissionStatusFilter = ref<string>('all');
const autoRefresh = ref(false);
const currentPage = ref(1);
const pageSize = ref(100);
const totalSubmissions = ref(0);
const totalPages = ref(0);
let refreshInterval: NodeJS.Timeout | null = null;

// Delete modal state
const showDeleteModal = ref(false);
const deleting = ref(false);
const deleteError = ref('');
const deleteConfirmText = ref('');

// Add participant modal state
const showAddParticipantModal = ref(false);
const addParticipantMode = ref<AddMode>('existing_user');
const addingParticipant = ref(false);
const addParticipantError = ref('');
const addParticipantResult = ref<{added: number; skipped: number; total: number; errors: string[]; generatedCredentials?: {username: string; password: string}[]} | null>(null);
const newParticipant = ref({
  participantUsername: '',
  userId: '',
  csvData: '',
  backendUsername: '',
  fullName: '',
  password: '',
});

// Quick map all state
const quickMappingAll = ref(false);

// Delete participant modal state
const showDeleteParticipantModal = ref(false);
const deletingParticipant = ref(false);
const participantToDelete = ref<{id: string; displayName: string} | null>(null);

// Computed
const contestStatus = computed(() => {
  if (!contest.value) return 'unknown';
  return contestsStore.getContestStatus(contest.value);
});

const filteredParticipants = computed(() => {
  const pool = unlinkedOnly.value ? participants.value.filter(p => !p.mapToUser) : participants.value;
  if (!participantSearch.value) return pool;
  const query = participantSearch.value.toLowerCase();
  return pool.filter(p =>
    p.displayName.toLowerCase().includes(query) ||
    p.username.toLowerCase().includes(query) ||
    (p.mapToUser && p.mapToUser.toLowerCase().includes(query))
  );
});

const participantsByUsername = computed(() => new Map(participants.value.map(p => [p.username, p])));

function groupLabel(participant: ParticipantResponse): string {
  return participant.groupName || participant.groupCode || '';
}

// Count of participants without mapped users
const unmappedParticipantsCount = computed(() => {
  return participants.value.filter(p => !p.mapToUser).length;
});

const canSubmitParticipant = computed(() => {
  if (addParticipantMode.value === 'existing_user') {
    return newParticipant.value.participantUsername && newParticipant.value.userId;
  } else if (addParticipantMode.value === 'csv_import') {
    return newParticipant.value.csvData && newParticipant.value.csvData.trim().length > 0;
  } else if (addParticipantMode.value === 'create_user') {
    return (
      newParticipant.value.participantUsername &&
      newParticipant.value.backendUsername &&
      newParticipant.value.fullName &&
      newParticipant.value.password
    );
  } else if (addParticipantMode.value === 'auto_create_user') {
    return unmappedParticipantsCount.value > 0;
  }
  return false;
});

// Ranking computed - sorted problems for header
const sortedProblems = computed(() => labelProblems(problems.value));

const problemByCode = computed(() => new Map(sortedProblems.value.map((p) => [p.code, p])));

function problemName(code: string): string {
  return problemByCode.value.get(code)?.fullName ?? code;
}

function problemLabel(code: string): string {
  return problemByCode.value.get(code)?.letter ?? code;
}

function problemTitleOf(code: string): string {
  return problemTitle(problemLabel(code), problemName(code));
}

// Ranking format for this contest (VNOJ: score/time; ICPC: solved/penalty).
const rankingFormat = computed<RankingFormat>(() => resolveFormat(contest.value ?? participants.value[0]));

const mainVerdicts = computed(() =>
  rankingFormat.value === 'VNOJ' ? ['all', 'AC', 'PAC', 'WA', 'TLE', 'RTE', 'CE'] : ['all', 'AC', 'WA', 'TLE', 'RTE', 'CE'],
);
const otherVerdicts = computed(() => ALL_VERDICTS.filter((v) => !mainVerdicts.value.includes(v)));

const problemStatsByCode = computed(() => {
  const fmt = rankingFormat.value;
  const stats = new Map<string, { solved: number; attempts: number; rate: number }>();
  for (const problem of sortedProblems.value) {
    let solved = 0;
    let attempts = 0;
    for (const participant of participants.value) {
      const state = buildProblemState(participant, problem.code, fmt);
      if (state.solved) solved++;
      attempts += state.tries;
    }
    stats.set(problem.code, { solved, attempts, rate: attempts ? (solved / attempts) * 100 : 0 });
  }
  return stats;
});

function problemStats(code: string) {
  return problemStatsByCode.value.get(code) ?? { solved: 0, attempts: 0, rate: 0 };
}

function rankCellClass(cell: ProblemState | undefined): string {
  if (cell?.solved) return 'bg-mission-ok/15 text-mission-ok';
  if (cell?.pending) return 'bg-mission-amber/15 text-mission-amber';
  if (cell?.attempted) return 'bg-mission-red/15 text-mission-red';
  return '';
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function rankCellTitle(label: string, cell: ProblemState | undefined): string {
  if (!cell?.attempted) return `${label}: not tried`;
  const pending = cell.pending ? `, ${cell.pending} pending` : '';
  if (rankingFormat.value === 'VNOJ') {
    if (cell.solved) {
      const earlier = cell.tries - 1;
      return `${label}: ${plural(cell.points, 'point', 'points')} at ${cell.time}′${earlier ? ` after ${plural(earlier, 'earlier try', 'earlier tries')}` : ''}${pending}`;
    }
    return `${label}: 0 points${cell.tries ? ` after ${plural(cell.tries, 'try', 'tries')}` : ''}${pending}`;
  }
  if (cell.solved) {
    const wrong = cell.tries - 1;
    return `${label}: solved at ${cell.time}′${wrong ? ` after ${plural(wrong, 'wrong try', 'wrong tries')}` : ''}`;
  }
  return `${label}: ${plural(cell.tries, 'wrong try', 'wrong tries')}`;
}

// Ranking computed - participants ordered by the server-computed rank (which is
// already format-aware), enriched with per-problem display state.
const rankingData = computed(() => {
  const fmt = rankingFormat.value;
  // Order by stored rank (falls back to index for un-ranked participants).
  const sorted = [...participants.value].sort(
    (a, b) => (a.rank || Number.MAX_SAFE_INTEGER) - (b.rank || Number.MAX_SAFE_INTEGER),
  );

  return sorted.map((participant, index) => {
    const problemStates: Record<string, ProblemState> = {};
    for (const problem of sortedProblems.value) {
      problemStates[problem.code] = buildProblemState(participant, problem.code, fmt);
    }

    return {
      rank: participant.rank || index + 1,
      participant,
      primary: primaryMetric(participant, fmt),
      secondary: secondaryMetric(participant, fmt),
      problemStates,
    };
  });
});

// Methods
// Unused - may be needed for future features
// function formatDateTime(date: string | Date): string {
//   const d = new Date(date);
//   const now = new Date();
//   const diff = now.getTime() - d.getTime();
//   const minutes = Math.floor(diff / 60000);
//   const hours = Math.floor(minutes / 60);
//   const days = Math.floor(hours / 24);
//
//   if (days > 0) return `${days}d ${hours % 24}h ago`;
//   if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
//   if (minutes > 0) return `${minutes}m ago`;
//   return 'Just now';
// }

// Unused - may be needed for future features
// function formatTime(date: string | Date): string {
//   const d = new Date(date);
//   const hours = d.getHours().toString().padStart(2, '0');
//   const minutes = d.getMinutes().toString().padStart(2, '0');
//   const seconds = d.getSeconds().toString().padStart(2, '0');
//   return `${hours}:${minutes}:${seconds}`;
// }

function getStatusClass(status: string): string {
  const classes: Record<string, string> = {
    'AC': 'text-mission-ok',
    'PAC': 'text-mission-cyan',
    'WA': 'text-mission-red',
    'RTE': 'text-mission-red',
    'RE': 'text-mission-red',
    'IR': 'text-mission-red',
    'OLE': 'text-mission-amber',
    'MLE': 'text-mission-amber',
    'TLE': 'text-mission-amber',
    'SC': 'text-mission-amber',
    'CE': 'text-mission-amber',
    'IE': 'text-mission-muted',
    'AB': 'text-mission-muted',
    'PENDING': 'text-mission-amber',
    'UNKNOWN': 'text-mission-cyan',
  };
  return classes[status] || 'text-mission-muted';
}

// Tab navigation
function changeTab(tab: TabType) {
  router.push({
    query: { ...route.query, tab },
  });
}

// Watch for URL changes and update activeTab
watch(() => route.query.tab, (newTab) => {
  if (newTab && validTabs.includes(newTab as TabType)) {
    activeTab.value = newTab as TabType;
  } else if (!newTab) {
    activeTab.value = 'ranking';
  }
});

async function loadContest() {
  loading.value = true;
  error.value = '';

  try {
    const code = route.params.code as string;
    const data = await internalApi.contest.findOne(code);
    contest.value = data;
    contestsStore.setCurrentContest(data);
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to load contest details';
    toast.error(error.value);
    console.error('Load contest error:', err);
  } finally {
    loading.value = false;
  }
}

async function loadParticipants() {
  if (!contest.value) return;
  loadingParticipants.value = true;

  try {
    const data = await internalApi.contest.getParticipants(contest.value.code);
    participants.value = data;
    contestsStore.setParticipants(data);
  } catch (err: any) {
    toast.error('Failed to load participants');
    console.error('Load participants error:', err);
  } finally {
    loadingParticipants.value = false;
  }
}

async function loadSubmissions() {
  if (!contest.value) return;
  loadingSubmissions.value = true;

  try {
    const queryParams: {
      page: number;
      limit: number;
      search?: string;
      status?:
        | 'AC'
        | 'PAC'
        | 'WA'
        | 'RTE'
        | 'RE'
        | 'IR'
        | 'OLE'
        | 'MLE'
        | 'TLE'
        | 'SC'
        | 'IE'
        | 'AB'
        | 'CE'
        | 'PENDING'
        | 'UNKNOWN';
    } = {
      page: currentPage.value,
      limit: pageSize.value,
    };

    // Add search parameter
    if (submissionSearch.value) {
      queryParams.search = submissionSearch.value;
    }

    // Add status filter parameter
    if (submissionStatusFilter.value && submissionStatusFilter.value !== 'all') {
      queryParams.status = submissionStatusFilter.value as any;
    }

    const response = await internalApi.contest.getSubmissions(contest.value.code, queryParams);

    // Handle paginated response
    submissions.value = response.data as any[];
    totalSubmissions.value = response.pagination.total;
    totalPages.value = response.pagination.totalPages;

    contestsStore.setSubmissions(response.data as any[]);
    return true;
  } catch (err: any) {
    toast.error('Failed to load submissions');
    console.error('Load submissions error:', err);
    return false;
  } finally {
    loadingSubmissions.value = false;
  }
}

async function loadProblems() {
  if (!contest.value) return;
  loadingProblems.value = true;

  try {
    const data = await internalApi.contest.getProblems(contest.value.code);
    problems.value = data;
    contestsStore.setProblems(data);
    // Seed the editor drafts with the current display names.
    problemNameDrafts.value = Object.fromEntries(
      (data as ProblemEntity[]).map((problem) => [problem._id, problem.displayName ?? '']),
    );
  } catch (err: any) {
    toast.error('Failed to load problems');
    console.error('Load problems error:', err);
  } finally {
    loadingProblems.value = false;
  }
}

async function saveProblemName(problem: ProblemEntity) {
  if (!contest.value) return;
  const draft = (problemNameDrafts.value[problem._id] ?? '').trim();
  if (draft === (problem.displayName ?? '')) return;

  savingProblemId.value = problem._id;
  try {
    await internalApi.contest.updateProblem(contest.value.code, problem.code, {
      displayName: draft,
    });
    // Reflect the change locally without a full reload.
    const updated = problems.value.map((p) => (p._id === problem._id ? { ...p, displayName: draft || undefined } : p));
    problems.value = updated;
    contestsStore.setProblems(updated);
    problemNameDrafts.value[problem._id] = draft;
    toast.success(draft ? `Renamed ${problem.code} to ${draft}` : `Cleared the display name of ${problem.code}`);
  } catch (err: any) {
    toast.error('Failed to update problem name');
    console.error('Update problem name error:', err);
  } finally {
    savingProblemId.value = null;
  }
}

function selectFormat(format: RankingFormat) {
  if (savingFormat.value) return;
  formatSelectValue.value = format;
  onFormatChange();
}

function onFormatChange() {
  if (!contest.value) return;
  const target = formatSelectValue.value;
  const current = (contest.value.format ?? 'ICPC') as 'ICPC' | 'VNOJ';
  if (target === current) return;

  // Live contests (ongoing/frozen) get a confirmation step because switching
  // format visibly reshuffles the leaderboard on the next sync.
  const isLive = contestStatus.value === 'ongoing' || contestStatus.value === 'frozen';
  if (isLive) {
    pendingFormat.value = target;
    showFormatConfirm.value = true;
    return;
  }

  applyFormat(target);
}

function confirmFormatChange() {
  if (pendingFormat.value) applyFormat(pendingFormat.value);
}

function cancelFormatChange() {
  // Revert the dropdown to the contest's actual format.
  formatSelectValue.value = (contest.value?.format ?? 'ICPC') as 'ICPC' | 'VNOJ';
  pendingFormat.value = null;
  showFormatConfirm.value = false;
}

/**
 * Push a scoring-rule change. The API recomputes standings, ranks and the
 * per-submission rank history itself, so reload both lists afterwards.
 */
async function applyScoringChange(updates: { penalty?: number | null; lso?: boolean }, label: string) {
  if (!contest.value) return;

  savingScoring.value = true;
  try {
    const updated = await internalApi.contest.update(
      contest.value.code,
      updates as Parameters<typeof internalApi.contest.update>[1],
    );
    contest.value = updated;
    contestsStore.setCurrentContest(updated);
    contestsStore.updateContest(updated.code, updated);
    await Promise.all([loadSubmissions(), loadParticipants()]);
    toast.success(`${label} updated, standings recalculated`);
  } catch (err: any) {
    // Revert the inputs to whatever the contest actually holds.
    penaltyInput.value = contest.value?.penalty ?? null;
    toast.error(`Failed to update ${label.toLowerCase()}`);
    console.error('Update contest scoring error:', err);
  } finally {
    savingScoring.value = false;
  }
}

function applyPenalty() {
  if (penaltyValue.value !== null && penaltyValue.value < 0) {
    toast.error('Penalty must be zero or more minutes');
    return;
  }
  applyScoringChange({ penalty: penaltyValue.value }, 'Penalty');
}

function applyLso(enabled: boolean) {
  applyScoringChange({ lso: enabled }, 'Last submission only');
}

async function applyFormat(format: 'ICPC' | 'VNOJ') {
  if (!contest.value) return;

  savingFormat.value = true;
  try {
    const updated = await internalApi.contest.update(contest.value.code, { format });
    contest.value = updated;
    contestsStore.setCurrentContest(updated);
    contestsStore.updateContest(updated.code, { format: updated.format });
    formatSelectValue.value = format;
    toast.success(`Contest format set to ${format}`);
  } catch (err: any) {
    // Revert the dropdown on failure.
    formatSelectValue.value = (contest.value?.format ?? 'ICPC') as 'ICPC' | 'VNOJ';
    toast.error('Failed to update contest format');
    console.error('Update contest format error:', err);
  } finally {
    savingFormat.value = false;
    pendingFormat.value = null;
    showFormatConfirm.value = false;
  }
}

async function loadUsers() {
  try {
    const data = await internalApi.user.getUsers({});
    availableUsers.value = data;
  } catch (err: any) {
    console.error('Load users error:', err);
  }
}

async function refreshSubmissions() {
  if (await loadSubmissions()) toast.success('Submissions refreshed');
}

// Pagination handlers
function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  loadSubmissions();
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    loadSubmissions();
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
    loadSubmissions();
  }
}

// Debounce timer for search
let searchDebounceTimer: NodeJS.Timeout | null = null;

// Watch for search changes with debounce
watch(submissionSearch, () => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
  searchDebounceTimer = setTimeout(() => {
    currentPage.value = 1;
    loadSubmissions();
  }, 500); // 500ms debounce
});

// Watch for status filter changes (no debounce needed)
watch(submissionStatusFilter, () => {
  currentPage.value = 1;
  loadSubmissions();
});

// Generate page numbers with ellipsis
function getPageNumbers(): (number | string)[] {
  const pages: (number | string)[] = [];
  const maxVisible = 7; // Maximum number of page buttons to show

  if (totalPages.value <= maxVisible) {
    // Show all pages if total is less than max
    for (let i = 1; i <= totalPages.value; i++) {
      pages.push(i);
    }
  } else {
    // Always show first page
    pages.push(1);

    // Calculate range around current page
    const start = Math.max(2, currentPage.value - 1);
    const end = Math.min(totalPages.value - 1, currentPage.value + 1);

    // Add ellipsis after first page if needed
    if (start > 2) {
      pages.push('...');
    }

    // Add pages around current page
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Add ellipsis before last page if needed
    if (end < totalPages.value - 1) {
      pages.push('...');
    }

    // Always show last page
    pages.push(totalPages.value);
  }

  return pages;
}

function isUserAlreadyMapped(username: string, currentParticipantId: string): boolean {
  const mapped = contestsStore.isUserMapped(username);
  return mapped !== undefined && mapped._id !== currentParticipantId;
}

function startEditParticipant(participantId: string, currentUser?: string) {
  editingParticipant.value = participantId;
  selectedUser.value[participantId] = currentUser || '';
}

function cancelEditParticipant() {
  editingParticipant.value = null;
}

async function saveParticipantMapping(participantId: string) {
  linkingParticipant.value = participantId;
  const userToLink = selectedUser.value[participantId];

  try {
    // Validate if user is already mapped to another participant
    if (userToLink && isUserAlreadyMapped(userToLink, participantId)) {
      toast.error(`User ${userToLink} is already mapped to another participant`);
      return;
    }

    await internalApi.contest.linkParticipant(participantId, {
      user: userToLink || undefined,
    });

    // Update local state
    contestsStore.updateParticipant(participantId, { mapToUser: userToLink || undefined });
    const index = participants.value.findIndex(p => p._id === participantId);
    if (index !== -1) {
      participants.value[index].mapToUser = userToLink || undefined;
    }

    toast.success(userToLink ? 'Participant linked' : 'Participant unlinked');
    editingParticipant.value = null;
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Failed to link participant');
    console.error('Link participant error:', err);
  } finally {
    linkingParticipant.value = null;
  }
}

async function unlinkParticipant(participantId: string) {
  linkingParticipant.value = participantId;

  try {
    await internalApi.contest.linkParticipant(participantId, { user: undefined });

    // Update local state
    contestsStore.updateParticipant(participantId, { mapToUser: undefined });
    const index = participants.value.findIndex(p => p._id === participantId);
    if (index !== -1) {
      participants.value[index].mapToUser = undefined;
    }

    toast.success('Participant unlinked successfully');
  } catch (err: any) {
    toast.error('Failed to unlink participant');
    console.error('Unlink participant error:', err);
  } finally {
    linkingParticipant.value = null;
  }
}

async function syncParticipants() {
  if (!contest.value) return;

  syncingParticipants.value = true;

  try {
    const result = await internalApi.contest.syncParticipants(contest.value.code);

    // Reload participants list
    await loadParticipants();

    // Show success message with stats
    toast.success(
      `Participants synced: ${result.added} added, ${result.skipped} skipped (${result.total} total)`
    );
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Failed to sync participants');
    console.error('Sync participants error:', err);
  } finally {
    syncingParticipants.value = false;
  }
}

async function resyncContest() {
  if (!contest.value) return;

  resyncingContest.value = true;

  try {
    const result = await internalApi.contest.resyncContest(contest.value.code);

    // Update contest data
    contest.value = result.contest;
    contestsStore.setCurrentContest(result.contest);

    // Reload all data
    await Promise.all([
      loadParticipants(),
      loadProblems(),
    ]);

    // Show detailed success message
    toast.success(
      `Contest resynced! Problems: ${result.problems.added} added (${result.problems.total} total), Participants: ${result.participants.added} added (${result.participants.total} total)`
    );
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Failed to resync contest');
    console.error('Resync contest error:', err);
  } finally {
    resyncingContest.value = false;
  }
}

async function forceSyncSubmissions() {
  if (!contest.value) return;

  forceSyncingSubmissions.value = true;

  try {
    const result = await internalApi.contest.forceSyncSubmissions(contest.value.code);

    // Reload submissions and participants to reflect updated data
    await Promise.all([
      loadSubmissions(),
      loadParticipants(),
    ]);

    // Show detailed success message
    toast.success(result.message);
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Failed to force-sync submissions');
    console.error('Force-sync submissions error:', err);
  } finally {
    forceSyncingSubmissions.value = false;
  }
}

/**
 * Rebuild rank change / score on every stored submission plus the participant
 * standings. Touches no external API, so it is the fix for data that was
 * computed under older rules rather than data that is missing.
 */
async function recalculateContestData() {
  if (!contest.value) return;

  recalculatingData.value = true;

  try {
    const result = await internalApi.contest.recalculateContestData(contest.value.code);

    await Promise.all([loadSubmissions(), loadParticipants()]);

    toast.success(result.message);
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Failed to recalculate contest data');
    console.error('Recalculate contest data error:', err);
  } finally {
    recalculatingData.value = false;
  }
}

function openReactionPreview(submission: SubmissionEntity) {
  previewSubmission.value = submission;
}

function closeReactionPreview() {
  previewSubmission.value = null;
}

function regenerateAllReactions() {
  showRegenAllConfirm.value = true;
}

async function confirmRegenerateAllReactions() {
  if (!contest.value) return;

  regeneratingAllReactions.value = true;

  try {
    const { data } = await internalClient.post<{ queued: number; alreadyQueued: number; message: string }>(
      `/reactions/contests/${contest.value.code}/regenerate`,
    );
    toast.success(data.message);
    logReaction(data.message);
    showRegenAllConfirm.value = false;
    await loadSubmissions();
  } catch (err: any) {
    const message = err.response?.data?.message || 'Failed to queue reaction renders';
    toast.error(message);
    logReaction(message, false);
    console.error('Regenerate reactions error:', err);
  } finally {
    regeneratingAllReactions.value = false;
  }
}

function askRegenerateSubmissionReaction(submission: SubmissionEntity) {
  if (regeneratingReactionIds.value.has(submission._id)) return;
  regenTarget.value = submission;
}

async function confirmRegenerateSubmissionReaction() {
  const submission = regenTarget.value;
  if (!submission) return;

  const submissionId = submission._id;
  if (regeneratingReactionIds.value.has(submissionId)) return;

  // Sets are not deeply reactive, so swap in a new one on each mutation.
  regeneratingReactionIds.value = new Set(regeneratingReactionIds.value).add(submissionId);

  try {
    const { data } = await internalClient.post<{ queued: number; alreadyQueued: number; message: string }>(
      `/reactions/submissions/${submissionId}/regenerate`,
    );
    toast.success(data.message);
    logReaction(`${submission.author} / ${problemTitleOf(submission.problem_code)}: ${data.message}`);
    regenTarget.value = null;
    await loadSubmissions();
  } catch (err: any) {
    const message = err.response?.data?.message || 'Failed to queue reaction render';
    toast.error(message);
    logReaction(`${submission.author} / ${problemTitleOf(submission.problem_code)}: ${message}`, false);
    console.error('Regenerate submission reaction error:', err);
  } finally {
    const next = new Set(regeneratingReactionIds.value);
    next.delete(submissionId);
    regeneratingReactionIds.value = next;
  }
}

function startAutoRefresh() {
  if (contestStatus.value === 'ongoing' || contestStatus.value === 'frozen') {
    autoRefresh.value = true;
    refreshInterval = setInterval(() => {
      loadSubmissions();
    }, 30000); // Refresh every 30 seconds
  }
}

function stopAutoRefresh() {
  autoRefresh.value = false;
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  deleteError.value = '';
  deleteConfirmText.value = '';
}

async function handleDeleteContest() {
  if (!contest.value || deleteConfirmText.value !== contest.value.code) {
    return;
  }

  deleting.value = true;
  deleteError.value = '';

  try {
    const result = await internalApi.contest.delete(contest.value.code);

    // Remove from store
    contestsStore.removeContest(contest.value.code);

    // Show success message with deletion counts
    toast.success(
      `Contest deleted successfully! Removed: ${result.deletedCounts.participants} participants, ${result.deletedCounts.submissions} submissions, ${result.deletedCounts.problems} problems`
    );

    // Navigate back to contests list
    router.push('/contests');
  } catch (error: any) {
    deleteError.value = error.response?.data?.message || 'Failed to delete contest. Please try again.';
    console.error('Delete contest error:', error);
  } finally {
    deleting.value = false;
  }
}

// Add participant modal functions
function closeAddParticipantModal() {
  showAddParticipantModal.value = false;
  addParticipantError.value = '';
  addParticipantResult.value = null;
  // Reset form
  newParticipant.value = {
    participantUsername: '',
    userId: '',
    csvData: '',
    backendUsername: '',
    fullName: '',
    password: '',
  };
}

function copyCredentialsToClipboard() {
  if (!addParticipantResult.value?.generatedCredentials) return;

  const text = addParticipantResult.value.generatedCredentials
    .map(cred => `${cred.username},${cred.password}`)
    .join('\n');

  navigator.clipboard.writeText(text).then(() => {
    toast.success('Credentials copied to clipboard');
  }).catch(() => {
    toast.error('Failed to copy credentials');
  });
}

async function handleAddParticipants() {
  if (!contest.value || !canSubmitParticipant.value) return;

  addingParticipant.value = true;
  addParticipantError.value = '';
  addParticipantResult.value = null;

  try {
    const payload: any = {
      mode: addParticipantMode.value,
    };

    if (addParticipantMode.value === 'existing_user') {
      payload.participantUsername = newParticipant.value.participantUsername;
      payload.userId = newParticipant.value.userId;
    } else if (addParticipantMode.value === 'csv_import') {
      payload.csvData = newParticipant.value.csvData;
    } else if (addParticipantMode.value === 'create_user') {
      payload.participantUsername = newParticipant.value.participantUsername;
      payload.backendUsername = newParticipant.value.backendUsername;
      payload.fullName = newParticipant.value.fullName;
      payload.password = newParticipant.value.password;
    }
    // auto_create_user mode doesn't need additional payload - backend finds unmapped participants

    const result = await internalApi.contest.addParticipants(contest.value.code, payload);
    addParticipantResult.value = result;

    // Reload participants list
    await loadParticipants();

    if (result.added > 0) {
      toast.success(`Successfully added ${result.added} participant(s)`);
    }
  } catch (error: any) {
    addParticipantError.value = error.response?.data?.message || 'Failed to add participants. Please try again.';
    console.error('Add participants error:', error);
  } finally {
    addingParticipant.value = false;
  }
}

// Delete participant functions
function confirmDeleteParticipant(participantId: string, displayName: string) {
  participantToDelete.value = { id: participantId, displayName };
  showDeleteParticipantModal.value = true;
}

function closeDeleteParticipantModal() {
  showDeleteParticipantModal.value = false;
  participantToDelete.value = null;
}

async function handleDeleteParticipant() {
  if (!participantToDelete.value) return;

  deletingParticipant.value = true;

  try {
    await internalApi.contest.removeParticipant(participantToDelete.value.id);

    // Remove from local state
    const index = participants.value.findIndex(p => p._id === participantToDelete.value?.id);
    if (index !== -1) {
      participants.value.splice(index, 1);
    }
    contestsStore.setParticipants(participants.value);

    toast.success(`Participant ${participantToDelete.value.displayName} removed successfully`);
    closeDeleteParticipantModal();
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Failed to remove participant');
    console.error('Remove participant error:', error);
  } finally {
    deletingParticipant.value = false;
  }
}

async function quickMapAll() {
  quickMappingAll.value = true;

  try {
    // Get all unmapped participants
    const unmappedParticipants = participants.value.filter(p => !p.mapToUser);

    if (unmappedParticipants.length === 0) {
      toast.info('Every participant is already linked');
      return;
    }

    let mapped = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process each unmapped participant
    for (const participant of unmappedParticipants) {
      // Find users with matching username and CONTESTANT role
      const matchingUsers = availableUsers.value.filter(
        user => user.username === participant.username && user.role === 'contestant'
      );

      if (matchingUsers.length === 0) {
        // Skip if no matching user found
        skipped++;
      } else if (matchingUsers.length === 1) {
        // Map if exactly one matching user found
        try {
          await internalApi.contest.linkParticipant(participant._id, {
            user: matchingUsers[0].username,
          });

          // Update local state
          contestsStore.updateParticipant(participant._id, { mapToUser: matchingUsers[0].username });
          const index = participants.value.findIndex(p => p._id === participant._id);
          if (index !== -1) {
            participants.value[index].mapToUser = matchingUsers[0].username;
          }

          mapped++;
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          const responseMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          errors.push(`Failed to map ${participant.username}: ${responseMessage || errorMessage}`);
        }
      } else {
        // Error if multiple matching users found
        errors.push(
          `${matchingUsers.length} contestant accounts match "${participant.username}". Link it by hand.`
        );
      }
    }

    // Show summary toast
    if (mapped > 0) {
      toast.success(`Auto-link done: ${mapped} linked, ${skipped} skipped`);
    } else {
      toast.info(`Auto-link done: ${mapped} linked, ${skipped} skipped`);
    }

    // Show errors if any
    if (errors.length > 0) {
      for (const error of errors) {
        toast.warning(error, { timeout: 5000 });
      }
    }
  } catch (error: unknown) {
    toast.error('Failed to auto-link participants');
    console.error('Quick map all error:', error);
  } finally {
    quickMappingAll.value = false;
  }
}

onMounted(async () => {
  await loadContest();
  if (contest.value) {
    await Promise.all([
      loadParticipants(),
      loadSubmissions(),
      loadProblems(),
      loadUsers(),
    ]);
    startAutoRefresh();
  }
});

onUnmounted(() => {
  stopAutoRefresh();
  contestsStore.clearContestData();
});
</script>
