export type TourStep = {
  anchor: string;
  route: string;
  title: string;
  body: string;
};

export const TOUR_STEPS: readonly TourStep[] = [
  {
    anchor: "today",
    route: "/today",
    title: "Today is your queue",
    body: "Everything you've approved waits here until its slot comes round. You can publish one early, push it back, or cancel it — right up until the moment it goes out.",
  },
  {
    anchor: "plan",
    route: "/plan",
    title: "Your week, decided on Sunday",
    body: "Each slot is a topic, an angle, and a time. None of it is fixed — change the topic, skip a day, or add a slot. We plan around what you're actually working on.",
  },
  {
    anchor: "drafts",
    route: "/drafts",
    title: "Nothing publishes without you",
    body: "Drafts land here written in your voice. Read one, edit it inline, or tell us what's wrong and we'll rewrite it. It only becomes a scheduled post when you press Approve — there is no path around that.",
  },
  {
    anchor: "voice",
    route: "/voice",
    title: "This is what we learned about you",
    body: "Every trait, rule and topic we picked up from your posts, in plain language — and all of it editable. Change something here and the next draft follows it. The Memory tab holds facts about your projects and audience, so posts refer to this week rather than to nothing in particular.",
  },
  {
    anchor: "trial",
    route: "/settings",
    title: "Where your trial stands",
    body: "Seven days, with caps on drafts and posts so nobody runs up a bill by accident. When it ends, everything you made stays readable — only new drafts and publishing pause.",
  },
];
