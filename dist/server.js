"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("module-alias/register");
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
//Routes Imports
const auth_routes_1 = __importDefault(require("@routes/auth.routes"));
const user_routes_1 = __importDefault(require("@routes/user.routes"));
const product_routes_1 = __importDefault(require("@routes/product.routes"));
const inventory_routes_1 = __importDefault(require("@routes/inventory.routes"));
const generics_routes_1 = __importDefault(require("@routes/generics.routes"));
const brand_routes_1 = __importDefault(require("@routes/brand.routes"));
const categories_routes_1 = __importDefault(require("@routes/categories.routes"));
const company_routes_1 = __importDefault(require("@routes/company.routes"));
const supplier_routes_1 = __importDefault(require("@routes/supplier.routes"));
const district_routes_1 = __importDefault(require("@routes/district.routes"));
const log_routes_1 = __importDefault(require("@routes/log.routes"));
const purchase_routes_1 = __importDefault(require("@routes/purchase.routes"));
const sales_routes_1 = __importDefault(require("@routes/sales.routes"));
const psr_routes_1 = __importDefault(require("@routes/psr.routes"));
const customer_routes_1 = __importDefault(require("@routes/customer.routes"));
const collections_routes_1 = __importDefault(require("@routes/collections.routes"));
//Error Handler
const ErrorHandler_1 = require("@utils/ErrorHandler/ErrorHandler");
const SuccessHandler_1 = require("@utils/SuccessHandler/SuccessHandler");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
//env config
dotenv_1.default.config();
//constants
const server = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Trust proxy - needed when behind a reverse proxy (like on Render, Heroku, etc.)
server.set("trust proxy", 1);
//middlewares
server.use(express_1.default.json());
// Configure CORS BEFORE other middlewares - this is crucial
const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:3000", // Add this explicitly for development
    "https://zyre.vercel.app", // Add your actual production domain
];
server.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true, // Important for cookies to work cross-origin
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-CSRF-Token",
        "x-csrf-token",
    ],
    exposedHeaders: ["Set-Cookie"],
}));
// Add cookie parser middleware AFTER CORS
server.use((0, cookie_parser_1.default)());
// Configure helmet after CORS
server.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));
// Rate limiting configuration
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: "Too many requests from this IP, please try again later.",
        retryAfter: "5 minutes",
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Skip rate limiting for certain conditions (optional)
    skip: (req) => {
        const token = req.cookies["auth_token"];
        return token;
    },
});
server.use("/api/v1/auth/login", (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, //15 minutes
    max: 50, // stricter for login
    message: {
        error: "Too many requests from this IP, please try again later, after 15 minutes.",
        retryAfter: "15 minutes",
    },
}));
// Apply general rate limiting to all routes
server.use(limiter);
server.use("/uploads", express_1.default.static("public"));
server.use("/reports", express_1.default.static("public/reports"));
//routes import
server.use("/api/v1/auth", auth_routes_1.default);
server.use("/api/v1/users", user_routes_1.default);
server.use("/api/v1/products", product_routes_1.default);
server.use("/api/v1/inventory", inventory_routes_1.default);
server.use("/api/v1/generics", generics_routes_1.default);
server.use("/api/v1/brand", brand_routes_1.default);
server.use("/api/v1/categories", categories_routes_1.default);
server.use("/api/v1/company", company_routes_1.default);
server.use("/api/v1/supplier", supplier_routes_1.default);
server.use("/api/v1/district", district_routes_1.default);
server.use("/api/v1/logs", log_routes_1.default);
server.use("/api/v1/purchase", purchase_routes_1.default);
server.use("/api/v1/sales", sales_routes_1.default);
server.use("/api/v1/psr", psr_routes_1.default);
server.use("/api/v1/customer", customer_routes_1.default);
server.use("/api/v1/collections", collections_routes_1.default);
//Welcome Route Info about this codebase
server.get("/", (req, res) => {
    (0, SuccessHandler_1.successHandler)("NodeJS Boilerplate", res, "GET", "Success Main Route");
});
//error handler
server.use(ErrorHandler_1.notFound);
server.use(ErrorHandler_1.errorHandler);
server.listen(port, () => {
    console.log(`[Server] running on port http://localhost:${port}`);
});
