export function truncateLog(log: string, maxBytes: number): string {
  if (Buffer.byteLength(log, 'utf8') <= maxBytes) {
    return log;
  }

  return Buffer.from(log, 'utf8').subarray(0, maxBytes).toString('utf8');
}

