import { ref } from 'vue';

export interface CsvParseResult {
  headers: string[];
  rows: string[][];
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

function parseCSV(content: string): CsvParseResult {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) {
    throw new Error('Empty file');
  }

  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map((line) => parseCSVLine(line));

  return { headers, rows };
}

export function useCsvParser() {
  const parseError = ref<string>('');
  const isLoading = ref(false);

  async function parseFile(file: File): Promise<CsvParseResult | null> {
    parseError.value = '';
    isLoading.value = true;

    try {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        throw new Error('Please select a CSV file');
      }

      const content = await file.text();
      const result = parseCSV(content);

      if (result.headers.length === 0) {
        throw new Error('No columns found in CSV');
      }

      if (result.rows.length === 0) {
        throw new Error('No data rows found in CSV');
      }

      return result;
    } catch (error: any) {
      parseError.value = error.message || 'Failed to parse CSV file';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    parseError,
    isLoading,
    parseFile,
  };
}
