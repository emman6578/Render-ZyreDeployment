import "module-alias/register";
import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

//Routes Imports
import AuthRoutes from "@routes/auth.routes";
import UserRoutes from "@routes/user.routes";
import ProductRoutes from "@routes/product.routes";
import InventoryRoutes from "@routes/inventory.routes";

import GenericRoutes from "@routes/generics.routes";
import BrandRoutes from "@routes/brand.routes";
import CategoryRoutes from "@routes/categories.routes";
import CompanyRoutes from "@routes/company.routes";

import SupplierRoutes from "@routes/supplier.routes";
import DistrictRoutes from "@routes/district.routes";
import ActivityLogRoutes from "@routes/log.routes";

import PurchaseRoutes from "@routes/purchase.routes";
import SalesRoutes from "@routes/sales.routes";

import PSR_Routes from "@routes/psr.routes";
import CustomerRoutes from "@routes/customer.routes";
import CollectionController from "@routes/collections.routes";

//Error Handler
import { errorHandler, notFound } from "@utils/ErrorHandler/ErrorHandler";
import { successHandler } from "@utils/SuccessHandler/SuccessHandler";
import rateLimit from "express-rate-limit";

//env config
dotenv.config();

//constants
const server = express();
const port = process.env.PORT || 3001;

// Trust proxy - needed when behind a reverse proxy (like on Render, Heroku, etc.)
server.set("trust proxy", 1);

//middlewares
server.use(express.json());

// Configure CORS BEFORE other middlewares - this is crucial
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000", // Add this explicitly for development
  "https://zyre.vercel.app", // Add your actual production domain
];

server.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
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
  })
);

// Add cookie parser middleware AFTER CORS
server.use(cookieParser());

// Configure helmet after CORS
server.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Rate limiting configuration
const limiter = rateLimit({
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

server.use(
  "/api/v1/auth/login",
  rateLimit({
    windowMs: 15 * 60 * 1000, //15 minutes
    max: 50, // stricter for login
    message: {
      error:
        "Too many requests from this IP, please try again later, after 15 minutes.",
      retryAfter: "15 minutes",
    },
  })
);

// Apply general rate limiting to all routes
server.use(limiter);

server.use("/uploads", express.static("public"));
server.use("/reports", express.static("public/reports"));

//routes import
server.use("/api/v1/auth", AuthRoutes);
server.use("/api/v1/users", UserRoutes);
server.use("/api/v1/products", ProductRoutes);
server.use("/api/v1/inventory", InventoryRoutes);
server.use("/api/v1/generics", GenericRoutes);
server.use("/api/v1/brand", BrandRoutes);
server.use("/api/v1/categories", CategoryRoutes);
server.use("/api/v1/company", CompanyRoutes);
server.use("/api/v1/supplier", SupplierRoutes);
server.use("/api/v1/district", DistrictRoutes);
server.use("/api/v1/logs", ActivityLogRoutes);
server.use("/api/v1/purchase", PurchaseRoutes);
server.use("/api/v1/sales", SalesRoutes);
server.use("/api/v1/psr", PSR_Routes);
server.use("/api/v1/customer", CustomerRoutes);
server.use("/api/v1/collections", CollectionController);

//Welcome Route Info about this codebase
server.get("/", (req: Request, res: Response) => {
  successHandler("NodeJS Boilerplate", res, "GET", "Success Main Route");
});

//error handler
server.use(notFound);
server.use(errorHandler);

server.listen(port, () => {
  console.log(`[Server] running on port http://localhost:${port}`);
});
