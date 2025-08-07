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
exports.read = void 0;
const client_1 = require("@prisma/client");
const SuccessHandler_1 = require("@utils/SuccessHandler/SuccessHandler");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const prisma = new client_1.PrismaClient();
exports.read = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // ───────────────────────────────────────────────────────────────────────────
    // 1) Parse query params (with defaults)
    // ───────────────────────────────────────────────────────────────────────────
    // page & limit for pagination
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100); // cap at 100 per page
    const skip = (page - 1) * limit;
    // sortBy & sortOrder
    //   - default to sorting by createdAt DESC
    const sortBy = String(req.query.sortBy || "createdAt");
    const sortOrder = String(req.query.sortOrder || "desc").toLowerCase() === "asc"
        ? "asc"
        : "desc";
    // optional filters: model, action, userId, date range (from/to)
    const filters = {};
    if (req.query.model) {
        filters.model = String(req.query.model);
    }
    if (req.query.action) {
        filters.action = String(req.query.action).toUpperCase();
    }
    if (req.query.userId) {
        const u = Number(req.query.userId);
        if (!Number.isNaN(u)) {
            filters.userId = u;
        }
    }
    // filter by createdAt between fromDate and toDate if provided
    if (req.query.fromDate || req.query.toDate) {
        const fromDate = req.query.fromDate
            ? new Date(String(req.query.fromDate))
            : null;
        const toDate = req.query.toDate ? new Date(String(req.query.toDate)) : null;
        filters.createdAt = {};
        if (fromDate && !Number.isNaN(fromDate.getTime())) {
            filters.createdAt.gte = fromDate;
        }
        if (toDate && !Number.isNaN(toDate.getTime())) {
            // toDate set to end of the day if only date provided
            const end = new Date(toDate);
            end.setHours(23, 59, 59, 999);
            filters.createdAt.lte = end;
        }
        // if both fromDate and toDate were invalid, remove
        if (Object.keys(filters.createdAt).length === 0) {
            delete filters.createdAt;
        }
    }
    // ───────────────────────────────────────────────────────────────────────────
    // 2) Build prisma queries
    // ───────────────────────────────────────────────────────────────────────────
    // a) Count total matching records (for pagination meta)
    const total = yield prisma.activityLog.count({
        where: filters,
    });
    // b) Fetch the paginated chunk with includes
    const activity_logs = yield prisma.activityLog.findMany({
        where: filters,
        include: {
            user: { select: { fullname: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
    });
    // ───────────────────────────────────────────────────────────────────────────
    // 3) Build metadata
    // ───────────────────────────────────────────────────────────────────────────
    const totalPages = Math.ceil(total / limit);
    // ───────────────────────────────────────────────────────────────────────────
    // 4) Send response via successHandler
    // ───────────────────────────────────────────────────────────────────────────
    (0, SuccessHandler_1.successHandler)({
        meta: {
            total,
            page,
            limit,
            totalPages,
        },
        logs: activity_logs,
    }, res, "GET", "Activity Log fetched successfully");
}));
