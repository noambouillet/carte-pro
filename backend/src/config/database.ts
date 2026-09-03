import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { DB_PORT, DB_USER, DB_HOST, DB_PASSWORD, DB_NAME } from "./env";

const databaseConnection = new SQL({
  hostname: DB_HOST,
  port: DB_PORT,
  username: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
});

const database = drizzle({
  client: databaseConnection,
});

export {
  database,
  databaseConnection,
};
