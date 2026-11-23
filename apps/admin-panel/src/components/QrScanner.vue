<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex flex-col bg-black">
      <div class="relative flex-1 min-h-0 overflow-hidden">
        <video ref="video" class="absolute inset-0 w-full h-full object-cover" autoplay muted playsinline />
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            class="w-64 h-64 max-w-[70vw] max-h-[70vw] border-2 border-mission-accent/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
          />
        </div>
        <p
          v-if="error"
          class="absolute inset-x-4 top-1/2 -translate-y-1/2 p-4 bg-mission-dark border border-mission-red text-mission-red text-sm font-mono"
        >
          {{ error }}
        </p>
        <button
          type="button"
          class="absolute top-4 right-4 p-2 bg-black/60 text-white hover:text-mission-red"
          aria-label="Close scanner"
          @click="emit('close')"
        >
          <X :size="28" />
        </button>
      </div>
      <div class="bg-mission-dark border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import jsQR from 'jsqr';
import { onMounted, onUnmounted, ref } from 'vue';

const emit = defineEmits<{ detect: [text: string]; close: [] }>();

const SCAN_MAX_PX = 800;
const SCAN_INTERVAL_MS = 150;

const video = ref<HTMLVideoElement | null>(null);
const error = ref('');
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
let stream: MediaStream | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
let closed = false;
let last = '';

function scanFrame() {
  const v = video.value;
  if (!v || !v.videoWidth) return;
  const scale = Math.min(1, SCAN_MAX_PX / Math.max(v.videoWidth, v.videoHeight));
  const width = Math.round(v.videoWidth * scale);
  const height = Math.round(v.videoHeight * scale);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  ctx.drawImage(v, 0, 0, width, height);
  const text = jsQR(ctx.getImageData(0, 0, width, height).data, width, height, { inversionAttempts: 'dontInvert' })?.data;
  if (!text || text === last) return;
  last = text;
  navigator.vibrate?.(60);
  emit('detect', text);
}

onMounted(async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
  } catch (e: any) {
    error.value = !window.isSecureContext
      ? 'The camera only works over HTTPS. Open the admin panel through its https:// address.'
      : e?.name === 'NotAllowedError'
        ? "Camera access was blocked. Allow the camera for this site in the browser's settings, then reopen the scanner."
        : `Camera unavailable: ${e?.message || e}. Type the code from the machine's screen instead.`;
    return;
  }
  if (closed) {
    stream.getTracks().forEach((t) => t.stop());
    return;
  }
  video.value!.srcObject = stream;
  timer = setInterval(scanFrame, SCAN_INTERVAL_MS);
});

onUnmounted(() => {
  closed = true;
  clearInterval(timer);
  stream?.getTracks().forEach((t) => t.stop());
});
</script>
