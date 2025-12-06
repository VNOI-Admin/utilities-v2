<template>
  <div class="config-panel">
    <h2 class="panel-title">Announcement Management</h2>

    <!-- Add New Announcement -->
    <div class="p-5 bg-mission-dark border border-white/10 rounded mb-6">
      <div class="mb-4">
        <label class="tech-label mb-2">New Announcement</label>
        <textarea
          v-model="newAnnouncement.text"
          class="input-mission resize-y"
          placeholder="Enter announcement text..."
          rows="3"
        />
      </div>
      <div class="grid grid-cols-[200px_1fr] gap-4 items-end">
        <div>
          <label class="tech-label mb-2">Priority</label>
          <input
            v-model.number="newAnnouncement.priority"
            type="number"
            class="input-mission"
            placeholder="0"
            min="0"
            max="100"
          />
        </div>
        <button
          type="button"
          class="btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!newAnnouncement.text.trim()"
          @click="addAnnouncement"
        >
          <Plus :size="16" />
          Add Announcement
        </button>
      </div>
    </div>

    <!-- Announcements List -->
    <div v-if="localAnnouncements.length > 0" class="flex flex-col gap-3">
      <h3 class="tech-label mb-2">Active Announcements ({{ localAnnouncements.length }})</h3>
      <div
        v-for="(announcement, index) in sortedAnnouncements"
        :key="announcement.id"
        class="p-4 bg-mission-dark border border-white/10 rounded"
      >
        <div class="flex justify-between items-center mb-3">
          <div class="font-mono text-xs font-semibold text-mission-accent uppercase">
            Priority: {{ announcement.priority || 0 }}
          </div>
          <button
            type="button"
            class="flex items-center gap-1.5 px-3 py-1.5 border border-white/20 text-white/60 hover:border-red-500 hover:text-red-500 font-mono text-xs rounded transition-all"
            @click="removeAnnouncement(announcement.id)"
          >
            <Trash2 :size="14" />
            Delete
          </button>
        </div>
        <div class="font-mono text-sm text-white leading-relaxed mb-2">
          {{ announcement.text }}
        </div>
        <div class="font-mono text-xs text-white/40">
          Added: {{ formatTime(announcement.timestamp) }}
        </div>
      </div>
    </div>

    <div v-else class="text-center py-15 text-white/40">
      <MessageSquare :size="48" class="mx-auto mb-4 opacity-30" />
      <p class="font-mono text-sm uppercase">No announcements yet</p>
    </div>

    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>

    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus, Trash2, MessageSquare } from 'lucide-vue-next';
import { useOverlayStore, type AnnouncementItem } from '~/stores/overlay';
import { useToast } from 'vue-toastification';

const overlayStore = useOverlayStore();
const toast = useToast();

const newAnnouncement = ref({
  text: '',
  priority: 0,
});

const localAnnouncements = ref<AnnouncementItem[]>([]);
const loading = ref(false);
const successMessage = ref('');

const sortedAnnouncements = computed(() => {
  return [...localAnnouncements.value].sort((a, b) => (b.priority || 0) - (a.priority || 0));
});

async function addAnnouncement() {
  if (!newAnnouncement.value.text.trim()) {
    toast.warning('Please enter announcement text');
    return;
  }

  const announcement: AnnouncementItem = {
    id: Date.now().toString(),
    text: newAnnouncement.value.text.trim(),
    priority: newAnnouncement.value.priority || 0,
    timestamp: Date.now(),
  };

  localAnnouncements.value.push(announcement);
  await saveAnnouncements();

  newAnnouncement.value.text = '';
  newAnnouncement.value.priority = 0;
}

async function removeAnnouncement(id: string) {
  localAnnouncements.value = localAnnouncements.value.filter(a => a.id !== id);
  await saveAnnouncements();
}

async function saveAnnouncements() {
  try {
    loading.value = true;
    await overlayStore.updateAnnouncements({
      announcements: localAnnouncements.value,
    });
    showSuccess('Announcements updated');
  } catch (error: any) {
    toast.error(error.message || 'Failed to save announcements');
  } finally {
    loading.value = false;
  }
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}

function showSuccess(message: string) {
  successMessage.value = message;
  setTimeout(() => {
    successMessage.value = '';
  }, 2000);
}

onMounted(async () => {
  loading.value = true;
  await overlayStore.fetchAnnouncements();
  localAnnouncements.value = [...overlayStore.announcements.announcements];
  loading.value = false;
});
</script>

<style scoped>
.config-panel {
  position: relative;
}

.panel-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 18px;
  font-weight: 700;
  color: theme('colors.mission.accent');
  text-transform: uppercase;
  margin-bottom: 24px;
  letter-spacing: 0.05em;
}

.loading-overlay {
  @apply absolute inset-0 bg-mission-black/80 flex items-center justify-center rounded;
}

.loading-spinner {
  @apply w-10 h-10 border-2 border-white/20 border-t-mission-accent rounded-full;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.success-message {
  @apply mt-4 p-3 bg-green-500/10 border border-green-500/30 text-green-500 font-mono text-sm rounded text-center;
}
</style>
