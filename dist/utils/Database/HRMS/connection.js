"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMySQLPool = getMySQLPool;
exports.closeMySQLPool = closeMySQLPool;
exports.withConnection = withConnection;
exports.withTransaction = withTransaction;
const promise_1 = __importDefault(require("mysql2/promise"));
let pool = null;
function getMySQLPool() {
    if (!pool) {
        // Validate required env vars
        if (!process.env.DB_HOST ||
            !process.env.DB_USER ||
            !process.env.DB_PASSWORD ||
            !process.env.DB_NAME) {
            throw new Error("Missing required database environment variables");
        }
        pool = promise_1.default.createPool({
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
        pool.on("connection", (connection) => {
            console.log(`New connection established as id ${connection.threadId}`);
        });
        // Cast to any to avoid TypeScript issues with event names
        pool.on("error", (err) => {
            console.error("Database pool error:", err);
        });
    }
    return pool;
}
function closeMySQLPool() {
    return __awaiter(this, void 0, void 0, function* () {
        if (pool) {
            try {
                yield pool.end();
                pool = null;
            }
            catch (error) {
                console.error("Error closing database pool:", error);
            }
        }
    });
}
// Enhanced connection function with basic retry
function withConnection(fn) {
    return __awaiter(this, void 0, void 0, function* () {
        const pool = getMySQLPool();
        let connection = null;
        try {
            connection = yield pool.getConnection();
            // Test connection before use
            yield connection.ping();
            return yield fn(connection);
        }
        catch (error) {
            console.error("Database operation failed:", error);
            throw error;
        }
        finally {
            if (connection) {
                connection.release();
            }
        }
    });
}
// Transaction helper
function withTransaction(fn) {
    return __awaiter(this, void 0, void 0, function* () {
        return withConnection((connection) => __awaiter(this, void 0, void 0, function* () {
            yield connection.beginTransaction();
            try {
                const result = yield fn(connection);
                yield connection.commit();
                return result;
            }
            catch (error) {
                yield connection.rollback();
                throw error;
            }
        }));
    });
}
// Graceful shutdown
process.on("SIGTERM", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Received SIGTERM, closing database connections...");
    yield closeMySQLPool();
    process.exit(0);
}));
process.on("SIGINT", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Received SIGINT, closing database connections...");
    yield closeMySQLPool();
    process.exit(0);
}));
