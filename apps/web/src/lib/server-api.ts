import { cookies } from "next/headers";

const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:3001";

export async function fetchFromApi<T>(path: string): Promise<T | null> {
  const cookieHeader = (await cookies()).toString();
  const response = await fetch(`${apiOrigin}${path}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as T;
}
