import { Elysia } from "elysia";

export const partnersRoutes = new Elysia({ prefix: "/api/partners" })
  .post('/login', 'Log in')
  .post('/register', 'Register')
  .post('/search', 'Search')
