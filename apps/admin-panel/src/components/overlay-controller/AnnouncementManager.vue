<template>
  <div class="config-panel">
    <h2 class="panel-title">Announcements</h2>

    <!-- Add New Announcement -->
    <form class="flex flex-col gap-3 mb-6" @submit.prevent="addAnnouncement">
      <textarea
        v-model="newAnnouncement.text"
        class="input-mission resize-y"
        placeholder="Write an announcement"
        aria-label="New announcement"
        rows="2"
      />
      <div class="flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-2 text-sm text-mission-muted">
          Priority
          <input
            v-model.number="newAnnouncement.priority"
            type="number"
            class="input-mission !w-20 tabular-nums"
            placeholder="0"
            min="0"
            max="100"
          />
        </label>
        <span class="text-xs text-mission-muted">Higher shows first.</span>
        <button
          type="submit"
          class="btn-primary ml-auto"
          :disabled="!newAnnouncement.text.trim()"
        >
          <Plus :size="16" :stroke-width="2" />
          Add
        </button>
      </div>
    </form>

    <!-- Announcements List -->
    <div v-if="localAnnouncements.length > 0">
      <h3 class="tech-label mb-2">Showing {{ localAnnouncements.length }}</h3>
      <ul class="divide-y divide-white/[0.06] rounded-xl border border-white/[0.06]">
        <li
          v-for="announcement in sortedAnnouncements"
          :key="announcement.id"
          class="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
        >
          <span
            class="mt-0.5 px-2 py-0.5 rounded-full bg-white/5 text-xs text-mission-muted tabular-nums flex-shrink-0"
            title="Priority"
          >{{ announcement.priority || 0 }}</span>
          <div class="flex-1 min-w-0">
            <div class="text-sm leading-relaxed break-words">{{ announcement.text }}</div>
            <div class="text-xs text-mission-muted mt-1">Added {{ formatTime(announcement.timestamp) }}</div>
          </div>
          <button
            type="button"
            class="p-2 -m-1 rounded-lg text-mission-muted hover:text-mission-red hover:bg-mission-red/10 transition-colors flex-shrink-0"
            title="Remove announcement"
            @click="removeAnnouncement(announcement.id)"
          >
            <Trash2 :size="16" :stroke-width="2" />
          </button>
        </li>
      </ul>
    </div>

    <p v-else class="py-10 text-center text-sm text-mission-muted">
      No announcements yet.
    </p>

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
import { Plus, Trash2 } from 'lucide-vue-next';
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
@import './panel-styles.css';
</style>
