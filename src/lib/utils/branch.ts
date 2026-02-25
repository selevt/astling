import type { BranchWithMetadata } from '$lib/server/git/types';

export function isBranchDeletable(branch: BranchWithMetadata): boolean {
	return !branch.current && !branch.lockedByWorktree && !branch.starred;
}
