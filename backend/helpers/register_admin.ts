import { database } from "../src/config/database";
import { adminAgents } from "../db/drizzle/schema";

const username = `admin_${crypto.randomUUID().slice(0, 8)}@cartepro.test`;
const password = crypto.randomUUID();

const passwordHash = await Bun.password.hash(password, {
  algorithm: "bcrypt",
  cost: 10
});

await database.insert(adminAgents).values({
  firstName: "Admin",
  lastName: "Admin",
  email: username,
  passwordHash,
});

console.log(`username: ${username}`);
console.log(`password: ${password}`);
