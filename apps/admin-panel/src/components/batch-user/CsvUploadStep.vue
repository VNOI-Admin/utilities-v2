<template>
  <div class="space-y-6">
    <div class="text-center">
      <h3 class="text-lg font-display font-semibold mb-2">Import CSV Data</h3>
      <p class="text-gray-400 text-sm">
        Upload a CSV file or paste CSV data. The data should have headers in the first row.
      </p>
    </div>

    <!-- Input Mode Toggle -->
    <div class="flex justify-center gap-2">
      <button
        type="button"
        @click="inputMode = 'file'"
        class="px-4 py-2 font-mono text-xs uppercase tracking-wider transition-all border"
        :class="inputMode === 'file'
          ? 'border-mission-accent text-mission-accent bg-mission-accent/10'
          : 'border-white/20 text-gray-400 hover:border-white/40'"
      >
        <Upload :size="16" class="inline mr-2" />
        Upload File
      </button>
      <button
        type="button"
        @click="inputMode = 'paste'"
        class="px-4 py-2 font-mono text-xs uppercase tracking-wider transition-all border"
        :class="inputMode === 'paste'
          ? 'border-mission-accent text-mission-accent bg-mission-accent/10'
          : 'border-white/20 text-gray-400 hover:border-white/40'"
      >
        <ClipboardPaste :size="16" class="inline mr-2" />
        Paste Text
      </button>
    </div>

    <!-- File Upload Mode -->
    <div
      v-if="inputMode === 'file'"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      @click="triggerFileInput"
      class="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-300"
      :class="[
        isDragging
          ? 'border-mission-accent bg-mission-accent/10'
          : file
            ? 'border-mission-accent/50 bg-mission-accent/5'
            : 'border-white/20 hover:border-white/40 hover:bg-white/5',
      ]"
    >
      <input
        ref="fileInputRef"
        type="file"
        accept=".csv"
        @change="handleFileSelect"
        class="hidden"
      />

      <template v-if="file">
        <FileSpreadsheet :size="48" class="mx-auto mb-4 text-mission-accent" />
        <p class="font-mono text-mission-accent">{{ file.name }}</p>
        <p class="text-sm text-gray-400 mt-1">
          {{ formatFileSize(file.size) }} | {{ rows.length }} rows detected
        </p>
        <button
          type="button"
          @click.stop="clearData"
          class="mt-4 text-sm text-mission-red hover:underline"
        >
          Remove file
        </button>
      </template>

      <template v-else>
        <Upload :size="48" class="mx-auto mb-4 text-gray-500" />
        <p class="font-mono text-gray-300">
          {{ isDragging ? 'DROP FILE HERE' : 'DRAG & DROP OR CLICK TO SELECT' }}
        </p>
        <p class="text-sm text-gray-500 mt-2">Supports .csv files</p>
      </template>
    </div>

    <!-- Text Paste Mode -->
    <div v-if="inputMode === 'paste'" class="space-y-4">
      <textarea
        v-model="pastedText"
        @input="handleTextInput"
        class="input-mission w-full h-48 font-mono text-sm resize-none"
        placeholder="Paste CSV data here...&#10;&#10;Example:&#10;username,fullName,password,group&#10;john_doe,John Doe,password123,Team A&#10;jane_doe,Jane Doe,password456,Team B"
      ></textarea>
      <div class="flex items-center justify-between">
        <p class="text-xs text-gray-500">
          Paste data with headers in the first row. Columns separated by commas.
        </p>
        <button
          v-if="pastedText"
          type="button"
          @click="clearData"
          class="text-sm text-mission-red hover:underline"
        >
          Clear text
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center gap-2 text-gray-400">
      <RotateCw :size="20" class="animate-spin" />
      <span>Parsing file...</span>
    </div>

    <!-- Error Message -->
    <div
      v-if="error"
      class="p-4 border border-mission-red bg-mission-red/10 text-mission-red text-sm font-mono"
    >
      {{ error }}
    </div>

    <!-- File Preview -->
    <div v-if="file && headers.length > 0" class="space-y-4">
      <div class="flex items-center gap-2">
        <CheckCircle :size="20" class="text-mission-accent" />
        <span class="text-sm text-gray-300">
          Detected {{ headers.length }} columns and {{ rows.length }} data rows
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-white/10">
              <th
                v-for="header in headers"
                :key="header"
                class="px-3 py-2 text-left font-mono text-xs text-gray-400 uppercase tracking-wider"
              >
                {{ header }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, index) in previewRows"
              :key="index"
              class="border-b border-white/5"
            >
              <td
                v-for="(cell, cellIndex) in row"
                :key="cellIndex"
                class="px-3 py-2 font-mono text-gray-300 truncate max-w-[150px]"
              >
                {{ cell || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="rows.length > 5" class="text-xs text-gray-500 text-center">
        Showing first 5 of {{ rows.length }} rows
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Upload, FileSpreadsheet, RotateCw, CheckCircle, ClipboardPaste } from 'lucide-vue-next';
import { useCsvParser } from '~/composables/useCsvParser';

const file = defineModel<File | null>('file', { required: true });
const headers = defineModel<string[]>('headers', { required: true });
const rows = defineModel<string[][]>('rows', { required: true });

interface Props {
  error: string;
}

defineProps<Props>();
const emit = defineEmits<{
  'update:error': [value: string];
}>();

const fileInputRef = ref<HTMLInputElement>();
const isDragging = ref(false);
const inputMode = ref<'file' | 'paste'>('file');
const pastedText = ref('');
const { parseFile, isLoading } = useCsvParser();

const previewRows = computed(() => rows.value.slice(0, 5));

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function triggerFileInput() {
  fileInputRef.value?.click();
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const selectedFile = input.files?.[0];
  if (selectedFile) {
    await processFile(selectedFile);
  }
}

async function handleDrop(event: DragEvent) {
  isDragging.value = false;
  const droppedFile = event.dataTransfer?.files?.[0];
  if (droppedFile) {
    await processFile(droppedFile);
  }
}

async function processFile(selectedFile: File) {
  emit('update:error', '');
  const result = await parseFile(selectedFile);

  if (result) {
    file.value = selectedFile;
    headers.value = result.headers;
    rows.value = result.rows;
  } else {
    emit('update:error', 'Failed to parse CSV file. Please check the format.');
    clearData();
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

function handleTextInput() {
  emit('update:error', '');

  if (!pastedText.value.trim()) {
    headers.value = [];
    rows.value = [];
    return;
  }

  try {
    const lines = pastedText.value.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) {
      headers.value = [];
      rows.value = [];
      return;
    }

    const parsedHeaders = parseCSVLine(lines[0]);
    const parsedRows = lines.slice(1).map((line) => parseCSVLine(line));

    if (parsedHeaders.length === 0) {
      emit('update:error', 'No columns found in pasted data');
      return;
    }

    file.value = null; // Clear file when using paste mode
    headers.value = parsedHeaders;
    rows.value = parsedRows;
  } catch {
    emit('update:error', 'Failed to parse pasted data');
  }
}

function clearData() {
  file.value = null;
  headers.value = [];
  rows.value = [];
  pastedText.value = '';
  emit('update:error', '');
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
}
</script>
