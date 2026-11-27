<template>
  <div ref="containerRef" class="relative">
    <div
      class="input-mission min-h-[44px] cursor-text"
      :class="{ 'border-mission-accent': isOpen }"
      @click="openDropdown"
    >
      <div class="flex flex-wrap gap-2 items-center">
        <span
          v-for="target in selectedTargets"
          :key="target.username"
          class="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 text-xs font-mono rounded-full"
          :class="target.isOnline ? 'bg-mission-accent/15 text-mission-accent' : 'bg-white/5 text-mission-muted line-through'"
          :title="target.isOnline ? undefined : 'Offline'"
        >
          <span class="truncate max-w-[180px]">{{ target.username }}</span>
          <button
            type="button"
            class="text-mission-accent/70 hover:text-mission-red transition-colors"
            @click.stop="removeTarget(target.username)"
          >
            <X :size="12" :stroke-width="2" />
          </button>
        </span>

        <input
          ref="searchInputRef"
          v-model="query"
          type="text"
          class="flex-1 min-w-[160px] bg-transparent border-none outline-none text-sm text-gray-100 placeholder-mission-muted"
          :placeholder="selectedTargets.length === 0 ? placeholder : 'Search machines'"
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
          class="fixed z-[10001] mission-card !rounded-xl border-white/10 overflow-hidden shadow-2xl flex flex-col"
          :style="dropdownStyle"
        >
          <div class="p-2 border-b border-white/[0.06] shrink-0">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="preset in presets"
                :key="preset.label"
                type="button"
                class="px-3 py-1 rounded-full border text-xs inline-flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                :class="allSelected(preset.usernames)
                  ? 'border-gray-100 bg-gray-100 text-mission-ink'
                  : 'border-white/10 text-mission-muted hover:text-gray-100'"
                :disabled="preset.usernames.length === 0"
                @click.stop="toggleGroupTargets(preset.usernames)"
              >
                <span v-if="preset.online" class="w-1.5 h-1.5 rounded-full bg-mission-ok" />
                <span>{{ preset.label }}</span>
                <span class="opacity-70 tabular-nums">{{ preset.usernames.length }}</span>
              </button>
            </div>
          </div>

          <div class="overflow-y-auto custom-scrollbar flex-1">
            <button
              v-for="option in filteredOptions"
              :key="option.username"
              type="button"
              class="w-full px-3 py-2 flex items-center justify-between gap-3 text-left transition-colors"
              :class="isSelected(option.username)
                ? 'bg-mission-accent/10 text-mission-accent'
                : 'text-gray-100 hover:bg-white/[0.04]'"
              @click="toggleTarget(option.username)"
            >
              <div class="min-w-0">
                <p class="font-mono text-sm truncate flex items-center gap-2">
                  <span
                    class="w-1.5 h-1.5 rounded-full shrink-0"
                    :class="option.isOnline ? 'bg-mission-ok' : 'bg-white/20'"
                    :title="option.isOnline ? 'Online' : 'Offline'"
                  />
                  {{ option.username }}
                </p>
                <p class="text-xs text-mission-muted truncate">{{ option.fullName }}</p>
              </div>
              <Check
                v-if="isSelected(option.username)"
                :size="16"
                :stroke-width="2"
              />
            </button>

            <div
              v-if="filteredOptions.length === 0"
              class="px-4 py-8 text-center text-mission-muted text-sm"
            >
              No machines found
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
  placeholder: 'Select machines',
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

function usernames(role: RemoteControlTargetOption['role'], onlineOnly: boolean) {
  return props.options
    .filter((option) => option.role === role && (!onlineOnly || option.isOnline))
    .map((option) => option.username);
}

const presets = computed(() => [
  { label: 'All contestants', online: false, usernames: usernames('contestant', false) },
  { label: 'Online contestants', online: true, usernames: usernames('contestant', true) },
  { label: 'All guests', online: false, usernames: usernames('guest', false) },
  { label: 'Online guests', online: true, usernames: usernames('guest', true) },
]);

function allSelected(list: string[]) {
  return list.length > 0 && list.every((username) => selectedSet.value.has(username));
}

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
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #2a2a34;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(139, 139, 154, 0.5);
}
</style>
