export const OVERLAY_KEYS = {
  USER_STREAM: 'user-stream',
  MULTI_USER_STREAM: 'multi-user-stream',
};

export type OverlayKey = (typeof OVERLAY_KEYS)[keyof typeof OVERLAY_KEYS];
