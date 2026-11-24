export type WidgetType =
  | 'scoreboard'
  | 'queue'
  | 'ticker'
  | 'statistics'
  | 'fullScreenClock'
  | 'teamView'
  | 'picture'
  | 'advertisement';

export type TeamViewPosition =
  | 'SINGLE'
  | 'PVP_TOP'
  | 'PVP_BOTTOM'
  | 'TOP_LEFT'
  | 'TOP_RIGHT'
  | 'BOTTOM_LEFT'
  | 'BOTTOM_RIGHT';

export type ScrollDirection = 'FirstPage' | 'Back' | 'Pause' | 'Forward' | 'LastPage';

export type MediaKind = 'screen' | 'camera';

export type ClockType = 'standard' | 'countdown' | 'global';

export interface ScoreboardSettings {
  scrollDirection: ScrollDirection;
  group: string;
}

export interface TeamViewSettings {
  username: string;
  position: TeamViewPosition;
  primary: MediaKind | null;
  secondary: MediaKind | null;
  showTaskStatus: boolean;
}

export interface ClockSettings {
  clockType: ClockType;
  showSeconds: boolean;
}

export interface PictureSettings {
  url: string;
  name: string;
}

export interface AdvertisementSettings {
  text: string;
}

export type WidgetSettings =
  | ScoreboardSettings
  | TeamViewSettings
  | ClockSettings
  | PictureSettings
  | AdvertisementSettings
  | Record<string, never>;

export interface BroadcastWidget<S = WidgetSettings> {
  id: string;
  type: WidgetType;
  location: string;
  settings: S;
}

export type TickerPart = 'short' | 'long';

export interface TickerMessage {
  id: string;
  part: TickerPart;
  type: 'text' | 'clock' | 'scoreboard';
  periodMs: number;
  text?: string;
  from?: number;
  to?: number;
}

export interface Medals {
  gold: number;
  silver: number;
  bronze: number;
}

export interface BroadcastState {
  contestId: string;
  widgets: Record<string, BroadcastWidget>;
  ticker: TickerMessage[];
  visual: Record<string, unknown>;
  medals: Medals;
}

export const TEAM_VIEW_IDS: Record<TeamViewPosition, string> = {
  SINGLE: 'teamViewSingle',
  PVP_TOP: 'teamViewPvpTop',
  PVP_BOTTOM: 'teamViewPvpBottom',
  TOP_LEFT: 'teamViewTopLeft',
  TOP_RIGHT: 'teamViewTopRight',
  BOTTOM_LEFT: 'teamViewBottomLeft',
  BOTTOM_RIGHT: 'teamViewBottomRight',
};
