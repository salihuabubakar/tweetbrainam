import { AppFrame } from "@/components/marketing/app-frame";
import { Reveal } from "@/components/marketing/reveal";
import { ApprovalScreen } from "@/components/marketing/screens";
import { Walkthrough } from "@/components/marketing/walkthrough";
import { buttonVariants } from "@tweetbrainam/ui";
import Link from "next/link";

const features = [
  {
    title: "Your voice, versioned",
    body: "Every trait we learn is visible and editable. Change a rule and the next draft follows it — no prompt engineering, no guessing.",
  },
  {
    title: "It knows what you're working on",
    body: "Durable facts about your projects, audience and goals feed every plan, so posts refer to this week rather than to nothing in particular.",
  },
  {
    title: "Written from your own posts",
    body: "Drafts are grounded in the posts you actually published, retrieved by topic — not in a generic idea of how people write.",
  },
  {
    title: "Approval is the only path out",
    body: "There is no setting that publishes without you. Editing an approved post cancels its schedule until you approve it again.",
  },
];

export default function LandingPage() {
  return (
    <main className="flex flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8 px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-24">
        <Reveal>
          <h1 className="text-balance font-semibold text-3xl tracking-tight sm:text-5xl md:text-6xl">
            Stay consistent on X
            <br />
            without sounding like a robot
          </h1>
        </Reveal>

        <Reveal delayMs={80}>
          <p className="mx-auto max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
            TweetBrainam learns your voice from your own posts, plans your week around what you're
            actually building, and drafts content that sounds like you. You approve every post —
            always.
          </p>
        </Reveal>

        <Reveal delayMs={160} className="flex flex-col items-center gap-3">
          <Link href="/login" className={buttonVariants({ size: "lg" })}>
            Sign in with X
          </Link>
          <span className="text-muted-foreground text-xs">
            Read access to learn your voice. Nothing is posted without your approval.
          </span>
        </Reveal>

        <Reveal delayMs={240} className="w-full pt-4">
          <div className="tb-drift mx-auto max-w-3xl text-left">
            <AppFrame active="Drafts">
              <ApprovalScreen />
            </AppFrame>
          </div>
        </Reveal>
      </section>

      <section className="border-border border-y bg-muted/30">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal className="mb-10 flex flex-col gap-2 text-center">
            <h2 className="font-semibold text-2xl tracking-tight sm:text-3xl">
              Four steps, then it runs itself
            </h2>
            <p className="mx-auto max-w-lg text-balance text-muted-foreground text-sm">
              Set it up once. Every Sunday evening it plans the week ahead and has drafts waiting.
            </p>
          </Reveal>

          <Reveal delayMs={120}>
            <Walkthrough />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        <Reveal className="mb-10 flex flex-col gap-2 text-center">
          <h2 className="font-semibold text-2xl tracking-tight sm:text-3xl">
            Built so it still sounds like you in month six
          </h2>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delayMs={index * 80}>
              <div className="flex h-full flex-col gap-2 rounded-lg border border-border bg-card p-6">
                <h3 className="font-medium text-sm">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-border border-t">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 sm:py-24">
          <Reveal className="flex flex-col gap-3">
            <h2 className="text-balance font-semibold text-2xl tracking-tight sm:text-4xl">
              Your account. Your words. Your call.
            </h2>
            <p className="text-balance text-muted-foreground">
              Connect in a minute, see what we learned about your writing, and decide from there.
            </p>
          </Reveal>

          <Reveal delayMs={120}>
            <Link href="/login" className={buttonVariants({ size: "lg" })}>
              Sign in with X
            </Link>
          </Reveal>
        </div>
      </section>

      <footer className="border-border border-t px-4 py-6 text-center sm:px-6">
        <span className="text-muted-foreground text-xs">TweetBrainam · You approve every post</span>
      </footer>
    </main>
  );
}
