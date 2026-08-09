import type { ContentGoal } from "@tweetbrainam/contracts";

export const goalOptions: { value: ContentGoal; label: string; description: string }[] = [
  {
    value: "grow_audience",
    label: "Grow my audience",
    description: "Reach more of the right people consistently.",
  },
  {
    value: "build_in_public",
    label: "Build in public",
    description: "Share progress on what I'm making.",
  },
  {
    value: "authority",
    label: "Build authority",
    description: "Be known for what I know.",
  },
  {
    value: "leads",
    label: "Generate leads",
    description: "Turn attention into clients or customers.",
  },
];

export const cadenceOptions = [
  { perWeek: 3, hint: "One each on Mon, Wed, Fri" },
  { perWeek: 5, hint: "One every weekday" },
  { perWeek: 7, hint: "One every day" },
  { perWeek: 10, hint: "One or two every day" },
  { perWeek: 14, hint: "Two every day" },
  { perWeek: 21, hint: "Three every day" },
];
