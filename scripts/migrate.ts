// Applies pending Drizzle migrations at container start (production images
// don't ship drizzle-kit). Safe to run on every boot: applied ones are skipped.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(url, { max: 1 });
await migrate(drizzle(client), { migrationsFolder: "lib/db/migrations" });
await client.end();
console.log("Migrations applied");
