"use client";

import { useEffect, useState } from "react";

// iOS claims x.com as a universal link, so Safari offers to hand the OAuth
// authorize page to the X app, which cannot render it and fails. Nothing on our
// side controls that — X hosts the association file — so the honest fix is to
// tell people what to tap. Shown only on iOS, where it is actionable.
export function IosOAuthHint() {
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    setIsIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
  }, []);

  if (!isIos) return null;

  return (
    <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-left text-muted-foreground text-xs leading-relaxed">
      If X offers to open its app, tap <span className="font-medium">Cancel</span> and keep going in
      the browser. The app can't show the sign-in screen.
    </p>
  );
}
