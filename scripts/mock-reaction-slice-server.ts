import { spawn } from 'node:child_process';
import http from 'node:http';

type SliceRequest = {
  startUnix?: number;
  endUnix?: number;
};

type SliceConfig = {
  name: string;
  color: string;
  audioFrequency?: number;
};

const port = Number(process.env.MOCK_REACTION_SLICE_PORT || process.env.REMOTE_CONTROL_AGENT_PORT || 9010);
const host = process.env.MOCK_REACTION_SLICE_HOST || '0.0.0.0';

const slices: Record<string, SliceConfig> = {
  '/records/slice/webcam': { name: 'webcam', color: '0xFF2D95', audioFrequency: 440 },
  '/records/slice/screen': { name: 'screen', color: '0x25D7FF' },
};

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readJson(req: http.IncomingMessage): Promise<SliceRequest> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        req.destroy(new Error('Request body too large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      resolve(raw ? JSON.parse(raw) : {});
    });
    req.on('error', reject);
  });
}

function normalizeRange(input: SliceRequest): { startUnix: number; endUnix: number; durationSec: number } {
  const nowSec = Date.now() / 1000;
  const startUnix = Number.isFinite(input.startUnix) ? Number(input.startUnix) : nowSec - 5;
  const endUnix = Number.isFinite(input.endUnix) ? Number(input.endUnix) : nowSec + 10;
  const durationSec = Math.max(1, Math.min(30, Math.ceil(endUnix - startUnix) || 15));

  return { startUnix, endUnix, durationSec };
}

function epochDrawtextExpression(startUnix: number): string {
  return `%{eif\\:${Math.floor(startUnix)}+t\\:d}`;
}

function buildFfmpegArgs(config: SliceConfig, durationSec: number, startUnix: number): string[] {
  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    `color=c=${config.color}:s=1280x720:r=30:d=${durationSec}`,
  ];

  if (config.audioFrequency) {
    args.push('-f', 'lavfi', '-i', `sine=frequency=${config.audioFrequency}:sample_rate=48000:d=${durationSec}`);
  }

  args.push(
    '-vf',
    [
      `drawtext=text='${epochDrawtextExpression(startUnix)}'`,
      'fontcolor=white',
      'fontsize=96',
      'box=1',
      'boxcolor=black@0.45',
      'boxborderw=28',
      'x=(w-text_w)/2',
      'y=(h-text_h)/2',
    ].join(':'),
    '-t',
    String(durationSec),
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-pix_fmt',
    'yuv420p',
  );

  args.push(
    ...(config.audioFrequency ? ['-shortest', '-filter:a', 'volume=0.25', '-c:a', 'aac'] : ['-an']),
    '-f',
    'matroska',
    'pipe:1',
  );

  return args;
}

async function sendSlice(req: http.IncomingMessage, res: http.ServerResponse, config: SliceConfig): Promise<void> {
  const range = normalizeRange(await readJson(req));
  console.log(
    `[${new Date().toISOString()}] ${config.name} slice start=${range.startUnix} end=${range.endUnix}`,
  );

  const ffmpeg = spawn('ffmpeg', buildFfmpegArgs(config, range.durationSec, range.startUnix), {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const stderr: Buffer[] = [];
  let sentVideo = false;

  ffmpeg.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
  ffmpeg.stdout.on('data', (chunk: Buffer) => {
    if (!sentVideo) {
      sentVideo = true;
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
    }
    res.write(chunk);
  });
  ffmpeg.on('error', (error) => sendJson(res, 500, { error: `Failed to start ffmpeg: ${error.message}` }));
  ffmpeg.on('close', (code) => {
    if (code === 0 && sentVideo) {
      res.end();
      return;
    }

    const message = Buffer.concat(stderr).toString('utf8') || `ffmpeg exited ${code}`;
    if (sentVideo) {
      res.destroy(new Error(message));
    } else {
      sendJson(res, 500, { error: message });
    }
  });
}

const server = http.createServer((req, res) => {
  void (async () => {
    const path = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).pathname;
    const config = slices[path];

    if (req.method !== 'POST' || !config) {
      sendJson(res, 404, { error: 'Expected POST /records/slice/webcam or /records/slice/screen' });
      return;
    }

    try {
      await sendSlice(req, res, config);
    } catch (error) {
      sendJson(res, 400, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  })();
});

server.listen(port, host, () => {
  console.log(`Mock reaction slice server listening on http://${host}:${port}`);
  console.log('Endpoints: POST /records/slice/webcam, POST /records/slice/screen');
});
