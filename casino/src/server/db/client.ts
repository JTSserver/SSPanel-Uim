import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

// One pooled connection per server instance. `prepare: false` lets us run
// SET TRANSACTION ISOLATION LEVEL SERIALIZABLE inside transactions cleanly.
const queryClient = postgres(url, { max: 10, prepare: false });

export const db = drizzle(queryClient, { schema });
export type Db = typeof db;
export { schema };
