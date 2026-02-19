import * as v from 'valibot';

export const createBranchSchema = v.object({
	name: v.pipe(
		v.string(),
		v.nonEmpty('Branch name is required'),
		v.regex(/^\S*$/, 'Branch name cannot contain whitespace'),
		v.regex(/^[^\~^\:\*\?\[\\]*$/, 'Branch name contains invalid characters')
	),
	startPoint: v.pipe(v.string(), v.nonEmpty('Start point is required'))
});

export type CreateBranchInput = v.InferOutput<typeof createBranchSchema>;
