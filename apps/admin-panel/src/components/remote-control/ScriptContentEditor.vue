<template>
  <div class="flex-1 min-h-0 min-w-0 flex flex-col">
    <div class="editor-shell flex-1 min-h-0">
      <div
        ref="lineNumberRef"
        class="line-gutter"
        :style="{ width: gutterWidth }"
      >
        <div
          v-for="line in lineNumbers"
          :key="line"
          class="line-gutter-item"
        >
          {{ line }}
        </div>
      </div>

      <div class="editor-content">
        <pre ref="highlightRef" class="highlight-layer"><code class="hljs" v-html="highlightedHtml"></code></pre>
        <textarea
          ref="textareaRef"
          :value="modelValue"
          :placeholder="placeholder"
          :disabled="disabled"
          class="input-layer"
          spellcheck="false"
          @input="handleInput"
          @scroll="syncScroll"
          @keydown.tab.prevent="handleTab"
        />
      </div>
    </div>

    <div class="mt-2 flex items-center justify-end">
      <select
        v-model="selectedLanguage"
        class="lang-select"
      >
        <option
          v-for="language in SUPPORTED_LANGUAGES"
          :key="language"
          :value="language"
        >
          {{ language.toUpperCase() }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import 'highlight.js/styles/github-dark.css';
import hljs from 'highlight.js/lib/common';

interface Props {
  modelValue: string;
  disabled?: boolean;
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  placeholder: '',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const SUPPORTED_LANGUAGES = hljs.listLanguages().slice().sort();
type SupportedLanguage = string;
const DEFAULT_LANGUAGE: SupportedLanguage = SUPPORTED_LANGUAGES[0];

const languageOverride = ref<SupportedLanguage | null>(null);
const hasManualOverride = ref(false);

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const highlightRef = ref<HTMLElement | null>(null);
const lineNumberRef = ref<HTMLElement | null>(null);

const lineNumbers = computed(() => {
  const lines = Math.max(1, (props.modelValue || '').split('\n').length);
  return Array.from({ length: lines }, (_, index) => index + 1);
});

const gutterWidth = computed(() => {
  const digits = Math.max(2, String(lineNumbers.value.length).length);
  return `${digits * 9 + 18}px`;
});

const autoHighlightResult = computed(() => {
  if (!props.modelValue) {
    return { html: '&nbsp;', language: DEFAULT_LANGUAGE };
  }

  try {
    const result = hljs.highlightAuto(props.modelValue, [...SUPPORTED_LANGUAGES]);
    return {
      html: `${result.value}\n`,
      language: isSupportedLanguage(result.language) ? result.language : DEFAULT_LANGUAGE,
    };
  } catch {
    return {
      html: `${escapeHtml(props.modelValue)}\n`,
      language: DEFAULT_LANGUAGE,
    };
  }
});

const selectedLanguage = computed<SupportedLanguage>({
  get() {
    if (hasManualOverride.value && languageOverride.value) {
      return languageOverride.value;
    }

    return autoHighlightResult.value.language;
  },
  set(value) {
    languageOverride.value = value;
    hasManualOverride.value = true;
  },
});

const highlightedHtml = computed(() => {
  if (!props.modelValue) {
    return '&nbsp;';
  }

  if (!hasManualOverride.value || !languageOverride.value) {
    return autoHighlightResult.value.html;
  }

  try {
    const result = hljs.highlight(props.modelValue, { language: languageOverride.value });
    return `${result.value}\n`;
  } catch {
    return `${escapeHtml(props.modelValue)}\n`;
  }
});

function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement;
  emit('update:modelValue', target.value);
}

function syncScroll(event: Event) {
  const target = event.target as HTMLTextAreaElement;
  if (highlightRef.value) {
    highlightRef.value.scrollTop = target.scrollTop;
    highlightRef.value.scrollLeft = target.scrollLeft;
  }
  if (lineNumberRef.value) {
    lineNumberRef.value.scrollTop = target.scrollTop;
  }
}

function handleTab(event: KeyboardEvent) {
  const textarea = event.target as HTMLTextAreaElement;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = props.modelValue || '';
  const nextValue = `${value.slice(0, start)}\t${value.slice(end)}`;
  emit('update:modelValue', nextValue);

  nextTick(() => {
    if (!textareaRef.value) return;
    textareaRef.value.selectionStart = start + 1;
    textareaRef.value.selectionEnd = start + 1;
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isSupportedLanguage(value?: string): value is SupportedLanguage {
  if (!value) return false;
  return SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
}
</script>

<style scoped>
.editor-shell {
  display: flex;
  min-height: 0;
  border: 1px solid rgb(255 255 255 / 0.1);
  background: rgb(0 0 0 / 0.35);
  overflow: hidden;
}

.line-gutter {
  border-right: 1px solid rgb(255 255 255 / 0.1);
  background: rgb(255 255 255 / 0.03);
  overflow: hidden;
  padding: 12px 8px 12px 10px;
}

.line-gutter-item {
  height: 24px;
  line-height: 24px;
  text-align: right;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: rgb(107 114 128);
  user-select: none;
}

.editor-content {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.highlight-layer,
.input-layer {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 12px 16px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  line-height: 24px;
  white-space: pre;
  overflow: auto;
  tab-size: 2;
}

.highlight-layer {
  pointer-events: none;
}

.highlight-layer .hljs {
  display: block;
  min-height: 100%;
  background: transparent !important;
  padding: 0 !important;
}

.input-layer {
  border: 0;
  outline: none;
  resize: none;
  background: transparent;
  color: transparent;
  caret-color: rgb(243 244 246);
}

.input-layer::placeholder {
  color: rgb(107 114 128);
}

.input-layer::selection {
  background: rgb(34 211 238 / 0.3);
}

.input-layer:disabled {
  cursor: not-allowed;
}

.lang-select {
  height: 30px;
  min-width: 110px;
  border: 1px solid rgb(255 255 255 / 0.15);
  background: rgb(17 24 39 / 0.8);
  color: rgb(209 213 219);
  padding: 0 10px;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  outline: none;
}

.lang-select:focus {
  border-color: rgb(34 211 238 / 0.6);
}
</style>
