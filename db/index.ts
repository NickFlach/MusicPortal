import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

let pool: Pool;
let db: ReturnType<typeof drizzle>;
let isMockDatabase = false;

if (!process.env.DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL not set - using fallback mode');
  console.warn('💡 For development, you can:');
  console.warn('   1. Set DATABASE_URL in .env file');
  console.warn('   2. Use a local PostgreSQL database');
  console.warn('   3. Run: npm run db:push to create database');

  // Create a mock database for development
  pool = new Pool({
    connectionString: 'postgresql://mock:mock@localhost:5432/mock'
  });

  db = drizzle({ client: pool, schema });
  isMockDatabase = true;
} else {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  db = drizzle({ client: pool, schema });
  isMockDatabase = false;
}

export { pool, db, isMockDatabase };