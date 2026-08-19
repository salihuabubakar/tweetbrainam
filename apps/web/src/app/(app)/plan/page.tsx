import { WeekPlan } from "@/components/plan/week-plan";

export const metadata = { title: "Plan" };

export default function PlanPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight">Plan</h1>
        <p className="text-muted-foreground text-sm">
          What you're posting this week, and why each one earns its slot.
        </p>
      </div>
      <div data-tour="plan">
        <WeekPlan showWeekSwitcher />
      </div>
    </div>
  );
}
