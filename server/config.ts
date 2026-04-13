import path from "node:path";

function readRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const parsedPort = Number(process.env.PORT ?? "4000");

export const serverConfig = {
  port: Number.isFinite(parsedPort) ? parsedPort : 4000,
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:8080",
  publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? "4000"}`).replace(/\/$/, ""),
  uploadsDir: path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? "storage/uploads"),
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    currency: (process.env.STRIPE_CURRENCY ?? "inr").toLowerCase(),
  },
  neo4j: {
    uri: readRequiredEnv("NEO4J_URI"),
    username: readRequiredEnv("NEO4J_USERNAME"),
    password: readRequiredEnv("NEO4J_PASSWORD"),
    database: process.env.NEO4J_DATABASE ?? "neo4j",
  },
};
