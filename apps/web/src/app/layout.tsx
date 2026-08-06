import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TweetBrainam",
    template: "%s · TweetBrainam",
  },
  description: "Stay consistent on X without losing your voice.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background font-sans text-foreground antialiased">{children}</body>
    </html>
  );
}
