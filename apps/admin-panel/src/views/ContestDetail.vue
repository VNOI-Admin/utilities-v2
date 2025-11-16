<template>
  <div class="min-h-screen bg-mission-black grid-background">
    <!-- Header -->
    <header class="border-b border-white/10 bg-mission-dark/80 backdrop-blur sticky top-0 z-50">
      <div class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <router-link
              to="/contests"
              class="px-4 py-2 border border-white/20 hover:border-mission-accent hover:text-mission-accent transition-all duration-300 uppercase text-sm tracking-wider flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>BACK</span>
            </router-link>
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
            <!-- Last sync indicator -->
            <div v-if="contest?.last_sync_at" class="flex items-center gap-3 px-4 py-2 bg-mission-gray border border-white/10">
              <span class="tech-label">LAST SYNC</span>
              <span class="flex items-center gap-2 text-xs font-mono text-gray-400">
                {{ formatDateTime(contest.last_sync_at) }}
              </span>
            </div>
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
          <svg class="w-16 h-16 mx-auto mb-4 text-mission-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
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
                <span v-html="tab.icon" class="w-4 h-4"></span>
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
                <div class="flex-1 relative group">
                  <input
                    v-model="participantSearch"
                    type="text"
                    placeholder="SEARCH PARTICIPANT USERNAME..."
                    class="input-mission w-full pl-10"
                  />
                  <svg
                    class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-mission-accent transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div class="flex items-center gap-2">
                  <span class="tech-label">TOTAL:</span>
                  <span class="data-value text-lg">{{ filteredParticipants.length }}</span>
                </div>
                <button
                  @click="syncParticipants"
                  :disabled="syncingParticipants"
                  class="btn-secondary flex items-center gap-2 text-xs"
                >
                  <svg
                    class="w-4 h-4"
                    :class="{ 'animate-spin': syncingParticipants }"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {{ syncingParticipants ? 'SYNCING...' : 'SYNC' }}
                </button>
              </div>

              <!-- Participants Table -->
              <div v-if="loadingParticipants" class="text-center py-12">
                <div class="inline-block w-8 h-8 border-4 border-mission-accent border-t-transparent rounded-full animate-spin mb-2"></div>
                <p class="font-mono text-gray-500 text-xs uppercase">Loading participants...</p>
              </div>
              <div v-else-if="filteredParticipants.length === 0" class="text-center py-12 text-gray-500">
                <svg class="w-16 h-16 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p class="font-mono text-sm uppercase">No participants found</p>
              </div>
              <div v-else class="mission-card overflow-hidden bg-mission-gray">
                <div class="grid grid-cols-12 gap-4 px-6 py-4 bg-mission-dark border-b border-white/10">
                  <div class="col-span-3 tech-label">VNOJ USERNAME</div>
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
                    <div class="col-span-3 font-mono text-sm">{{ participant.username }}</div>
                    <div class="col-span-4">
                      <select
                        v-if="editingParticipant === participant._id"
                        v-model="selectedUser[participant._id]"
                        class="input-mission text-sm w-full"
                        @change="() => {}"
                      >
                        <option value="">-- Select User --</option>
                        <option
                          v-for="user in availableUsers"
                          :key="user.username"
                          :value="user.username"
                          :disabled="isUserAlreadyMapped(user.username, participant._id)"
                        >
                          {{ user.fullName }} (@{{ user.username }})
                        </option>
                      </select>
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
                        class="text-mission-red hover:text-mission-red/80 transition-colors"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
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
                <div class="flex-1 min-w-[250px] relative group">
                  <input
                    v-model="submissionSearch"
                    type="text"
                    placeholder="SEARCH AUTHOR OR PROBLEM..."
                    class="input-mission w-full pl-10"
                  />
                  <svg
                    class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-mission-accent transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div class="flex items-center gap-2">
                  <span class="tech-label">STATUS:</span>
                  <select v-model="submissionStatusFilter" class="input-mission text-sm">
                    <option value="all">ALL</option>
                    <option value="AC">AC</option>
                    <option value="WA">WA</option>
                    <option value="RTE">RTE</option>
                    <option value="RE">RE</option>
                    <option value="IR">IR</option>
                    <option value="OLE">OLE</option>
                    <option value="MLE">MLE</option>
                    <option value="TLE">TLE</option>
                    <option value="IE">IE</option>
                    <option value="AB">AB</option>
                    <option value="CE">CE</option>
                    <option value="UNKNOWN">UNKNOWN</option>
                  </select>
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
                  <svg
                    class="w-4 h-4"
                    :class="{ 'animate-spin': loadingSubmissions || autoRefresh }"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {{ autoRefresh ? 'AUTO-SYNC' : 'REFRESH' }}
                </button>
              </div>

              <!-- Submissions Table -->
              <div v-if="loadingSubmissions && submissions.length === 0" class="text-center py-12">
                <div class="inline-block w-8 h-8 border-4 border-mission-accent border-t-transparent rounded-full animate-spin mb-2"></div>
                <p class="font-mono text-gray-500 text-xs uppercase">Loading submissions...</p>
              </div>
              <div v-else-if="submissions.length === 0" class="text-center py-12 text-gray-500">
                <svg class="w-16 h-16 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
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
                        <svg class="w-3 h-3 inline mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
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
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
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
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
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
                <svg class="w-16 h-16 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
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
          </div>
        </div>
      </div>
    </main>
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
const validTabs = ['details', 'participants', 'submissions', 'problems'] as const;
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
  { id: 'details', label: 'Details', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>' },
  { id: 'participants', label: 'Participants', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>' },
  { id: 'submissions', label: 'Submissions', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>' },
  { id: 'problems', label: 'Problems', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>' },
];

// Participant state
const participantSearch = ref('');
const editingParticipant = ref<string | null>(null);
const selectedUser = ref<Record<string, string>>({});
const linkingParticipant = ref<string | null>(null);
const syncingParticipants = ref(false);

// Submission state
const submissionSearch = ref('');
const submissionStatusFilter = ref<string>('all');
const autoRefresh = ref(false);
const currentPage = ref(1);
const pageSize = ref(100);
const totalSubmissions = ref(0);
const totalPages = ref(0);
let refreshInterval: NodeJS.Timeout | null = null;

// Computed
const contestStatus = computed(() => {
  if (!contest.value) return 'unknown';
  return contestsStore.getContestStatus(contest.value);
});

const filteredParticipants = computed(() => {
  if (!participantSearch.value) return participants.value;
  const query = participantSearch.value.toLowerCase();
  return participants.value.filter(p =>
    p.username.toLowerCase().includes(query) ||
    (p.mapToUser && p.mapToUser.toLowerCase().includes(query))
  );
});

// Methods
function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ago`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

function formatFullDateTime(date: string | Date): string {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatTime(date: string | Date): string {
  const d = new Date(date);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

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
    const queryParams: Record<string, any> = {
      page: currentPage.value,
      limit: pageSize.value,
    };

    // Add search parameter
    if (submissionSearch.value) {
      queryParams.search = submissionSearch.value;
    }

    // Add status filter parameter
    if (submissionStatusFilter.value && submissionStatusFilter.value !== 'all') {
      queryParams.status = submissionStatusFilter.value;
    }

    const response = await internalApi.contest.getSubmissions(contest.value.code, { query: queryParams });

    // Handle paginated response
    submissions.value = response.data;
    totalSubmissions.value = response.pagination.total;
    totalPages.value = response.pagination.totalPages;

    contestsStore.setSubmissions(response.data);
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
</style>
