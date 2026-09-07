import { Elysia, t } from "elysia";
import { jwt } from "@elysia/jwt";
import { QR_JWT_SECRET } from "../config/env";

const qrJwtSchema = t.Object({
  employeeId: t.String(),
  jti: t.String(),
});

export const qrJwtPlugin = new Elysia({ name: "qr-jwt" }).use(
  jwt({
    name: "qrJwt",
    secret: QR_JWT_SECRET,
    alg: "HS256",
    exp: "5m",
    schema: qrJwtSchema,
  })
);
