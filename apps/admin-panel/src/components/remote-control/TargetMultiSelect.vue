<template>
  <div ref="containerRef" class="relative">
    <div
      class="input-mission min-h-[50px] cursor-text"
      :class="{ 'border-mission-accent': isOpen }"
      @click="openDropdown"
    >
      <div class="flex flex-wrap gap-2 items-center">
        <span
          v-for="target in selectedTargets"
          :key="target.username"
          class="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono rounded border border-mission-accent/60 bg-mission-accent/10 text-mission-accent"
        >
          <span class="truncate max-w-[180px]">{{ target.username }}</span>
          <button
            type="button"
            class="text-mission-accent/80 hover:text-mission-red transition-colors"
            @click.stop="removeTarget(target.username)"
          >
            <X :size="12" :stroke-width="2" />
          </button>
        </span>

        <input
          ref="searchInputRef"
          v-model="query"
          type="text"
          class="flex-1 min-w-[160px] bg-transparent border-none outline-none font-mono text-sm text-white placeholder-gray-500"
          :placeholder="selectedTargets.length === 0 ? placeholder : 'Search targets...'"
          @focus="isOpen = true"
          @keydown.esc.prevent="isOpen = false"
        />
      </div>
    </div>

    <Teleport to="body">
      <Transition name="dropdown">
        <div
          v-if="isOpen"
          ref="dropdownRef"
          class="fixed z-[10001] mission-card border border-white/20 overflow-hidden shadow-2xl flex flex-col"
          :style="dropdownStyle"
        >
          <div class="p-2 border-b border-white/10 bg-black/20 shrink-0">
            <div class="grid grid-cols-1 gap-2">
              <button
                type="button"
                class="w-full px-3 py-2 text-xs font-mono uppercase tracking-wider border transition-all duration-200 flex items-center justify-between"
                :class="allContestantsSelected
                  ? 'border-mission-accent bg-mission-accent/10 text-mission-accent'
                  : 'border-white/20 text-gray-300 hover:border-mission-accent/50 hover:text-white'"
                @click.stop="toggleContestants"
              >
                <span>All contestants</span>
                <span class="text-[10px] opacity-80">{{ contestantUsernames.length }}</span>
              </button>

              <button
                type="button"
                class="w-full px-3 py-2 text-xs font-mono uppercase tracking-wider border transition-all duration-200 flex items-center justify-between"
                :class="allGuestsSelected
                  ? 'border-mission-accent bg-mission-accent/10 text-mission-accent'
                  : 'border-white/20 text-gray-300 hover:border-mission-accent/50 hover:text-white'"
                @click.stop="toggleGuests"
              >
                <span>All guests</span>
                <span class="text-[10px] opacity-80">{{ guestUsernames.length }}</span>
              </button>
            </div>
          </div>

          <div class="overflow-y-auto custom-scrollbar flex-1">
            <button
              v-for="option in filteredOptions"
              :key="option.username"
              type="button"
              class="w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left border-l-2 border-transparent transition-all duration-200"
              :class="isSelected(option.username)
                ? 'bg-mission-accent/10 border-mission-accent text-mission-accent'
                : 'text-gray-300 hover:bg-mission-accent/5 hover:border-mission-accent/50 hover:text-white'"
              @click="toggleTarget(option.username)"
            >
              <div class="min-w-0">
                <p class="font-mono text-sm truncate">{{ option.username }}</p>
                <p class="text-xs text-gray-500 truncate">{{ option.fullName }}</p>
              </div>
              <Check
                v-if="isSelected(option.username)"
                :size="16"
                :stroke-width="2"
              />
            </button>

            <div
              v-if="filteredOptions.length === 0"
              class="px-4 py-8 text-center text-gray-500 text-sm font-mono"
            >
              NO TARGETS FOUND
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Check, X } from 'lucide-vue-next';
import type { RemoteControlTargetOption } from '~/types/remote-control';

interface Props {
  modelValue: string[];
  options: RemoteControlTargetOption[];
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Select targets...',
});

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

const containerRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);
const query = ref('');
const isOpen = ref(false);
const dropdownStyle = ref<Record<string, string>>({});

const selectedSet = computed(() => new Set(props.modelValue));

const selectedTargets = computed(() => {
  return props.options.filter((option) => selectedSet.value.has(option.username));
});

const filteredOptions = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  if (!keyword) return props.options;

  return props.options.filter((option) => {
    return option.username.toLowerCase().includes(keyword)
      || option.fullName.toLowerCase().includes(keyword);
  });
});

const contestantUsernames = computed(() => {
  return props.options
    .filter((option) => option.role === 'contestant')
    .map((option) => option.username);
});

const guestUsernames = computed(() => {
  return props.options
    .filter((option) => option.role === 'guest')
    .map((option) => option.username);
});

const allContestantsSelected = computed(() => {
  return contestantUsernames.value.length > 0
    && contestantUsernames.value.every((username) => selectedSet.value.has(username));
});

const allGuestsSelected = computed(() => {
  return guestUsernames.value.length > 0
    && guestUsernames.value.every((username) => selectedSet.value.has(username));
});

function isSelected(username: string) {
  return selectedSet.value.has(username);
}

function openDropdown() {
  isOpen.value = true;
  nextTick(() => {
    updateDropdownPosition();
    searchInputRef.value?.focus();
  });
}

function toggleTarget(username: string) {
  if (selectedSet.value.has(username)) {
    emit('update:modelValue', props.modelValue.filter((item) => item !== username));
    return;
  }

  emit('update:modelValue', [...props.modelValue, username]);
}

function removeTarget(username: string) {
  emit('update:modelValue', props.modelValue.filter((item) => item !== username));
}

function toggleGroupTargets(usernames: string[]) {
  if (usernames.length === 0) return;

  const allSelected = usernames.every((username) => selectedSet.value.has(username));

  if (allSelected) {
    emit('update:modelValue', props.modelValue.filter((item) => !usernames.includes(item)));
    return;
  }

  emit('update:modelValue', [...new Set([...props.modelValue, ...usernames])]);
}

function toggleContestants() {
  toggleGroupTargets(contestantUsernames.value);
}

function toggleGuests() {
  toggleGroupTargets(guestUsernames.value);
}

function onDocumentClick(event: MouseEvent) {
  const target = event.target as Node;
  if (!containerRef.value) return;
  if (containerRef.value.contains(target)) return;
  if (dropdownRef.value?.contains(target)) return;
  isOpen.value = false;
}

function updateDropdownPosition() {
  if (!containerRef.value || !isOpen.value) return;

  const rect = containerRef.value.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  const gap = 8;
  const minHeight = 180;
  const maxPreferredHeight = 420;
  const spaceBelow = viewportHeight - rect.bottom - gap;
  const spaceAbove = rect.top - gap;
  const showAbove = spaceBelow < minHeight && spaceAbove > spaceBelow;
  const availableSpace = showAbove ? spaceAbove : spaceBelow;
  const maxHeight = Math.max(minHeight, Math.min(maxPreferredHeight, availableSpace));
  const left = Math.max(gap, Math.min(rect.left, viewportWidth - rect.width - gap));

  dropdownStyle.value = {
    width: `${rect.width}px`,
    left: `${left}px`,
    maxHeight: `${maxHeight}px`,
    ...(showAbove
      ? { bottom: `${viewportHeight - rect.top + gap}px` }
      : { top: `${rect.bottom + gap}px` }),
  };
}

watch(isOpen, (open) => {
  if (!open) {
    query.value = '';
    return;
  }

  nextTick(() => {
    updateDropdownPosition();
  });
});

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
  window.addEventListener('scroll', updateDropdownPosition, true);
  window.addEventListener('resize', updateDropdownPosition);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick);
  window.removeEventListener('scroll', updateDropdownPosition, true);
  window.removeEventListener('resize', updateDropdownPosition);
});
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

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
</style>
