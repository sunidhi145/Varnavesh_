import "dotenv/config";
import { closeNeo4jDriver, verifyNeo4jConnection } from "../neo4j.js";
import { seedDatabase } from "../repository.js";
import { seedProducts } from "../seed-data.js";

async function run() {
  await verifyNeo4jConnection();
  await seedDatabase(seedProducts);
  console.log(`Seeded ${seedProducts.length} products into Neo4j.`);
}

run()
  .catch((error) => {
    console.error("Neo4j seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeNeo4jDriver();
  });
