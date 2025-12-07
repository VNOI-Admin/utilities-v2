<template>
  <div class="relative" ref="selectRef">
    <!-- Select Button/Trigger -->
    <button
      type="button"
      @click="toggleDropdown"
      class="input-mission w-full text-left flex items-center justify-between"
      :class="{ 'border-mission-accent': isOpen }"
    >
      <span v-if="selectedOption" class="truncate">
        <slot name="selected" :option="selectedOption">
          {{ getOptionLabel(selectedOption) }}
        </slot>
      </span>
      <span v-else class="text-gray-500">{{ placeholder }}</span>
      <ChevronDown
        :size="16"
        :stroke-width="2"
        class="ml-2 transition-transform flex-shrink-0"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <!-- Dropdown List -->
    <Teleport to="body">
      <Transition name="dropdown">
        <div
          v-if="isOpen"
          ref="dropdownRef"
          class="fixed z-[9999] mission-card border border-white/20 overflow-hidden shadow-2xl"
          :style="dropdownStyle"
        >
        <!-- Search Input -->
        <div v-if="searchable" class="p-2 border-b border-white/10">
          <div class="relative">
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              placeholder="Search..."
              class="input-mission w-full pl-8 text-sm"
              @click.stop
            />
            <Search
              :size="16"
              :stroke-width="2"
              class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
            />
          </div>
        </div>

        <!-- Options List -->
        <div class="max-h-60 overflow-y-auto custom-scrollbar">
          <button
            v-for="(option, index) in filteredOptions"
            :key="getOptionValue(option)"
            type="button"
            @click="selectOption(option)"
            :disabled="isOptionDisabled(option)"
            class="w-full px-4 py-2.5 text-left text-sm transition-all duration-200 border-l-2 border-transparent"
            :class="[
              isOptionSelected(option)
                ? 'bg-mission-accent/10 border-mission-accent text-mission-accent font-semibold'
                : isOptionDisabled(option)
                  ? 'text-gray-600 cursor-not-allowed opacity-50'
                  : 'text-gray-300 hover:bg-mission-accent/5 hover:border-mission-accent/50 hover:text-white',
            ]"
          >
            <slot name="option" :option="option" :index="index" :selected="isOptionSelected(option)">
              {{ getOptionLabel(option) }}
            </slot>
          </button>

          <!-- Empty State -->
          <div
            v-if="filteredOptions.length === 0"
            class="px-4 py-8 text-center text-gray-500 text-sm font-mono"
          >
            <Archive :size="48" :stroke-width="2" class="mx-auto mb-2 text-gray-600" />
            NO OPTIONS FOUND
          </div>
        </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts" generic="T">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { ChevronDown, Search, Archive } from 'lucide-vue-next';

interface Props {
  modelValue: T | null | undefined;
  options: T[];
  placeholder?: string;
  searchable?: boolean;
  optionLabel?: string | ((option: T) => string);
  optionValue?: string | ((option: T) => any);
  disabledOptions?: (option: T) => boolean;
  dropdownPosition?: 'bottom' | 'top' | 'auto';
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '-- Select --',
  searchable: true,
  optionLabel: 'label',
  optionValue: 'value',
  dropdownPosition: 'bottom',
});

const emit = defineEmits<{
  'update:modelValue': [value: T | null];
}>();

const selectRef = ref<HTMLElement>();
const searchInputRef = ref<HTMLInputElement>();
const dropdownRef = ref<HTMLElement>();
const isOpen = ref(false);
const searchQuery = ref('');
const dropdownStyle = ref({});

const selectedOption = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined) return null;
  return props.options.find(opt => getOptionValue(opt) === props.modelValue);
});

const filteredOptions = computed(() => {
  if (!props.searchable || !searchQuery.value) {
    return props.options;
  }

  const query = searchQuery.value.toLowerCase();
  return props.options.filter(option => {
    const label = getOptionLabel(option).toLowerCase();
    return label.includes(query);
  });
});

function getOptionLabel(option: T): string {
  if (!option) return '';
  if (typeof props.optionLabel === 'function') {
    return props.optionLabel(option);
  }
  return (option as any)[props.optionLabel] || String(option);
}

function getOptionValue(option: T): any {
  if (!option) return null;
  if (typeof props.optionValue === 'function') {
    return props.optionValue(option);
  }
  return (option as any)[props.optionValue] !== undefined
    ? (option as any)[props.optionValue]
    : option;
}

function isOptionSelected(option: T): boolean {
  return getOptionValue(option) === props.modelValue;
}

function isOptionDisabled(option: T): boolean {
  return props.disabledOptions ? props.disabledOptions(option) : false;
}

function updateDropdownPosition() {
  if (!selectRef.value) return;

  const rect = selectRef.value.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - rect.bottom;
  const spaceAbove = rect.top;
  const dropdownMaxHeight = 240 + 60; // max-h-60 (240px) + padding/search

  // Determine if dropdown should appear above or below
  const shouldShowAbove = props.dropdownPosition === 'top' ||
    (props.dropdownPosition === 'auto' && spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow);

  dropdownStyle.value = {
    width: `${rect.width}px`,
    left: `${rect.left}px`,
    ...(shouldShowAbove
      ? { bottom: `${viewportHeight - rect.top + 8}px` }
      : { top: `${rect.bottom + 8}px` }
    ),
  };
}

function toggleDropdown() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    setTimeout(() => {
      updateDropdownPosition();
    }, 0);
  }
}

function selectOption(option: T) {
  if (isOptionDisabled(option)) return;
  emit('update:modelValue', getOptionValue(option) as T);
  isOpen.value = false;
  searchQuery.value = '';
}

function handleClickOutside(event: MouseEvent) {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    isOpen.value = false;
    searchQuery.value = '';
  }
}

watch(isOpen, (newValue) => {
  if (newValue && props.searchable) {
    // Focus search input when dropdown opens
    setTimeout(() => {
      searchInputRef.value?.focus();
    }, 50);
  }
});

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('scroll', updateDropdownPosition, true);
  window.addEventListener('resize', updateDropdownPosition);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
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
  transform: scale(0.95);
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
