import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export function getMySQLPool(): mysql.Pool {
  if (!pool) {
    // Validate required env vars
    if (
      !process.env.DB_HOST ||
      !process.env.DB_USER ||
      !process.env.DB_PASSWORD ||
      !process.env.DB_NAME
    ) {
      throw new Error("Missing required database environment variables");
    }

    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || "3306"),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || "10"),
      queueLimit: 0,
      // Only use properties that exist in mysql2 PoolOptions
      multipleStatements: false,
      charset: "utf8mb4",
      timezone: "Z",
      supportBigNumbers: true,
      bigNumberStrings: true,
    });

    // Error event listener
    pool.on("connection", (connection: any) => {
      console.log(`New connection established as id ${connection.threadId}`);
    });

    // Cast to any to avoid TypeScript issues with event names
    (pool as any).on("error", (err: Error) => {
      console.error("Database pool error:", err);
    });
  }
  return pool;
}

export async function closeMySQLPool(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
      pool = null;
    } catch (error) {
      console.error("Error closing database pool:", error);
    }
  }
}

// Enhanced connection function with basic retry
export async function withConnection<T>(
  fn: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const pool = getMySQLPool();
  let connection: mysql.PoolConnection | null = null;

  try {
    connection = await pool.getConnection();
    // Test connection before use
    await connection.ping();
    return await fn(connection);
  } catch (error) {
    console.error("Database operation failed:", error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Transaction helper
export async function withTransaction<T>(
  fn: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  return withConnection(async (connection) => {
    await connection.beginTransaction();
    try {
      const result = await fn(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  });
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, closing database connections...");
  await closeMySQLPool();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Received SIGINT, closing database connections...");
  await closeMySQLPool();
  process.exit(0);
});
