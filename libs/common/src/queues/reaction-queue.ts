/**
 * Shared identity of the reaction-render queue.
 *
 * The worker lives in the sync app but the internal API also enqueues onto it
 * (admin-triggered re-renders), so the names live in a lib both can import
 * rather than one app reaching into the other's constants.
 */

export const REACTION_RENDER_QUEUE = 'reaction-render' as const;

export const REACTION_RENDER_JOB_NAME = 'render-reaction' as const;

export type ReactionRenderJobData = {
  submissionId: string;
};

/** Stable job id per submission, so a re-queue never duplicates a pending render. */
export function reactionRenderJobId(submissionId: string): string {
  return `reaction-${submissionId}`;
}
