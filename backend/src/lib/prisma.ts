import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["warn", "error"],
});

// Test database connection on startup
export async function connectDatabase() {
  try {
    console.log("[DB] Attempting to connect to MongoDB...");
    console.log(
      "[DB] DATABASE_URL:",
      process.env.DATABASE_URL?.replace(/\/\/[^:]+:[^@]+@/, "//***:***@") ||
        "NOT SET",
    );

    await prisma.$connect();
    console.log("[DB] Successfully connected to MongoDB");

    return true;
  } catch (error) {
    console.error("[DB] Failed to connect to MongoDB:");
    console.error("[DB] Error:", error);
    return false;
  }
}

// Graceful shutdown
process.on("beforeExit", async () => {
  console.log("[DB] Disconnecting from MongoDB...");
  await prisma.$disconnect();
});

export default prisma;
