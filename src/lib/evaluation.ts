// Fixed evaluation rubric criteria (labels are localized in the UI).
export const EVAL_CRITERIA = ['technical', 'communication', 'reliability', 'growth'] as const;
export type EvalCriterion = (typeof EVAL_CRITERIA)[number];
