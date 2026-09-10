const requiredEnv = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const PORT = Number(requiredEnv("PORT"));
const DB_PORT = Number(requiredEnv("DB_PORT"));

if (!Number.isInteger(PORT) || PORT <= 0 || PORT > 65535) {
  throw new Error(`Invalid PORT: ${PORT}`);
}
if (!Number.isInteger(DB_PORT) || DB_PORT <= 0 || DB_PORT > 65535) {
  throw new Error(`Invalid db port: ${DB_PORT}`);
}

const FRONTEND_URL = requiredEnv("FRONTEND_URL");
const DB_USER = requiredEnv("DB_USER");
const DB_HOST = requiredEnv("DB_HOST");
const DB_PASSWORD = requiredEnv("DB_PASSWORD");
const DB_NAME = requiredEnv("DB_NAME");

const JWT_ACCESS_SECRET = requiredEnv("JWT_ACCESS_SECRET")
const QR_JWT_SECRET = requiredEnv("QR_JWT_SECRET")

const AUDIT_EXPORT_HMAC_KEY = requiredEnv("AUDIT_EXPORT_HMAC_KEY")

export { PORT, FRONTEND_URL, DB_USER, DB_PORT, DB_HOST, DB_PASSWORD, DB_NAME, JWT_ACCESS_SECRET, QR_JWT_SECRET, AUDIT_EXPORT_HMAC_KEY };
