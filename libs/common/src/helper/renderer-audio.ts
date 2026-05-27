import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

type FfprobeStreamsJson = {
  streams?: ReadonlyArray<{ codec_type?: string }>;
};

function runCommand(cmd: string, args: readonly string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    const chunks = new Array<Buffer>();
    const errChunks = new Array<Buffer>();

    p.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    p.stderr.on('data', (chunk: Buffer) => errChunks.push(Buffer.from(chunk)));

    p.on('error', (err) => reject(err));
    p.on('close', (code) => {
      if (code !== 0) {
        const stderr = Buffer.concat(errChunks).toString('utf8');
        return reject(new Error(`${cmd} exited ${code}\n${stderr}`));
      }
      resolve(Buffer.concat(chunks));
    });
  });
}

export async function probeHasAudio(videoPath: string): Promise<boolean> {
  const out = await runCommand('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'stream=codec_type',
    '-of',
    'json',
    videoPath,
  ]);
  const parsed = JSON.parse(out.toString('utf8')) as FfprobeStreamsJson;
  return parsed.streams?.some((s) => s.codec_type === 'audio') ?? false;
}

/**
 * Ensures the file has at least one stereo audio stream so ffmpeg filter graphs
 * that reference `[0:a]` / `[1:a]` (e.g. amix) do not fail on video-only inputs.
 *
 * The returned path is a new file under the OS temp directory; unlink it (or
 * replace it) after `render()` or other consumers finish.
 */
export async function ensureStereoAudio(inputPath: string): Promise<string> {
  const hasAudio = await probeHasAudio(inputPath);
  const outPath = path.join(
    os.tmpdir(),
    `reaction-stereo-${randomUUID()}.mkv`,
  );

  const args = hasAudio
    ? [
        '-y',
        '-i',
        inputPath,
        '-map',
        '0:v:0',
        '-map',
        '0:a:0',
        '-c:v',
        'copy',
        '-c:a',
        'libopus',
        '-b:a',
        '128k',
        '-ac',
        '2',
        '-ar',
        '48000',
        outPath,
      ]
    : [
        '-y',
        '-i',
        inputPath,
        '-f',
        'lavfi',
        '-i',
        'anullsrc=channel_layout=stereo:sample_rate=48000',
        '-map',
        '0:v:0',
        '-map',
        '1:a',
        '-c:v',
        'copy',
        '-c:a',
        'libopus',
        '-b:a',
        '128k',
        '-shortest',
        outPath,
      ];

  await runCommand('ffmpeg', args);
  return outPath;
}
