import { ServiceWorker } from "@/components/shared/service-worker";
import { ToastProvider } from "@/components/shared/toast";
import { themeScript } from "@/lib/theme";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfb" },
    { media: "(prefers-color-scheme: dark)", color: "#121316" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "TweetBrainam",
    template: "%s · TweetBrainam",
  },
  description: "Stay consistent on X without losing your voice.",
  applicationName: "TweetBrainam",
  appleWebApp: {
    capable: true,
    title: "TweetBrainam",
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: themeScript is a build-time
            constant with no interpolated input. It must run synchronously before first paint to
            avoid a light-to-dark flash, which rules out useEffect and next/script. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-background font-sans text-foreground antialiased">
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
