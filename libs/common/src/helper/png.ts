import { deflateSync, inflateSync } from 'node:zlib';

/**
 * Minimal anti-aliased RGBA drawing surface + PNG encoder.
 *
 * Exists so the reaction renderer can bake every static decoration (the frame
 * with its punched-out card holes, the verdict banner, the place pill) into
 * overlay images instead of approximating them with ffmpeg `drawbox`, which has
 * no rounded corners, gradients or alpha blending.
 */

export type Rgba = readonly [number, number, number, number];

// `zlib.crc32` only exists on Node >= 20.15; this repo targets Node 18.
const CRC_TABLE = ((): Uint32Array => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; ++n) {
    let c = n;
    for (let k = 0; k < 8; ++k) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; ++i) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** Parses `#rgb`, `#rrggbb` or `#rrggbbaa`. Alpha defaults to fully opaque. */
export function parseColor(input: string, alpha?: number): Rgba {
  const hex = input.trim().replace(/^#/, '');
  const expand = (c: string): number => Number.parseInt(c + c, 16);

  let r: number;
  let g: number;
  let b: number;
  let a = 255;

  if (hex.length === 3) {
    r = expand(hex[0]);
    g = expand(hex[1]);
    b = expand(hex[2]);
  } else if (hex.length === 6 || hex.length === 8) {
    r = Number.parseInt(hex.slice(0, 2), 16);
    g = Number.parseInt(hex.slice(2, 4), 16);
    b = Number.parseInt(hex.slice(4, 6), 16);
    if (hex.length === 8) {
      a = Number.parseInt(hex.slice(6, 8), 16);
    }
  } else {
    throw new Error(`Unsupported color: ${input}`);
  }

  if (alpha !== undefined) {
    a = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  }
  return [r, g, b, a];
}

/** Mixes two colors; `t` of 0 returns `from`, 1 returns `to`. */
export function mixColor(from: Rgba, to: Rgba, t: number): Rgba {
  const k = Math.max(0, Math.min(1, t));
  return [
    Math.round(from[0] + (to[0] - from[0]) * k),
    Math.round(from[1] + (to[1] - from[1]) * k),
    Math.round(from[2] + (to[2] - from[2]) * k),
    Math.round(from[3] + (to[3] - from[3]) * k),
  ];
}

/**
 * Relative luminance (WCAG). Used to pick readable foreground text over an
 * arbitrary verdict color.
 */
export function luminance(color: Rgba): number {
  const channel = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(color[0]) + 0.7152 * channel(color[1]) + 0.0722 * channel(color[2]);
}

export type DecodedImage = {
  width: number;
  height: number;
  /** Straight (non-premultiplied) RGBA, 8 bits per channel. */
  data: Uint8ClampedArray;
};

/**
 * Decodes an 8-bit non-interlaced PNG (grayscale, RGB, palette, or either with
 * alpha) into straight RGBA. The renderer normalises every logo through ffmpeg
 * first, so only this narrow subset ever reaches here.
 */
export function decodePng(buf: Buffer): DecodedImage {
  if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) {
    throw new Error('Not a PNG');
  }

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  let palette: Buffer | undefined;
  let transparency: Buffer | undefined;
  const idat: Buffer[] = [];

  let pos = 8;
  while (pos + 8 <= buf.length) {
    const length = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + length);

    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      bitDepth = body[8];
      colorType = body[9];
      interlace = body[12];
    } else if (type === 'PLTE') {
      palette = Buffer.from(body);
    } else if (type === 'tRNS') {
      transparency = Buffer.from(body);
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(body));
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + length;
  }

  if (bitDepth !== 8 || interlace !== 0) {
    throw new Error(`Unsupported PNG (bitDepth=${bitDepth}, interlace=${interlace})`);
  }

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) {
    throw new Error(`Unsupported PNG color type ${colorType}`);
  }

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const lines = Buffer.allocUnsafe(stride * height);

  // Undo the per-scanline filters (PNG spec section 9).
  for (let y = 0; y < height; ++y) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    const prior = dst - stride;

    for (let i = 0; i < stride; ++i) {
      const x = raw[src + i];
      const a = i >= channels ? lines[dst + i - channels] : 0;
      const b = y > 0 ? lines[prior + i] : 0;
      const c = y > 0 && i >= channels ? lines[prior + i - channels] : 0;

      let value: number;
      switch (filter) {
        case 0:
          value = x;
          break;
        case 1:
          value = x + a;
          break;
        case 2:
          value = x + b;
          break;
        case 3:
          value = x + ((a + b) >> 1);
          break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          value = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default:
          throw new Error(`Unsupported PNG filter ${filter}`);
      }
      lines[dst + i] = value & 0xff;
    }
  }

  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; ++i) {
    const s = i * channels;
    const d = i * 4;
    if (colorType === 0 || colorType === 4) {
      data[d] = lines[s];
      data[d + 1] = lines[s];
      data[d + 2] = lines[s];
      data[d + 3] = colorType === 4 ? lines[s + 1] : 255;
    } else if (colorType === 2 || colorType === 6) {
      data[d] = lines[s];
      data[d + 1] = lines[s + 1];
      data[d + 2] = lines[s + 2];
      data[d + 3] = colorType === 6 ? lines[s + 3] : 255;
    } else {
      const index = lines[s];
      data[d] = palette?.[index * 3] ?? 0;
      data[d + 1] = palette?.[index * 3 + 1] ?? 0;
      data[d + 2] = palette?.[index * 3 + 2] ?? 0;
      data[d + 3] = transparency?.[index] ?? 255;
    }
  }

  return { width, height, data };
}

export class Surface {
  readonly width: number;
  readonly height: number;
  private readonly data: Uint8ClampedArray;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }

  /** Source-over composite of `color` at `coverage` (0..1) onto one pixel. */
  private blend(x: number, y: number, color: Rgba, coverage: number): void {
    if (coverage <= 0 || x < 0 || y < 0 || x >= this.width || y >= this.height) {
      return;
    }
    const srcA = (color[3] / 255) * Math.min(1, coverage);
    if (srcA <= 0) {
      return;
    }

    const i = (y * this.width + x) * 4;
    const dstA = this.data[i + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA <= 0) {
      this.data[i] = 0;
      this.data[i + 1] = 0;
      this.data[i + 2] = 0;
      this.data[i + 3] = 0;
      return;
    }

    for (let c = 0; c < 3; ++c) {
      const src = color[c] * srcA;
      const dst = this.data[i + c] * dstA * (1 - srcA);
      this.data[i + c] = (src + dst) / outA;
    }
    this.data[i + 3] = outA * 255;
  }

  fillRect(x: number, y: number, w: number, h: number, color: Rgba): void {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width, Math.ceil(x + w));
    const y1 = Math.min(this.height, Math.ceil(y + h));
    for (let py = y0; py < y1; ++py) {
      for (let px = x0; px < x1; ++px) {
        this.blend(px, py, color, 1);
      }
    }
  }

  /**
   * Anti-aliased rounded rectangle via a signed distance field: coverage is the
   * fraction of the pixel inside the shape, approximated as `0.5 - distance`.
   */
  fillRoundRect(x: number, y: number, w: number, h: number, radius: number, color: Rgba): void {
    const r = Math.max(0, Math.min(radius, Math.min(w, h) / 2));
    const x0 = Math.max(0, Math.floor(x - 1));
    const y0 = Math.max(0, Math.floor(y - 1));
    const x1 = Math.min(this.width, Math.ceil(x + w + 1));
    const y1 = Math.min(this.height, Math.ceil(y + h + 1));

    const cx = x + w / 2;
    const cy = y + h / 2;
    const hx = w / 2 - r;
    const hy = h / 2 - r;

    for (let py = y0; py < y1; ++py) {
      for (let px = x0; px < x1; ++px) {
        const dx = Math.abs(px + 0.5 - cx) - hx;
        const dy = Math.abs(py + 0.5 - cy) - hy;
        const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
        const inside = Math.min(Math.max(dx, dy), 0);
        const dist = outside + inside - r;
        this.blend(px, py, color, 0.5 - dist);
      }
    }
  }

  /**
   * Erases an anti-aliased rounded rectangle (destination-out).
   *
   * The frame layer is composited *over* the clips, so punching card-shaped
   * holes in it is what gives the videos their rounded corners — ffmpeg has no
   * way to round a video's corners directly.
   */
  clearRoundRect(x: number, y: number, w: number, h: number, radius: number): void {
    const r = Math.max(0, Math.min(radius, Math.min(w, h) / 2));
    const x0 = Math.max(0, Math.floor(x - 1));
    const y0 = Math.max(0, Math.floor(y - 1));
    const x1 = Math.min(this.width, Math.ceil(x + w + 1));
    const y1 = Math.min(this.height, Math.ceil(y + h + 1));

    const cx = x + w / 2;
    const cy = y + h / 2;
    const hx = w / 2 - r;
    const hy = h / 2 - r;

    for (let py = y0; py < y1; ++py) {
      for (let px = x0; px < x1; ++px) {
        const dx = Math.abs(px + 0.5 - cx) - hx;
        const dy = Math.abs(py + 0.5 - cy) - hy;
        const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
        const inside = Math.min(Math.max(dx, dy), 0);
        const coverage = Math.max(0, Math.min(1, 0.5 - (outside + inside - r)));
        if (coverage <= 0) {
          continue;
        }
        const i = (py * this.width + px) * 4;
        this.data[i + 3] = this.data[i + 3] * (1 - coverage);
      }
    }
  }

  /** Soft drop shadow cast by a rounded rectangle, drawn outside its edge. */
  dropShadowRoundRect(x: number, y: number, w: number, h: number, radius: number, spread: number, color: Rgba): void {
    // Concentric expanded outlines approximate a blur cheaply and look the
    // same at this size.
    for (let i = spread; i >= 1; --i) {
      const t = i / spread;
      const alpha = color[3] * (1 - t) * (1 - t) * 0.5;
      this.fillRoundRect(x - i, y - i + spread * 0.35, w + i * 2, h + i * 2, radius + i, [
        color[0],
        color[1],
        color[2],
        alpha,
      ]);
    }
  }

  fillCircle(cx: number, cy: number, radius: number, color: Rgba): void {
    this.fillRoundRect(cx - radius, cy - radius, radius * 2, radius * 2, radius, color);
  }

  /** Vertical gradient; `from` is at `y`, `to` at `y + h`. */
  fillVerticalGradient(x: number, y: number, w: number, h: number, from: Rgba, to: Rgba): void {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width, Math.ceil(x + w));
    const y1 = Math.min(this.height, Math.ceil(y + h));
    if (h <= 0) {
      return;
    }
    for (let py = y0; py < y1; ++py) {
      const color = mixColor(from, to, (py + 0.5 - y) / h);
      for (let px = x0; px < x1; ++px) {
        this.blend(px, py, color, 1);
      }
    }
  }

  /** Anti-aliased filled triangle (used for the rank delta caret). */
  fillTriangle(
    p0: readonly [number, number],
    p1: readonly [number, number],
    p2: readonly [number, number],
    color: Rgba,
  ): void {
    const xs = [p0[0], p1[0], p2[0]];
    const ys = [p0[1], p1[1], p2[1]];
    const x0 = Math.max(0, Math.floor(Math.min(...xs)));
    const y0 = Math.max(0, Math.floor(Math.min(...ys)));
    const x1 = Math.min(this.width, Math.ceil(Math.max(...xs)) + 1);
    const y1 = Math.min(this.height, Math.ceil(Math.max(...ys)) + 1);

    // 3x3 supersampling keeps the caret edges smooth without a full SDF.
    const samples = 3;
    const step = 1 / samples;
    const edge = (ax: number, ay: number, bx: number, by: number, px: number, py: number): number =>
      (px - ax) * (by - ay) - (py - ay) * (bx - ax);

    for (let py = y0; py < y1; ++py) {
      for (let px = x0; px < x1; ++px) {
        let hits = 0;
        for (let sy = 0; sy < samples; ++sy) {
          for (let sx = 0; sx < samples; ++sx) {
            const qx = px + (sx + 0.5) * step;
            const qy = py + (sy + 0.5) * step;
            const e0 = edge(p0[0], p0[1], p1[0], p1[1], qx, qy);
            const e1 = edge(p1[0], p1[1], p2[0], p2[1], qx, qy);
            const e2 = edge(p2[0], p2[1], p0[0], p0[1], qx, qy);
            if ((e0 >= 0 && e1 >= 0 && e2 >= 0) || (e0 <= 0 && e1 <= 0 && e2 <= 0)) {
              hits += 1;
            }
          }
        }
        this.blend(px, py, color, hits / (samples * samples));
      }
    }
  }

  /**
   * Draws `image` scaled to fit inside the `w` x `h` box at (`x`, `y`),
   * preserving aspect ratio and centring the result. Sampling is bilinear.
   */
  drawImageContain(image: DecodedImage, x: number, y: number, w: number, h: number, opacity = 1): void {
    if (image.width <= 0 || image.height <= 0) {
      return;
    }
    const scale = Math.min(w / image.width, h / image.height);
    const drawW = image.width * scale;
    const drawH = image.height * scale;
    const offsetX = x + (w - drawW) / 2;
    const offsetY = y + (h - drawH) / 2;

    const x0 = Math.max(0, Math.floor(offsetX));
    const y0 = Math.max(0, Math.floor(offsetY));
    const x1 = Math.min(this.width, Math.ceil(offsetX + drawW));
    const y1 = Math.min(this.height, Math.ceil(offsetY + drawH));

    const sample = (sx: number, sy: number): Rgba => {
      const cx = Math.max(0, Math.min(image.width - 1, sx));
      const cy = Math.max(0, Math.min(image.height - 1, sy));
      const x0i = Math.floor(cx);
      const y0i = Math.floor(cy);
      const x1i = Math.min(image.width - 1, x0i + 1);
      const y1i = Math.min(image.height - 1, y0i + 1);
      const fx = cx - x0i;
      const fy = cy - y0i;

      const at = (px: number, py: number, c: number): number => image.data[(py * image.width + px) * 4 + c];

      const out: number[] = [];
      for (let c = 0; c < 4; ++c) {
        const top = at(x0i, y0i, c) * (1 - fx) + at(x1i, y0i, c) * fx;
        const bottom = at(x0i, y1i, c) * (1 - fx) + at(x1i, y1i, c) * fx;
        out.push(top * (1 - fy) + bottom * fy);
      }
      return [out[0], out[1], out[2], out[3]];
    };

    for (let py = y0; py < y1; ++py) {
      for (let px = x0; px < x1; ++px) {
        const src = sample((px + 0.5 - offsetX) / scale - 0.5, (py + 0.5 - offsetY) / scale - 0.5);
        this.blend(px, py, [src[0], src[1], src[2], 255], (src[3] / 255) * opacity);
      }
    }
  }

  /** Encodes the surface as a non-interlaced 8-bit RGBA PNG. */
  toPngBuffer(): Buffer {
    const stride = this.width * 4;
    const raw = Buffer.allocUnsafe((stride + 1) * this.height);
    for (let y = 0; y < this.height; ++y) {
      raw[y * (stride + 1)] = 0; // filter type: none
      Buffer.from(this.data.buffer, this.data.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
    }

    const chunk = (type: string, body: Buffer): Buffer => {
      const typeBuf = Buffer.from(type, 'latin1');
      const len = Buffer.alloc(4);
      len.writeUInt32BE(body.length, 0);
      const crc = Buffer.alloc(4);
      crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, body])) >>> 0, 0);
      return Buffer.concat([len, typeBuf, body, crc]);
    };

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.width, 0);
    ihdr.writeUInt32BE(this.height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // color type: RGBA
    ihdr[10] = 0; // deflate
    ihdr[11] = 0; // adaptive filtering
    ihdr[12] = 0; // no interlace

    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw, { level: 6 })),
      chunk('IEND', Buffer.alloc(0)),
    ]);
  }
}
