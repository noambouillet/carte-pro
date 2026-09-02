import { Elysia } from "elysia";

export const employeeRoutes = new Elysia({ prefix: "/api/employee" })
  .get('/balance', 'Balance')
  .get('/transactions', 'Transactions history')
  .get('/qrcode', 'QR Code generation')
  .post('/login', 'Log in')
  .post('/register', 'Register')
