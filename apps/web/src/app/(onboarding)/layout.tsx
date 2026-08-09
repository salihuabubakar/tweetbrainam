import { requireUser } from "@/lib/session";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  if (user.onboardingStep === "done") redirect("/today");

  return children;
}
