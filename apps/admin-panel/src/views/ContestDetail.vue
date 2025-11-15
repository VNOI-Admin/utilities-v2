<template>
  <div class="min-h-screen p-8">
    <div class="mb-6">
      <router-link to="/contests" class="inline-flex items-center gap-2 px-4 py-2 border border-white/20 hover:border-mission-accent hover:text-mission-accent transition-all duration-300 uppercase text-sm tracking-wider mb-4">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>BACK</span>
      </router-link>
      <h1 class="text-3xl font-display font-bold text-glow mb-2">CONTEST_DETAIL</h1>
      <p class="text-gray-500 font-mono text-sm uppercase tracking-wider">CODE: {{ $route.params.code }}</p>
    </div>

    <div class="mission-card p-6">
      <div class="text-center py-12 text-gray-500">
        <p class="font-mono uppercase">Contest Detail View - To Be Implemented</p>
        <p class="text-xs mt-2">Overview, Participants, Submissions tabs</p>
      </div>
    </div>
  </div>
</template>
