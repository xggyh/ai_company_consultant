export type StructuredDemand = {
  industry: string;
  scale: string;
  pain_points: string[];
  goals: string[];
};

export type DemandAnalysis = {
  need_follow_up: boolean;
  follow_up_question: string;
  demand: StructuredDemand | null;
};
