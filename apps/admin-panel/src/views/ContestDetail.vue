<template>
  <div class="min-h-screen bg-mission-black grid-background">
    <!-- Header -->
    <header class="border-b border-white/10 bg-mission-dark/80 backdrop-blur sticky top-0 z-50">
      <div class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <BackButton to="/contests" />
            <div class="h-8 w-px bg-white/20"></div>
            <div v-if="contest">
              <h1 class="text-2xl font-display font-bold flex items-center gap-2 text-glow">
                <span class="text-mission-accent">█</span>
                {{ contest.name }}
              </h1>
              <p class="text-xs font-mono text-gray-500 mt-1 uppercase">
                {{ contest.code }}
                <span class="mx-2">•</span>
                <span
                  class="px-2 py-0.5 border rounded-sm text-xs uppercase"
                  :class="{
                    'border-mission-accent text-mission-accent': contestStatus === 'ongoing',
                    'border-mission-cyan text-mission-cyan': contestStatus === 'upcoming',
                    'border-mission-amber text-mission-amber': contestStatus === 'frozen',
                    'border-gray-600 text-gray-500': contestStatus === 'past'
                  }"
                >
                  {{ contestStatus }}
                </span>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <!-- Resync button -->
            <button
              @click="resyncContest"
              :disabled="resyncingContest"
              class="px-4 py-2 border border-mission-cyan text-mission-cyan hover:bg-mission-cyan hover:text-mission-dark transition-all duration-300 uppercase text-xs tracking-wider flex items-center gap-2"
              :class="{ 'opacity-50 cursor-not-allowed': resyncingContest }"
            >
              <RotateCw
                :size="16"
                :stroke-width="2"
                :class="{ 'animate-spin': resyncingContest }"
              />
              <span>{{ resyncingContest ? 'RESYNCING...' : 'RESYNC ALL' }}</span>
            </button>
            <!-- Delete button -->
            <button
              @click="showDeleteModal = true"
              class="px-4 py-2 border border-mission-red text-mission-red hover:bg-mission-red hover:text-white transition-all duration-300 uppercase text-xs tracking-wider flex items-center gap-2"
            >
              <Trash2 :size="16" :stroke-width="2" />
              <span>DELETE</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto px-6 py-8">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-24">
        <div class="text-center">
          <div class="inline-block w-12 h-12 border-4 border-mission-accent border-t-transparent rounded-full animate-spin mb-4"></div>
          <p class="font-mono text-gray-500 text-sm uppercase tracking-wider">LOADING CONTEST DATA...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="flex items-center justify-center py-24">
        <div class="mission-card p-8 max-w-md text-center border-mission-red">
          <AlertCircle :size="64" :stroke-width="2" class="mx-auto mb-4 text-mission-red" />
          <p class="font-mono text-mission-red mb-4">{{ error }}</p>
          <router-link to="/contests" class="btn-secondary inline-block">
            RETURN TO CONTESTS
          </router-link>
        </div>
      </div>

      <!-- Contest Detail Content -->
      <div v-else-if="contest" class="space-y-6">
        <!-- Tab Navigation -->
        <div class="mission-card overflow-hidden">
          <div class="flex border-b border-white/10 bg-mission-gray">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="changeTab(tab.id as TabType)"
              class="flex-1 px-6 py-4 font-mono text-sm uppercase tracking-wider transition-all duration-300 relative group"
              :class="activeTab === tab.id
                ? 'text-mission-accent bg-mission-accent/5'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'"
            >
              <div class="flex items-center justify-center gap-2">
                <component :is="tab.iconComponent" :size="16" :stroke-width="2" />
                {{ tab.label }}
              </div>
              <div
                v-if="activeTab === tab.id"
                class="absolute bottom-0 left-0 right-0 h-0.5 bg-mission-accent shadow-[0_0_8px_rgba(0,255,157,0.5)]"
              ></div>
            </button>
          </div>

          <!-- Tab Content -->
          <div class="p-6">
            <!-- DETAILS TAB -->
            <div v-show="activeTab === 'details'" class="space-y-6">
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Contest Info Card -->
                <div class="mission-card p-6 bg-mission-gray">
                  <div class="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                    <span class="text-mission-accent">●</span>
                    <h2 class="text-lg font-display font-semibold uppercase tracking-wider">Contest Info</h2>
                  </div>
                  <div class="space-y-3">
                    <div>
                      <div class="tech-label mb-1">CODE</div>
                      <div class="font-mono text-sm uppercase">{{ contest.code }}</div>
                    </div>
                    <div>
                      <div class="tech-label mb-1">NAME</div>
                      <div class="text-sm">{{ contest.name }}</div>
                    </div>
                    <div>
                      <div class="tech-label mb-1">STATUS</div>
                      <div class="font-mono text-sm data-value">{{ contestStatus.toUpperCase() }}</div>
                    </div>
                  </div>
                </div>

                <!-- Time Info Card -->
                <div class="mission-card p-6 bg-mission-gray">
                  <div class="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                    <span class="text-mission-cyan">●</span>
                    <h2 class="text-lg font-display font-semibold uppercase tracking-wider">Schedule</h2>
                  </div>
                  <div class="space-y-3">
                    <div>
                      <div class="tech-label mb-1">START TIME</div>
                      <div class="font-mono text-xs text-gray-400">{{ formatFullDateTime(contest.start_time) }}</div>
                    </div>
                    <div>
                      <div class="tech-label mb-1">END TIME</div>
                      <div class="font-mono text-xs text-gray-400">{{ formatFullDateTime(contest.end_time) }}</div>
                    </div>
                    <div v-if="contest.frozen_at">
                      <div class="tech-label mb-1">FROZEN AT</div>
                      <div class="font-mono text-xs text-mission-amber">{{ formatFullDateTime(contest.frozen_at) }}</div>
                    </div>
                  </div>
                </div>

                <!-- Stats Card -->
                <div class="mission-card p-6 bg-mission-gray">
                  <div class="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                    <span class="text-mission-amber">●</span>
                    <h2 class="text-lg font-display font-semibold uppercase tracking-wider">Statistics</h2>
                  </div>
                  <div class="space-y-4">
                    <div>
                      <div class="flex items-center justify-between mb-1">
                        <div class="tech-label">PARTICIPANTS</div>
                        <div class="font-mono text-sm data-value">{{ participants.length }}</div>
                      </div>
                    </div>
                    <div>
                      <div class="flex items-center justify-between mb-1">
                        <div class="tech-label">SUBMISSIONS</div>
                        <div class="font-mono text-sm data-value">{{ submissions.length }}</div>
                      </div>
                    </div>
                    <div>
                      <div class="flex items-center justify-between mb-1">
                        <div class="tech-label">PROBLEMS</div>
                        <div class="font-mono text-sm data-value">{{ problems.length }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- PARTICIPANTS TAB -->
            <div v-show="activeTab === 'participants'">
              <!-- Search and filters -->
              <div class="mb-4 flex items-center gap-4">
                <SearchInput
                  v-model="participantSearch"
                  placeholder="SEARCH PARTICIPANT..."
                  container-class="flex-1"
                />
                <StatCounter
                  label="TOTAL:"
                  :value="filteredParticipants.length"
                />
                <RefreshButton
                  :loading="syncingParticipants"
                  label="SYNC"
                  button-class="text-xs"
                  @click="syncParticipants"
                />
                <button
                  @click="showAddParticipantModal = true"
                  class="btn-primary flex items-center gap-2 text-xs"
                >
                  <UserPlus :size="16" :stroke-width="2" />
                  ADD PARTICIPANT
                </button>
              </div>

              <!-- Participants Table -->
              <div v-if="loadingParticipants" class="text-center py-12">
                <div class="inline-block w-8 h-8 border-4 border-mission-accent border-t-transparent rounded-full animate-spin mb-2"></div>
                <p class="font-mono text-gray-500 text-xs uppercase">Loading participants...</p>
              </div>
              <div v-else-if="filteredParticipants.length === 0" class="text-center py-12 text-gray-500">
                <Users :size="64" :stroke-width="2" class="mx-auto mb-3 text-gray-600" />
                <p class="font-mono text-sm uppercase">No participants found</p>
              </div>
              <div v-else class="mission-card overflow-hidden bg-mission-gray">
                <div class="grid grid-cols-12 gap-4 px-6 py-4 bg-mission-dark border-b border-white/10">
                  <div class="col-span-3 tech-label">PARTICIPANT</div>
                  <div class="col-span-4 tech-label">MAPPED USER</div>
                  <div class="col-span-2 tech-label">STATUS</div>
                  <div class="col-span-3 tech-label text-center">ACTIONS</div>
                </div>
                <div class="divide-y divide-white/5">
                  <div
                    v-for="participant in filteredParticipants"
                    :key="participant._id"
                    class="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-mission-accent/5 transition-all duration-300"
                  >
                    <div class="col-span-3">
                      <div class="font-mono text-sm">{{ participant.displayName }}</div>
                      <div class="text-xs text-gray-500">@{{ participant.username }}</div>
                    </div>
                    <div class="col-span-4">
                      <MissionSelect
                        v-if="editingParticipant === participant._id"
                        v-model="selectedUser[participant._id]"
                        :options="availableUsers"
                        :option-label="(user: any) => `${user.fullName} (@${user.username})`"
                        option-value="username"
                        :disabled-options="(user: any) => isUserAlreadyMapped(user.username, participant._id)"
                        placeholder="-- Select User --"
                      />
                      <div v-else class="text-sm">
                        <span v-if="participant.mapToUser" class="data-value">{{ participant.mapToUser }}</span>
                        <span v-else class="text-gray-500">Not mapped</span>
                      </div>
                    </div>
                    <div class="col-span-2">
                      <span
                        v-if="participant.mapToUser"
                        class="px-2 py-1 text-xs font-mono uppercase border border-mission-accent text-mission-accent bg-mission-accent/10 rounded-sm"
                      >
                        LINKED
                      </span>
                      <span
                        v-else
                        class="px-2 py-1 text-xs font-mono uppercase border border-gray-600 text-gray-500 rounded-sm"
                      >
                        UNMAPPED
                      </span>
                    </div>
                    <div class="col-span-3 flex items-center justify-center gap-2">
                      <button
                        v-if="editingParticipant === participant._id"
                        @click="saveParticipantMapping(participant._id)"
                        :disabled="linkingParticipant === participant._id"
                        class="btn-primary text-xs px-3 py-1"
                      >
                        {{ linkingParticipant === participant._id ? 'SAVING...' : 'SAVE' }}
                      </button>
                      <button
                        v-if="editingParticipant === participant._id"
                        @click="cancelEditParticipant"
                        class="btn-secondary text-xs px-3 py-1"
                      >
                        CANCEL
                      </button>
                      <button
                        v-else
                        @click="startEditParticipant(participant._id, participant.mapToUser)"
                        class="btn-secondary text-xs px-3 py-1"
                      >
                        {{ participant.mapToUser ? 'EDIT' : 'MAP' }}
                      </button>
                      <button
                        v-if="participant.mapToUser && editingParticipant !== participant._id"
                        @click="unlinkParticipant(participant._id)"
                        class="text-mission-amber hover:text-mission-amber/80 transition-colors"
                        title="Unlink user"
                      >
                        <EyeOff :size="16" :stroke-width="2" />
                      </button>
                      <button
                        v-if="editingParticipant !== participant._id"
                        @click="confirmDeleteParticipant(participant._id, participant.displayName)"
                        class="text-mission-red hover:text-mission-red/80 transition-colors"
                        title="Remove participant"
                      >
                        <Trash2 :size="16" :stroke-width="2" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- SUBMISSIONS TAB -->
            <div v-show="activeTab === 'submissions'">
              <!-- Filters -->
              <div class="mb-4 flex items-center gap-4 flex-wrap">
                <SearchInput
                  v-model="submissionSearch"
                  placeholder="SEARCH AUTHOR OR PROBLEM..."
                  container-class="flex-1 min-w-[250px]"
                />
                <div class="flex items-center gap-2">
                  <span class="tech-label">STATUS:</span>
                  <MissionSelect
                    v-model="submissionStatusFilter"
                    :options="['all', 'AC', 'WA', 'RTE', 'RE', 'IR', 'OLE', 'MLE', 'TLE', 'IE', 'AB', 'CE', 'UNKNOWN']"
                    :searchable="false"
                    container-class="w-32"
                  />
                </div>
                <div class="flex items-center gap-2">
                  <span class="tech-label">SHOWING:</span>
                  <span class="data-value text-lg">{{ submissions.length }}</span>
                  <span class="text-gray-500 text-xs">/ {{ totalSubmissions }}</span>
                </div>
                <button
                  v-if="contestStatus === 'ongoing'"
                  @click="refreshSubmissions"
                  :disabled="loadingSubmissions"
                  class="btn-secondary flex items-center gap-2 text-xs"
                >
                  <RotateCw
                    :size="16"
                    :stroke-width="2"
                    :class="{ 'animate-spin': loadingSubmissions || autoRefresh }"
                  />
                  {{ autoRefresh ? 'AUTO-SYNC' : 'REFRESH' }}
                </button>
              </div>

              <!-- Submissions Table -->
              <div v-if="loadingSubmissions && submissions.length === 0" class="text-center py-12">
                <div class="inline-block w-8 h-8 border-4 border-mission-accent border-t-transparent rounded-full animate-spin mb-2"></div>
                <p class="font-mono text-gray-500 text-xs uppercase">Loading submissions...</p>
              </div>
              <div v-else-if="submissions.length === 0" class="text-center py-12 text-gray-500">
                <FileText :size="64" :stroke-width="2" class="mx-auto mb-3 text-gray-600" />
                <p class="font-mono text-sm uppercase">No submissions found</p>
              </div>
              <div v-else class="mission-card overflow-hidden bg-mission-gray">
                <div class="grid grid-cols-12 gap-4 px-6 py-4 bg-mission-dark border-b border-white/10 text-xs">
                  <div class="col-span-2 tech-label">TIME</div>
                  <div class="col-span-2 tech-label">AUTHOR</div>
                  <div class="col-span-1 tech-label">PROBLEM</div>
                  <div class="col-span-2 tech-label">STATUS</div>
                  <div class="col-span-1 tech-label text-center">SCORE</div>
                  <div class="col-span-1 tech-label text-center">PENALTY</div>
                  <div class="col-span-2 tech-label text-center">RANK CHANGE</div>
                  <div class="col-span-1 tech-label text-center">REACTION</div>
                </div>
                <div class="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                  <div
                    v-for="submission in submissions"
                    :key="submission._id"
                    class="grid grid-cols-12 gap-4 px-6 py-3 hover:bg-mission-accent/5 transition-all duration-300 text-xs"
                  >
                    <div class="col-span-2 font-mono text-gray-400">{{ formatFullDateTime(submission.submittedAt) }}</div>
                    <div class="col-span-2 font-mono">{{ submission.author }}</div>
                    <div class="col-span-1 font-mono text-mission-cyan">{{ submission.problem_code }}</div>
                    <div class="col-span-2">
                      <span
                        class="px-2 py-1 font-mono uppercase border rounded-sm"
                        :class="getStatusClass(submission.submissionStatus)"
                      >
                        {{ submission.submissionStatus }}
                      </span>
                    </div>
                    <div class="col-span-1 text-center font-mono data-value">{{ submission.data.score }}</div>
                    <div class="col-span-1 text-center font-mono text-gray-400">{{ submission.data.penalty }}</div>
                    <div class="col-span-2 text-center font-mono">
                      <span v-if="submission.data.old_rank !== submission.data.new_rank">
                        <span class="text-gray-500">{{ submission.data.old_rank }}</span>
                        <ChevronRight :size="12" :stroke-width="2" class="inline mx-1" />
                        <span :class="submission.data.new_rank < submission.data.old_rank ? 'text-mission-accent' : 'text-mission-red'">
                          {{ submission.data.new_rank }}
                        </span>
                      </span>
                      <span v-else class="text-gray-500">—</span>
                    </div>
                    <div class="col-span-1 text-center">
                      <span v-if="submission.data.reaction" class="text-lg">{{ submission.data.reaction }}</span>
                      <span v-else class="text-gray-600">—</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Pagination Controls -->
              <div v-if="totalPages > 1" class="mt-6 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="tech-label">PAGE:</span>
                  <span class="data-value">{{ currentPage }} / {{ totalPages }}</span>
                </div>

                <div class="flex items-center gap-2">
                  <!-- Previous Button -->
                  <button
                    @click="prevPage"
                    :disabled="currentPage === 1"
                    class="px-4 py-2 border font-mono text-xs uppercase tracking-wider transition-all duration-300"
                    :class="currentPage === 1
                      ? 'border-white/10 text-gray-600 cursor-not-allowed'
                      : 'border-white/20 text-gray-400 hover:border-mission-accent hover:text-mission-accent'"
                  >
                    <ChevronLeft :size="16" :stroke-width="2" />
                  </button>

                  <!-- Page Numbers -->
                  <div class="flex items-center gap-1">
                    <button
                      v-for="page in getPageNumbers()"
                      :key="page"
                      @click="page !== '...' && goToPage(Number(page))"
                      class="px-3 py-2 border font-mono text-xs uppercase tracking-wider transition-all duration-300"
                      :class="page === currentPage
                        ? 'border-mission-accent text-mission-accent bg-mission-accent/10'
                        : page === '...'
                        ? 'border-transparent text-gray-600 cursor-default'
                        : 'border-white/20 text-gray-400 hover:border-mission-accent hover:text-mission-accent'"
                    >
                      {{ page }}
                    </button>
                  </div>

                  <!-- Next Button -->
                  <button
                    @click="nextPage"
                    :disabled="currentPage === totalPages"
                    class="px-4 py-2 border font-mono text-xs uppercase tracking-wider transition-all duration-300"
                    :class="currentPage === totalPages
                      ? 'border-white/10 text-gray-600 cursor-not-allowed'
                      : 'border-white/20 text-gray-400 hover:border-mission-accent hover:text-mission-accent'"
                  >
                    <ChevronRight :size="16" :stroke-width="2" />
                  </button>
                </div>
              </div>
            </div>

            <!-- PROBLEMS TAB -->
            <div v-show="activeTab === 'problems'">
              <div v-if="loadingProblems" class="text-center py-12">
                <div class="inline-block w-8 h-8 border-4 border-mission-accent border-t-transparent rounded-full animate-spin mb-2"></div>
                <p class="font-mono text-gray-500 text-xs uppercase">Loading problems...</p>
              </div>
              <div v-else-if="problems.length === 0" class="text-center py-12 text-gray-500">
                <FileText :size="64" :stroke-width="2" class="mx-auto mb-3 text-gray-600" />
                <p class="font-mono text-sm uppercase">No problems found</p>
              </div>
              <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div
                  v-for="problem in problems"
                  :key="problem._id"
                  class="mission-card p-6 bg-mission-gray hover:border-mission-accent transition-all duration-300"
                >
                  <div class="flex items-center gap-2 mb-3">
                    <span class="text-mission-accent">●</span>
                    <h3 class="font-mono font-semibold uppercase text-sm">{{ problem.code }}</h3>
                  </div>
                  <div class="space-y-2 text-xs">
                    <div class="flex items-center justify-between">
                      <span class="tech-label">SUBMISSIONS</span>
                      <span class="data-value">{{ getProblemSubmissionCount(problem.code) }}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="tech-label">AC RATE</span>
                      <span class="data-value">{{ getProblemACRate(problem.code) }}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- RANKING TAB -->
            <div v-show="activeTab === 'ranking'">
              <div v-if="loadingParticipants || loadingProblems" class="text-center py-12">
                <div class="inline-block w-8 h-8 border-4 border-mission-accent border-t-transparent rounded-full animate-spin mb-2"></div>
                <p class="font-mono text-gray-500 text-xs uppercase">Loading ranking...</p>
              </div>
              <div v-else-if="participants.length === 0" class="text-center py-12 text-gray-500">
                <Trophy :size="64" :stroke-width="2" class="mx-auto mb-3 text-gray-600" />
                <p class="font-mono text-sm uppercase">No participants found</p>
              </div>
              <div v-else class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-white/10 bg-mission-gray">
                      <th class="px-3 py-3 text-left font-mono text-xs uppercase tracking-wider text-gray-400 w-12">#</th>
                      <th class="px-3 py-3 text-left font-mono text-xs uppercase tracking-wider text-gray-400 min-w-[150px]">Participant</th>
                      <th class="px-3 py-3 text-center font-mono text-xs uppercase tracking-wider text-gray-400 w-20">Solved</th>
                      <th class="px-3 py-3 text-center font-mono text-xs uppercase tracking-wider text-gray-400 w-24">Penalty</th>
                      <th
                        v-for="problem in sortedProblems"
                        :key="problem._id"
                        class="px-2 py-3 text-center font-mono text-xs uppercase tracking-wider text-gray-400 w-20"
                      >
                        {{ problem.code }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in rankingData"
                      :key="row.participant._id"
                      class="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <!-- Rank -->
                      <td class="px-3 py-3 font-mono text-sm text-gray-400">
                        {{ row.rank }}
                      </td>
                      <!-- Display Name -->
                      <td class="px-3 py-3">
                        <div class="font-mono text-sm">{{ row.participant.displayName }}</div>
                        <div class="text-xs text-gray-500">
                          @{{ row.participant.username }}
                        </div>
                      </td>
                      <!-- Solved Count -->
                      <td class="px-3 py-3 text-center">
                        <span class="font-mono text-sm data-value">{{ row.participant.solvedCount || 0 }}</span>
                      </td>
                      <!-- Total Penalty -->
                      <td class="px-3 py-3 text-center">
                        <span class="font-mono text-sm text-gray-400">{{ row.participant.totalPenalty || 0 }}</span>
                      </td>
                      <!-- Problem Cells -->
                      <td
                        v-for="problem in sortedProblems"
                        :key="problem._id"
                        class="px-2 py-3 text-center"
                      >
                        <div
                          v-if="row.problemStates[problem.code]?.tries > 0"
                          class="inline-flex flex-col items-center justify-center min-w-[50px] px-2 py-1 rounded text-xs font-mono"
                          :class="row.problemStates[problem.code]?.solved
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'"
                        >
                          <span class="font-semibold">
                            {{ row.problemStates[problem.code]?.solved ? '+' : '-' }}{{ row.problemStates[problem.code]?.tries }}
                          </span>
                          <span v-if="row.problemStates[problem.code]?.solved" class="text-[10px] opacity-75">
                            {{ row.problemStates[problem.code]?.penalty }}'
                          </span>
                        </div>
                        <span v-else class="text-gray-600">-</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showDeleteModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          @click.self="closeDeleteModal"
        >
          <div class="mission-card w-full max-w-lg mx-4 border-mission-red overflow-hidden" style="animation: slideInModal 0.3s ease-out">
            <!-- Modal Header -->
            <div class="px-6 py-4 border-b border-white/10 bg-mission-gray">
              <div class="flex items-center justify-between">
                <h2 class="text-xl font-display font-bold flex items-center gap-2 text-mission-red">
                  <AlertCircle :size="24" :stroke-width="2" />
                  DELETE CONTEST
                </h2>
                <button
                  @click="closeDeleteModal"
                  class="text-gray-400 hover:text-mission-red transition-colors"
                >
                  <X :size="24" :stroke-width="2" />
                </button>
              </div>
            </div>

            <!-- Modal Body -->
            <div class="p-6 space-y-4">
              <div class="p-4 border border-mission-red bg-mission-red/10">
                <p class="text-sm font-mono text-mission-red">
                  ⚠️ WARNING: This action cannot be undone!
                </p>
              </div>

              <div class="space-y-3">
                <p class="text-sm text-gray-300">
                  You are about to permanently delete the contest <span class="font-mono text-mission-accent">{{ contest?.code }}</span> and all of its related data:
                </p>

                <ul class="space-y-2 text-sm text-gray-400 font-mono">
                  <li class="flex items-center gap-2">
                    <span class="text-mission-red">•</span>
                    <span>{{ participants.length }} Participant(s)</span>
                  </li>
                  <li class="flex items-center gap-2">
                    <span class="text-mission-red">•</span>
                    <span>{{ totalSubmissions }} Submission(s)</span>
                  </li>
                  <li class="flex items-center gap-2">
                    <span class="text-mission-red">•</span>
                    <span>{{ problems.length }} Problem(s)</span>
                  </li>
                  <li class="flex items-center gap-2">
                    <span class="text-mission-red">•</span>
                    <span>Contest metadata and settings</span>
                  </li>
                </ul>

                <p class="text-sm text-gray-400 mt-4">
                  To confirm deletion, type the contest code below:
                </p>

                <input
                  v-model="deleteConfirmText"
                  type="text"
                  :placeholder="`Type '${contest?.code}' to confirm`"
                  class="input-mission font-mono uppercase w-full"
                  @keyup.enter="deleteConfirmText === contest?.code && handleDeleteContest()"
                />
              </div>

              <!-- Error Message -->
              <div v-if="deleteError" class="p-3 border border-mission-red bg-mission-red/10 text-mission-red text-sm font-mono">
                {{ deleteError }}
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  @click="handleDeleteContest"
                  :disabled="deleting || deleteConfirmText !== contest?.code"
                  class="flex-1 px-6 py-3 border font-mono text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2"
                  :class="deleting || deleteConfirmText !== contest?.code
                    ? 'border-white/10 text-gray-600 cursor-not-allowed'
                    : 'border-mission-red text-mission-red hover:bg-mission-red hover:text-white'"
                >
                  <RotateCw
                    v-if="deleting"
                    :size="20"
                    :stroke-width="2"
                    class="animate-spin"
                  />
                  <Trash2 v-else :size="20" :stroke-width="2" />
                  <span>{{ deleting ? 'DELETING...' : 'CONFIRM DELETE' }}</span>
                </button>
                <button
                  type="button"
                  @click="closeDeleteModal"
                  :disabled="deleting"
                  class="btn-secondary px-8"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Add Participant Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showAddParticipantModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          @click.self="closeAddParticipantModal"
        >
          <div class="mission-card w-full max-w-3xl mx-4 border-mission-accent overflow-hidden" style="animation: slideInModal 0.3s ease-out">
            <!-- Modal Header -->
            <div class="px-6 py-4 border-b border-white/10 bg-mission-gray relative overflow-hidden">
              <!-- Decorative corner elements -->
              <div class="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-mission-accent opacity-30"></div>
              <div class="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-mission-accent opacity-30"></div>

              <div class="flex items-center justify-between relative z-10">
                <div>
                  <h2 class="text-xl font-display font-bold flex items-center gap-3 text-mission-accent mb-1">
                    <UserPlus :size="24" :stroke-width="2" />
                    PERSONNEL INTAKE
                  </h2>
                  <p class="text-xs font-mono text-gray-500 uppercase tracking-wider">CLASSIFIED :: AUTHORIZED ACCESS ONLY</p>
                </div>
                <button
                  @click="closeAddParticipantModal"
                  class="text-gray-400 hover:text-mission-accent transition-colors"
                >
                  <X :size="24" :stroke-width="2" />
                </button>
              </div>
            </div>

            <!-- Mode Selection -->
            <div class="p-6 border-b border-white/10 bg-mission-dark">
              <div class="tech-label mb-3">SELECT INTAKE PROTOCOL</div>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  @click="addParticipantMode = 'existing_user'"
                  class="p-4 border-2 transition-all duration-300 relative overflow-hidden group"
                  :class="addParticipantMode === 'existing_user'
                    ? 'border-mission-accent bg-mission-accent/10 text-mission-accent'
                    : 'border-white/20 hover:border-mission-accent/50 text-gray-400 hover:text-gray-200'"
                >
                  <div class="absolute inset-0 bg-gradient-to-br from-mission-accent/0 to-mission-accent/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div class="relative z-10">
                    <Users :size="32" :stroke-width="2" class="mx-auto mb-2" />
                    <div class="font-mono text-xs uppercase tracking-wider font-bold">Existing User</div>
                    <div class="text-[10px] text-gray-500 mt-1">Link to registered personnel</div>
                  </div>
                </button>

                <button
                  @click="addParticipantMode = 'csv_import'"
                  class="p-4 border-2 transition-all duration-300 relative overflow-hidden group"
                  :class="addParticipantMode === 'csv_import'
                    ? 'border-mission-cyan bg-mission-cyan/10 text-mission-cyan'
                    : 'border-white/20 hover:border-mission-cyan/50 text-gray-400 hover:text-gray-200'"
                >
                  <div class="absolute inset-0 bg-gradient-to-br from-mission-cyan/0 to-mission-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div class="relative z-10">
                    <Download :size="32" :stroke-width="2" class="mx-auto mb-2" />
                    <div class="font-mono text-xs uppercase tracking-wider font-bold">Batch Import</div>
                    <div class="text-[10px] text-gray-500 mt-1">CSV bulk assignment</div>
                  </div>
                </button>

                <button
                  @click="addParticipantMode = 'create_user'"
                  class="p-4 border-2 transition-all duration-300 relative overflow-hidden group"
                  :class="addParticipantMode === 'create_user'
                    ? 'border-mission-amber bg-mission-amber/10 text-mission-amber'
                    : 'border-white/20 hover:border-mission-amber/50 text-gray-400 hover:text-gray-200'"
                >
                  <div class="absolute inset-0 bg-gradient-to-br from-mission-amber/0 to-mission-amber/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div class="relative z-10">
                    <UserPlus :size="32" :stroke-width="2" class="mx-auto mb-2" />
                    <div class="font-mono text-xs uppercase tracking-wider font-bold">New Recruit</div>
                    <div class="text-[10px] text-gray-500 mt-1">Create user + participant</div>
                  </div>
                </button>

                <button
                  @click="addParticipantMode = 'auto_create_user'"
                  class="p-4 border-2 transition-all duration-300 relative overflow-hidden group"
                  :class="addParticipantMode === 'auto_create_user'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                    : 'border-white/20 hover:border-purple-500/50 text-gray-400 hover:text-gray-200'"
                >
                  <div class="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div class="relative z-10">
                    <UserPlus :size="32" :stroke-width="2" class="mx-auto mb-2" />
                    <div class="font-mono text-xs uppercase tracking-wider font-bold">Auto Create</div>
                    <div class="text-[10px] text-gray-500 mt-1">Bulk create users + random passwords</div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Modal Body -->
            <div class="p-6 space-y-6 bg-mission-dark max-h-[60vh] overflow-y-auto custom-scrollbar">
              <!-- Mode: Existing User -->
              <div v-if="addParticipantMode === 'existing_user'" class="space-y-4">
                <div class="p-4 border border-mission-accent/30 bg-mission-accent/5">
                  <p class="text-xs font-mono text-mission-accent flex items-center gap-2">
                    <Info :size="16" :stroke-width="2" />
                    Link a participant to an existing user in the system
                  </p>
                </div>

                <div>
                  <label class="tech-label mb-2 block">PARTICIPANT USERNAME (VNOJ)</label>
                  <input
                    v-model="newParticipant.participantUsername"
                    type="text"
                    placeholder="Enter VNOJ username"
                    class="input-mission w-full font-mono"
                  />
                </div>

                <div>
                  <label class="tech-label mb-2 block">SELECT BACKEND USER</label>
                  <MissionSelect
                    v-model="newParticipant.userId"
                    :options="availableUsers"
                    :option-label="(user: any) => `${user.fullName} (@${user.username})`"
                    option-value="username"
                    placeholder="-- Select User --"
                  />
                </div>
              </div>

              <!-- Mode: CSV Import -->
              <div v-if="addParticipantMode === 'csv_import'" class="space-y-4">
                <div class="p-4 border border-mission-cyan/30 bg-mission-cyan/5">
                  <p class="text-xs font-mono text-mission-cyan flex items-center gap-2 mb-2">
                    <Info :size="16" :stroke-width="2" />
                    Batch import participants from CSV data
                  </p>
                  <p class="text-[11px] font-mono text-gray-400">
                    Format: participant_username,backend_username (one per line)
                  </p>
                  <div class="mt-2 p-2 bg-mission-dark border-l-2 border-mission-cyan font-mono text-[10px] text-gray-500">
                    Example:<br/>
                    john_vnoj,john_backend<br/>
                    jane_vnoj,jane_backend
                  </div>
                </div>

                <div>
                  <label class="tech-label mb-2 block">CSV DATA</label>
                  <textarea
                    v-model="newParticipant.csvData"
                    rows="10"
                    placeholder="participant1,user1&#10;participant2,user2"
                    class="input-mission w-full font-mono text-sm resize-none"
                  ></textarea>
                  <div class="mt-2 flex items-center gap-2 text-xs font-mono text-gray-500">
                    <span class="tech-label">LINES:</span>
                    <span class="data-value">{{ (newParticipant.csvData || '').split('\n').filter(l => l.trim()).length }}</span>
                  </div>
                </div>
              </div>

              <!-- Mode: Create User -->
              <div v-if="addParticipantMode === 'create_user'" class="space-y-4">
                <div class="p-4 border border-mission-amber/30 bg-mission-amber/5">
                  <p class="text-xs font-mono text-mission-amber flex items-center gap-2">
                    <AlertCircle :size="16" :stroke-width="2" />
                    Create a new user and link to participant automatically
                  </p>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="tech-label mb-2 block">PARTICIPANT USERNAME (VNOJ)</label>
                    <input
                      v-model="newParticipant.participantUsername"
                      type="text"
                      placeholder="VNOJ username"
                      class="input-mission w-full font-mono"
                    />
                  </div>

                  <div>
                    <label class="tech-label mb-2 block">BACKEND USERNAME</label>
                    <input
                      v-model="newParticipant.backendUsername"
                      type="text"
                      placeholder="Backend username"
                      class="input-mission w-full font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label class="tech-label mb-2 block">FULL NAME</label>
                  <input
                    v-model="newParticipant.fullName"
                    type="text"
                    placeholder="Enter full name"
                    class="input-mission w-full"
                  />
                </div>

                <div>
                  <label class="tech-label mb-2 block">PASSWORD</label>
                  <input
                    v-model="newParticipant.password"
                    type="password"
                    placeholder="Enter password"
                    class="input-mission w-full font-mono"
                  />
                </div>
              </div>

              <!-- Mode: Auto Create User -->
              <div v-if="addParticipantMode === 'auto_create_user'" class="space-y-4">
                <div class="p-4 border border-purple-500/30 bg-purple-500/5">
                  <p class="text-xs font-mono text-purple-400 flex items-center gap-2 mb-2">
                    <Info :size="16" :stroke-width="2" />
                    Auto-create users for unmapped participants
                  </p>
                  <p class="text-[11px] font-mono text-gray-400">
                    This will automatically find all participants without a mapped user and create backend users for them with random passwords.
                  </p>
                </div>

                <div class="p-4 border border-white/10 bg-mission-gray">
                  <div class="tech-label mb-2">UNMAPPED PARTICIPANTS</div>
                  <div class="data-value text-2xl text-purple-400">{{ unmappedParticipantsCount }}</div>
                  <p class="text-[10px] text-gray-500 mt-1 font-mono">
                    participant(s) will have users created for them
                  </p>
                </div>

                <div class="p-3 border border-purple-500/20 bg-purple-500/5">
                  <p class="text-[11px] font-mono text-purple-300">
                    <strong>Note:</strong> Generated credentials will be shown after creation. Make sure to copy them!
                  </p>
                </div>
              </div>

              <!-- Error Display -->
              <div v-if="addParticipantError" class="p-3 border border-mission-red bg-mission-red/10">
                <p class="text-sm font-mono text-mission-red">{{ addParticipantError }}</p>
              </div>

              <!-- Success Stats (after submission) -->
              <div v-if="addParticipantResult" class="space-y-3">
                <div class="p-4 border border-mission-accent bg-mission-accent/10">
                  <div class="flex items-center gap-2 mb-3">
                    <Check :size="20" :stroke-width="2" class="text-mission-accent" />
                    <span class="font-mono text-sm text-mission-accent uppercase font-bold">Operation Complete</span>
                  </div>
                  <div class="grid grid-cols-3 gap-4 font-mono text-xs">
                    <div>
                      <div class="tech-label mb-1">ADDED</div>
                      <div class="data-value text-mission-accent text-lg">{{ addParticipantResult.added }}</div>
                    </div>
                    <div>
                      <div class="tech-label mb-1">SKIPPED</div>
                      <div class="data-value text-mission-amber text-lg">{{ addParticipantResult.skipped }}</div>
                    </div>
                    <div>
                      <div class="tech-label mb-1">TOTAL</div>
                      <div class="data-value text-lg">{{ addParticipantResult.total }}</div>
                    </div>
                  </div>
                </div>

                <!-- Error details -->
                <div v-if="addParticipantResult.errors && addParticipantResult.errors.length > 0" class="p-3 border border-mission-amber bg-mission-amber/5">
                  <div class="tech-label mb-2 flex items-center gap-2">
                    <AlertCircle :size="16" :stroke-width="2" />
                    ISSUES ENCOUNTERED ({{ addParticipantResult.errors.length }})
                  </div>
                  <div class="max-h-32 overflow-y-auto custom-scrollbar space-y-1">
                    <div
                      v-for="(error, index) in addParticipantResult.errors"
                      :key="index"
                      class="text-xs font-mono text-mission-amber pl-6"
                    >
                      • {{ error }}
                    </div>
                  </div>
                </div>

                <!-- Generated Credentials (for auto_create_user mode) -->
                <div v-if="addParticipantResult.generatedCredentials && addParticipantResult.generatedCredentials.length > 0" class="p-4 border border-purple-500/30 bg-purple-500/5">
                  <div class="flex items-center justify-between mb-3">
                    <div class="tech-label flex items-center gap-2 text-purple-400">
                      <UserPlus :size="16" :stroke-width="2" />
                      GENERATED CREDENTIALS ({{ addParticipantResult.generatedCredentials.length }})
                    </div>
                    <button
                      @click="copyCredentialsToClipboard"
                      class="px-3 py-1 text-xs font-mono border border-purple-500/50 text-purple-400 hover:bg-purple-500/20 transition-colors"
                    >
                      COPY ALL
                    </button>
                  </div>
                  <div class="max-h-48 overflow-y-auto custom-scrollbar">
                    <table class="w-full text-xs font-mono">
                      <thead>
                        <tr class="border-b border-purple-500/20">
                          <th class="text-left py-2 text-gray-400">USERNAME</th>
                          <th class="text-left py-2 text-gray-400">PASSWORD</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="cred in addParticipantResult.generatedCredentials"
                          :key="cred.username"
                          class="border-b border-purple-500/10"
                        >
                          <td class="py-2 text-purple-300">{{ cred.username }}</td>
                          <td class="py-2 text-purple-300">{{ cred.password }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="px-6 py-4 border-t border-white/10 bg-mission-gray flex items-center justify-between">
              <div class="text-xs font-mono text-gray-500 uppercase tracking-wider">
                MODE: <span class="text-mission-accent">{{ addParticipantMode.replace('_', ' ') }}</span>
              </div>
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  @click="closeAddParticipantModal"
                  :disabled="addingParticipant"
                  class="btn-secondary px-6"
                >
                  {{ addParticipantResult ? 'CLOSE' : 'CANCEL' }}
                </button>
                <button
                  v-if="!addParticipantResult"
                  type="button"
                  @click="handleAddParticipants"
                  :disabled="addingParticipant || !canSubmitParticipant"
                  class="px-6 py-3 border-2 font-mono text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2"
                  :class="addingParticipant || !canSubmitParticipant
                    ? 'border-white/10 text-gray-600 cursor-not-allowed bg-mission-gray'
                    : 'border-mission-accent text-mission-accent hover:bg-mission-accent hover:text-mission-dark shadow-[0_0_20px_rgba(0,255,157,0.3)] hover:shadow-[0_0_30px_rgba(0,255,157,0.5)]'"
                >
                  <RotateCw
                    v-if="addingParticipant"
                    :size="20"
                    :stroke-width="2"
                    class="animate-spin"
                  />
                  <Check v-else :size="20" :stroke-width="2" />
                  <span>{{ addingParticipant ? 'PROCESSING...' : 'EXECUTE' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Participant Confirmation Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showDeleteParticipantModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          @click.self="closeDeleteParticipantModal"
        >
          <div class="mission-card w-full max-w-md mx-4 border-mission-red overflow-hidden" style="animation: slideInModal 0.3s ease-out">
            <div class="px-6 py-4 border-b border-white/10 bg-mission-gray">
              <h2 class="text-xl font-display font-bold flex items-center gap-2 text-mission-red">
                <AlertCircle :size="24" :stroke-width="2" />
                REMOVE PARTICIPANT
              </h2>
            </div>
            <div class="p-6 space-y-4">
              <p class="text-sm text-gray-300">
                Are you sure you want to remove participant <span class="font-mono text-mission-accent">{{ participantToDelete?.displayName }}</span> from this contest?
              </p>
              <p class="text-xs text-mission-red font-mono">This action cannot be undone.</p>
              <div class="flex items-center gap-3 pt-4">
                <button
                  @click="handleDeleteParticipant"
                  :disabled="deletingParticipant"
                  class="flex-1 px-6 py-3 border font-mono text-sm uppercase tracking-wider transition-all duration-300"
                  :class="deletingParticipant
                    ? 'border-white/10 text-gray-600 cursor-not-allowed'
                    : 'border-mission-red text-mission-red hover:bg-mission-red hover:text-white'"
                >
                  {{ deletingParticipant ? 'REMOVING...' : 'CONFIRM' }}
                </button>
                <button
                  @click="closeDeleteParticipantModal"
                  :disabled="deletingParticipant"
                  class="btn-secondary px-8"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useContestsStore } from '~/stores/contests';
import type { ContestEntity, ParticipantEntity, SubmissionEntity, ProblemEntity } from '~/stores/contests';
import { internalApi } from '~/services/api';
import type { UserEntity } from '@libs/api/internal';
import { useToast } from 'vue-toastification';
import { RotateCw, Trash2, UserPlus, AlertCircle, Users, EyeOff, Info, Check, X, FileText, ChevronRight, ChevronLeft, Download, ClipboardList, Trophy } from 'lucide-vue-next';

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
const participants = ref<ParticipantEntity[]>([]);
const submissions = ref<SubmissionEntity[]>([]);
const problems = ref<ProblemEntity[]>([]);
const availableUsers = ref<UserEntity[]>([]);

// Tab state
const validTabs = ['details', 'participants', 'submissions', 'problems', 'ranking'] as const;
type TabType = typeof validTabs[number];

// Initialize activeTab from URL query parameter
const getInitialTab = (): TabType => {
  const tabFromQuery = route.query.tab as string;
  if (tabFromQuery && validTabs.includes(tabFromQuery as TabType)) {
    return tabFromQuery as TabType;
  }
  return 'details';
};

const activeTab = ref<TabType>(getInitialTab());
const tabs = [
  { id: 'details', label: 'Details', iconComponent: Info },
  { id: 'participants', label: 'Participants', iconComponent: Users },
  { id: 'submissions', label: 'Submissions', iconComponent: ClipboardList },
  { id: 'problems', label: 'Problems', iconComponent: FileText },
  { id: 'ranking', label: 'Ranking', iconComponent: Trophy },
];

// Participant state
const participantSearch = ref('');
const editingParticipant = ref<string | null>(null);
const selectedUser = ref<Record<string, string>>({});
const linkingParticipant = ref<string | null>(null);
const syncingParticipants = ref(false);

// Resync state
const resyncingContest = ref(false);

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
const addParticipantMode = ref<'existing_user' | 'csv_import' | 'create_user' | 'auto_create_user'>('existing_user');
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
  if (!participantSearch.value) return participants.value;
  const query = participantSearch.value.toLowerCase();
  return participants.value.filter(p =>
    p.displayName.toLowerCase().includes(query) ||
    p.username.toLowerCase().includes(query) ||
    (p.mapToUser && p.mapToUser.toLowerCase().includes(query))
  );
});

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
const sortedProblems = computed(() => {
  return [...problems.value].sort((a, b) => a.code.localeCompare(b.code));
});

// Ranking computed - participants sorted by ICPC rules with problem states
const rankingData = computed(() => {
  // Sort participants: more solved first, then lower penalty
  const sorted = [...participants.value].sort((a, b) => {
    const solvedDiff = (b.solvedCount || 0) - (a.solvedCount || 0);
    if (solvedDiff !== 0) return solvedDiff;
    return (a.totalPenalty || 0) - (b.totalPenalty || 0);
  });

  return sorted.map((participant, index) => {
    // Build problem states for this participant
    const problemStates: Record<string, { solved: boolean; tries: number; penalty: number }> = {};

    for (const problem of sortedProblems.value) {
      const problemData = participant.problemData?.[problem.code];
      if (problemData) {
        const solved = participant.solvedProblems?.includes(problem.code) || false;
        problemStates[problem.code] = {
          solved,
          tries: problemData.wrongTries + (solved ? 1 : 0), // Total attempts including AC
          penalty: solved ? problemData.solveTime : 0,
        };
      } else {
        problemStates[problem.code] = { solved: false, tries: 0, penalty: 0 };
      }
    }

    return {
      rank: participant.rank || (index + 1), // Use stored rank, fallback to calculated
      participant,
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

function formatFullDateTime(date: string | Date): string {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

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
    'AC': 'border-mission-accent text-mission-accent bg-mission-accent/10',
    'WA': 'border-mission-red text-mission-red bg-mission-red/10',
    'RTE': 'border-mission-red text-mission-red bg-mission-red/10',
    'RE': 'border-mission-red text-mission-red bg-mission-red/10',
    'IR': 'border-mission-amber text-mission-amber bg-mission-amber/10',
    'OLE': 'border-mission-amber text-mission-amber bg-mission-amber/10',
    'MLE': 'border-mission-amber text-mission-amber bg-mission-amber/10',
    'TLE': 'border-mission-amber text-mission-amber bg-mission-amber/10',
    'IE': 'border-gray-600 text-gray-500 bg-gray-600/10',
    'AB': 'border-gray-600 text-gray-500 bg-gray-600/10',
    'CE': 'border-gray-600 text-gray-500 bg-gray-600/10',
    'UNKNOWN': 'border-mission-cyan text-mission-cyan bg-mission-cyan/10',
  };
  return classes[status] || 'border-gray-600 text-gray-500';
}

function getProblemSubmissionCount(problemCode: string): number {
  return submissions.value.filter(s => s.problem_code === problemCode).length;
}

function getProblemACRate(problemCode: string): string {
  const problemSubmissions = submissions.value.filter(s => s.problem_code === problemCode);
  if (problemSubmissions.length === 0) return '0.0';
  const acCount = problemSubmissions.filter(s => s.submissionStatus === 'AC').length;
  return ((acCount / problemSubmissions.length) * 100).toFixed(1);
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
    activeTab.value = 'details';
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
      status?: 'AC' | 'WA' | 'RTE' | 'RE' | 'IR' | 'OLE' | 'MLE' | 'TLE' | 'IE' | 'AB' | 'CE' | 'UNKNOWN';
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
  } catch (err: any) {
    toast.error('Failed to load submissions');
    console.error('Load submissions error:', err);
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
  } catch (err: any) {
    toast.error('Failed to load problems');
    console.error('Load problems error:', err);
  } finally {
    loadingProblems.value = false;
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
  await loadSubmissions();
  toast.success('Submissions refreshed');
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

    toast.success(userToLink ? 'Participant mapped successfully' : 'Participant unmapped successfully');
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

function startAutoRefresh() {
  if (contestStatus.value === 'ongoing') {
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

    toast.success(`Participant ${participantToDelete.value.displayName} removed successfully`);
    closeDeleteParticipantModal();
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Failed to remove participant');
    console.error('Remove participant error:', error);
  } finally {
    deletingParticipant.value = false;
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

<style scoped>
/* Add custom scrollbar for submissions table */
.max-h-\[600px\]::-webkit-scrollbar {
  width: 8px;
}

.max-h-\[600px\]::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

.max-h-\[600px\]::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 157, 0.3);
  border-radius: 4px;
}

.max-h-\[600px\]::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 255, 157, 0.5);
}

/* Custom scrollbar for modals */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 157, 0.3);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 255, 157, 0.5);
}

/* Modal animations */
@keyframes slideInModal {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
