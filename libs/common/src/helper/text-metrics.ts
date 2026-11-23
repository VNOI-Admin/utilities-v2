import { readFileSync } from 'node:fs';

/**
 * Minimal TrueType metrics reader.
 *
 * ffmpeg's `drawtext` cannot measure, wrap or truncate text, so long team and
 * university names used to run off the canvas. Reading advance widths straight
 * out of the font lets the layout fit them before the filter graph is built.
 *
 * Only `cmap` (formats 4 and 12) and `hmtx` are parsed; anything unsupported
 * degrades to a width estimate rather than throwing, because a slightly wrong
 * line break is far better than a failed render.
 */

const FALLBACK_ADVANCE_EM = 0.55;

type FontMetrics = {
  unitsPerEm: number;
  advances: Map<number, number>;
  fallbackAdvance: number;
};

const cache = new Map<string, FontMetrics | null>();

function readTables(buf: Buffer): Map<string, { offset: number; length: number }> {
  const tables = new Map<string, { offset: number; length: number }>();
  let base = 0;

  // TrueType Collection: use the first font.
  if (buf.length >= 4 && buf.toString('latin1', 0, 4) === 'ttcf') {
    base = buf.readUInt32BE(12);
  }

  const numTables = buf.readUInt16BE(base + 4);
  for (let i = 0; i < numTables; ++i) {
    const rec = base + 12 + i * 16;
    if (rec + 16 > buf.length) {
      break;
    }
    tables.set(buf.toString('latin1', rec, rec + 4), {
      offset: buf.readUInt32BE(rec + 8),
      length: buf.readUInt32BE(rec + 12),
    });
  }
  return tables;
}

/** Maps unicode code points to glyph ids from the best available cmap subtable. */
function readCmap(buf: Buffer, offset: number): Map<number, number> {
  const map = new Map<number, number>();
  const numTables = buf.readUInt16BE(offset + 2);

  let best = -1;
  let bestScore = -1;
  for (let i = 0; i < numTables; ++i) {
    const rec = offset + 4 + i * 8;
    const platform = buf.readUInt16BE(rec);
    const encoding = buf.readUInt16BE(rec + 2);
    const subOffset = offset + buf.readUInt32BE(rec + 4);
    // Prefer full-repertoire unicode subtables over the BMP-only ones.
    const score =
      platform === 3 && encoding === 10
        ? 4
        : platform === 0 && encoding >= 4
          ? 3
          : platform === 3 && encoding === 1
            ? 2
            : platform === 0
              ? 1
              : 0;
    if (score > bestScore) {
      bestScore = score;
      best = subOffset;
    }
  }
  if (best < 0) {
    return map;
  }

  const format = buf.readUInt16BE(best);
  if (format === 4) {
    const segCountX2 = buf.readUInt16BE(best + 6);
    const segCount = segCountX2 / 2;
    const endBase = best + 14;
    const startBase = endBase + segCountX2 + 2;
    const deltaBase = startBase + segCountX2;
    const rangeBase = deltaBase + segCountX2;

    for (let s = 0; s < segCount; ++s) {
      const end = buf.readUInt16BE(endBase + s * 2);
      const start = buf.readUInt16BE(startBase + s * 2);
      const delta = buf.readInt16BE(deltaBase + s * 2);
      const rangeOffset = buf.readUInt16BE(rangeBase + s * 2);
      if (start > end) {
        continue;
      }
      for (let c = start; c <= end && c !== 0xffff; ++c) {
        let glyph: number;
        if (rangeOffset === 0) {
          glyph = (c + delta) & 0xffff;
        } else {
          const gi = rangeBase + s * 2 + rangeOffset + (c - start) * 2;
          if (gi + 2 > buf.length) {
            continue;
          }
          glyph = buf.readUInt16BE(gi);
          if (glyph !== 0) {
            glyph = (glyph + delta) & 0xffff;
          }
        }
        if (glyph !== 0) {
          map.set(c, glyph);
        }
      }
    }
  } else if (format === 12) {
    const nGroups = buf.readUInt32BE(best + 12);
    for (let g = 0; g < nGroups; ++g) {
      const rec = best + 16 + g * 12;
      if (rec + 12 > buf.length) {
        break;
      }
      const start = buf.readUInt32BE(rec);
      const end = buf.readUInt32BE(rec + 4);
      const startGlyph = buf.readUInt32BE(rec + 8);
      // Guard against pathological ranges in malformed fonts.
      for (let c = start; c <= end && c - start < 0x10000; ++c) {
        map.set(c, startGlyph + (c - start));
      }
    }
  }

  return map;
}

function loadMetrics(fontPath: string): FontMetrics | null {
  if (cache.has(fontPath)) {
    return cache.get(fontPath) ?? null;
  }

  let metrics: FontMetrics | null = null;
  try {
    const buf = readFileSync(fontPath);
    const tables = readTables(buf);
    const head = tables.get('head');
    const hhea = tables.get('hhea');
    const hmtx = tables.get('hmtx');
    const cmap = tables.get('cmap');

    if (head && hhea && hmtx && cmap) {
      const unitsPerEm = buf.readUInt16BE(head.offset + 18) || 1000;
      const numHMetrics = buf.readUInt16BE(hhea.offset + 34);
      const charToGlyph = readCmap(buf, cmap.offset);

      const glyphAdvance = (glyph: number): number => {
        const index = Math.min(glyph, numHMetrics - 1);
        const at = hmtx.offset + index * 4;
        return at + 2 <= buf.length ? buf.readUInt16BE(at) : 0;
      };

      const advances = new Map<number, number>();
      for (const [code, glyph] of charToGlyph) {
        advances.set(code, glyphAdvance(glyph));
      }

      metrics = {
        unitsPerEm,
        advances,
        fallbackAdvance: advances.get(0x20) ?? unitsPerEm * FALLBACK_ADVANCE_EM,
      };
    }
  } catch {
    metrics = null;
  }

  cache.set(fontPath, metrics);
  return metrics;
}

/** Width of `text` in pixels when drawn at `fontSize`. */
export function measureText(fontPath: string, text: string, fontSize: number): number {
  const metrics = loadMetrics(fontPath);
  if (!metrics) {
    return text.length * fontSize * FALLBACK_ADVANCE_EM;
  }

  let units = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0x20;
    units += metrics.advances.get(code) ?? metrics.fallbackAdvance;
  }
  return (units / metrics.unitsPerEm) * fontSize;
}

/** Truncates with a trailing ellipsis so the result fits `maxWidth`. */
export function ellipsizeText(fontPath: string, text: string, fontSize: number, maxWidth: number): string {
  if (measureText(fontPath, text, fontSize) <= maxWidth) {
    return text;
  }

  const chars = [...text];
  let lo = 0;
  let hi = chars.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = `${chars.slice(0, mid).join('').trimEnd()}…`;
    if (measureText(fontPath, candidate, fontSize) <= maxWidth) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo <= 0 ? '…' : `${chars.slice(0, lo).join('').trimEnd()}…`;
}

/**
 * Greedy word wrap into at most `maxLines`; the final line is ellipsized when
 * the text still does not fit. Words longer than a line are hard-split.
 */
export function wrapText(
  fontPath: string,
  text: string,
  fontSize: number,
  maxWidth: number,
  maxLines: number,
): string[] {
  // Pre-split words that are wider than a whole line so the greedy pass below
  // only ever deals with atoms that can fit.
  const atoms: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (measureText(fontPath, word, fontSize) <= maxWidth) {
      atoms.push(word);
      continue;
    }
    let chunk = '';
    for (const char of word) {
      if (chunk && measureText(fontPath, chunk + char, fontSize) > maxWidth) {
        atoms.push(chunk);
        chunk = char;
      } else {
        chunk += char;
      }
    }
    if (chunk) {
      atoms.push(chunk);
    }
  }

  if (atoms.length === 0) {
    return [''];
  }

  const lines: string[] = [];
  let current = '';
  let index = 0;

  while (index < atoms.length) {
    const candidate = current ? `${current} ${atoms[index]}` : atoms[index];
    if (measureText(fontPath, candidate, fontSize) <= maxWidth) {
      current = candidate;
      index += 1;
      continue;
    }
    lines.push(current);
    current = '';
    if (lines.length === maxLines) {
      break;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
    index = atoms.length;
  }

  // Anything left over means we ran out of lines: mark the truncation.
  if (index < atoms.length && lines.length > 0) {
    const last = lines.length - 1;
    lines[last] = ellipsizeText(fontPath, `${lines[last]} ${atoms[index]}`, fontSize, maxWidth);
  }

  return lines.length > 0 ? lines : [''];
}

/**
 * Largest size in `[minSize, maxSize]` at which `text` fits `maxWidth` on a
 * single line. Used so short team names render large and long ones stay legible.
 */
export function fitFontSize(
  fontPath: string,
  text: string,
  maxWidth: number,
  minSize: number,
  maxSize: number,
): number {
  if (measureText(fontPath, text, maxSize) <= maxWidth) {
    return maxSize;
  }
  const width = measureText(fontPath, text, 100);
  if (width <= 0) {
    return maxSize;
  }
  const ideal = Math.floor((maxWidth / width) * 100);
  return Math.max(minSize, Math.min(maxSize, ideal));
}
