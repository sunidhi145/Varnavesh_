import neo4j from "neo4j-driver";
import { serverConfig } from "./config.js";

let driver: neo4j.Driver | null = null;

export function getNeo4jDriver() {
  if (!driver) {
    driver = neo4j.driver(
      serverConfig.neo4j.uri,
      neo4j.auth.basic(serverConfig.neo4j.username, serverConfig.neo4j.password),
    );
  }

  return driver;
}

export async function verifyNeo4jConnection() {
  await getNeo4jDriver().verifyConnectivity();
}

export async function closeNeo4jDriver() {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
