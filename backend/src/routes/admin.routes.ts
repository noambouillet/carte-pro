import { Elysia } from "elysia";

export const adminRoutes = new Elysia({ prefix: "/api/admin" })
  .get('/accounts', 'Accounts')
  .get('/scoreboard', 'Scoreboard')
  .post('/validate', 'Log in')
  .post('/login', 'Log in')
