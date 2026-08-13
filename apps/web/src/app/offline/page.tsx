export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-semibold text-2xl tracking-tight">You're offline</h1>
      <p className="text-muted-foreground text-sm">
        TweetBrainam needs a connection to show your plans and drafts. Nothing you typed is lost —
        it's still here when you reconnect.
      </p>
    </main>
  );
}
