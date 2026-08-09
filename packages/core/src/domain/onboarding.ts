export const onboardingSteps = [
  "consent",
  "analyzing",
  "voice",
  "goals",
  "plan",
  "first_draft",
  "done",
] as const;

export type OnboardingStep = (typeof onboardingSteps)[number];

export const nextOnboardingStep: Record<OnboardingStep, OnboardingStep | null> = {
  consent: "analyzing",
  analyzing: "voice",
  voice: "goals",
  goals: "plan",
  plan: "first_draft",
  first_draft: "done",
  done: null,
};

export const autoAdvanceableSteps: readonly OnboardingStep[] = [
  "analyzing",
  "voice",
  "plan",
  "first_draft",
];

export const contentGoals = ["grow_audience", "build_in_public", "authority", "leads"] as const;

export type ContentGoal = (typeof contentGoals)[number];

export type UserGoals = {
  goal: ContentGoal;
  postsPerWeek: number;
  timezone: string;
};

export type UserPreferences = {
  goal?: ContentGoal | undefined;
  postsPerWeek: number;
  postingWindows: { dayOffset: number; hour: number }[];
};
