export const OVERLAY_KEYS = {
  USER_STREAM: 'user-stream',
  MULTI_USER_STREAM: 'multi-user-stream',
  WEBCAM_LAYOUT: 'webcam-layout',
  GLOBAL_CONFIG: 'global-config',
  SINGLE_CONTESTANT: 'single-contestant',
  MULTI_CONTESTANT: 'multi-contestant',
  ANNOUNCEMENTS: 'announcements',
};

export type OverlayKey = (typeof OVERLAY_KEYS)[keyof typeof OVERLAY_KEYS];
