import { Sequelize } from "sequelize";
import { requiredEnv } from './env'

const sequelize = new Sequelize({
  dialect: "postgres",
  host: requiredEnv("DB_HOST"),
  port: Number(process.env.DB_PORT || 5432),
  database: requiredEnv("DB_NAME"),
  username: requiredEnv("DB_USER"),
  password: requiredEnv("DB_PASSWORD"),
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export { sequelize };
