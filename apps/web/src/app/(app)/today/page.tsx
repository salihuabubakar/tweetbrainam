import { TodayQueue } from "@/components/today/today-queue";

export const metadata = { title: "Today" };

export default function TodayPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight">Today</h1>
        <p className="text-muted-foreground text-sm">
          What's going out, what went out, and anything that needs you.
        </p>
      </div>
      <TodayQueue />
    </div>
  );
}
