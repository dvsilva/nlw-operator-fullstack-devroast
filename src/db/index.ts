import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

function createDb(url: string): NodePgDatabase {
  if (url.includes("neon.tech")) {
    return drizzleHttp(neon(url), {
      casing: "snake_case",
    }) as unknown as NodePgDatabase;
  }

  return drizzlePg(url, { casing: "snake_case" });
}

export const db = createDb(databaseUrl);
