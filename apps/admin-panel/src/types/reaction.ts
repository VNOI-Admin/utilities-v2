/** Mirrors `ReactionVideoListItemDto` from the internal service. */
export interface ReactionVideoItem {
  key: string;
  url: string;
  lastModified?: string;
  size?: number;
  submissionId?: string;
  teamName?: string;
  group?: string;
  author?: string;
  problemCode?: string;
  problemDisplayName?: string;
  contestCode?: string;
  status?: string;
  rankBefore?: number;
  rankAfter?: number;
  submittedAt?: string;
}
