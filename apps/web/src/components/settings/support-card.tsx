import { SUPPORT_X_HANDLE, supportXUrl } from "@/lib/support";
import { ReplayTourButton } from "./replay-tour-button";

export function SupportCard() {
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-6">
      <h2 className="font-medium text-sm">Questions or something broken?</h2>
      <p className="text-muted-foreground text-sm">
        Message{" "}
        <a
          href={supportXUrl}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-foreground underline underline-offset-4"
        >
          {SUPPORT_X_HANDLE}
        </a>{" "}
        on X. A real person reads it.
      </p>

      <div className="flex flex-col gap-2 border-border border-t pt-4">
        <h3 className="font-medium text-sm">Not sure what a page is for?</h3>
        <p className="text-muted-foreground text-sm">
          The guided tour walks you through Today, Plan, Drafts, Voice and your trial — five steps,
          about a minute.
        </p>
        <ReplayTourButton />
      </div>
    </section>
  );
}
