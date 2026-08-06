export const metadata = { title: "Today" };

export default function TodayPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-semibold text-2xl tracking-tight">Today</h1>
      <div className="flex flex-col items-center gap-2 rounded-lg border border-border border-dashed py-16 text-center">
        <p className="font-medium text-sm">Nothing needs you right now</p>
        <p className="text-muted-foreground text-sm">
          Connect your X account to start building your content brain.
        </p>
      </div>
    </div>
  );
}
