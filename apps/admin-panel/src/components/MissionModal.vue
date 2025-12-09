<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        @click.self="handleClose"
      >
        <div
          class="mission-card w-full mx-2 md:mx-4 glow-border overflow-hidden max-h-[90vh] overflow-y-auto"
          :class="maxWidthClass"
          style="animation: slideInModal 0.3s ease-out"
        >
          <!-- Modal Header -->
          <div class="px-4 md:px-6 py-4 border-b border-white/10 bg-mission-gray sticky top-0 z-10">
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-display font-bold text-glow flex items-center gap-2">
                <span class="text-mission-accent">█</span>
                {{ title }}
              </h2>
              <button
                @click="handleClose"
                class="text-gray-400 hover:text-mission-red transition-colors"
                type="button"
              >
                <X :size="24" :stroke-width="2" />
              </button>
            </div>
          </div>

          <!-- Modal Body -->
          <div class="p-4 md:p-6">
            <slot />

            <!-- Error Message -->
            <div v-if="error" class="mt-4 p-3 border border-mission-red bg-mission-red/10 text-mission-red text-sm font-mono">
              {{ error }}
            </div>

            <!-- Actions (if not using custom footer or actions) -->
            <div v-if="!$slots.footer && !$slots.actions && showActions" class="flex items-center gap-3 pt-4">
              <button
                v-if="confirmText"
                type="submit"
                :disabled="loading"
                class="btn-primary flex-1 flex items-center justify-center gap-2"
                @click="$emit('confirm')"
              >
                <RotateCw
                  v-if="loading"
                  :size="20"
                  :stroke-width="2"
                  class="animate-spin"
                />
                <span>{{ loading ? loadingText : confirmText }}</span>
              </button>
              <button
                v-if="cancelText"
                type="button"
                @click="handleClose"
                class="btn-secondary px-8"
              >
                {{ cancelText }}
              </button>
            </div>

            <!-- Custom Actions Slot -->
            <div v-if="$slots.actions" class="flex items-center justify-end gap-3 pt-4">
              <slot name="actions" />
            </div>

            <!-- Custom Footer Slot -->
            <div v-if="$slots.footer" class="pt-4">
              <slot name="footer" />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { X, RotateCw } from 'lucide-vue-next';

interface Props {
  show: boolean;
  title: string;
  error?: string;
  loading?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  confirmText?: string;
  cancelText?: string;
  loadingText?: string;
  showActions?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  error: '',
  loading: false,
  maxWidth: 'lg',
  confirmText: '',
  cancelText: 'CANCEL',
  loadingText: 'LOADING...',
  showActions: true,
});

const emit = defineEmits<{
  close: [];
  confirm: [];
}>();

const maxWidthClass = computed(() => {
  // Apply max-width only on md+ screens, full width on mobile
  const widthMap = {
    sm: 'md:max-w-sm',
    md: 'md:max-w-md',
    lg: 'md:max-w-lg',
    xl: 'md:max-w-xl',
    '2xl': 'md:max-w-2xl',
    '3xl': 'md:max-w-3xl',
    '4xl': 'md:max-w-4xl',
  };
  return widthMap[props.maxWidth];
});

function handleClose() {
  if (!props.loading) {
    emit('close');
  }
}
</script>

<style scoped>
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
