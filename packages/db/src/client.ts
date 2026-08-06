import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDatabase>;

export function createDatabase(connectionString: string) {
  const sql = postgres(connectionString, { max: 10 });
  return drizzle(sql, { schema });
}
