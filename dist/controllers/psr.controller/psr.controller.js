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
exports.syncAndReadPSR = exports.read = exports.read_PSR_from_HRMS = void 0;
const client_1 = require("@prisma/client");
const connection_1 = require("@utils/Database/HRMS/connection");
const SuccessHandler_1 = require("@utils/SuccessHandler/SuccessHandler");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const crypto_1 = __importDefault(require("crypto"));
const prisma = new client_1.PrismaClient();
exports.read_PSR_from_HRMS = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [rows] = yield (0, connection_1.withConnection)((connection) => __awaiter(void 0, void 0, void 0, function* () {
            return connection.query(`
          SELECT 
            u.id, 
            u.name, 
            u.usercode, 
            u.district_id,
            d.name AS district_name  
          FROM 
            users u
          LEFT JOIN 
            districts d ON u.district_id = d.id  
          WHERE 
            u.position = 'PSR';
        `);
        }));
        const formattedUsers = rows.map((user) => ({
            id: user.id,
            name: user.name,
            userCode: user.usercode,
            district: user.district_name,
        }));
        (0, SuccessHandler_1.successHandler)(formattedUsers, res, "GET", "Success");
    }
    catch (error) {
        // Log the error properly
        console.error("Database error:", error);
        throw new Error("Error fetching PSR from MySQL: " + error.message);
    }
}));
// READ PSR
exports.read = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { search, areaCode } = req.query;
    let whereClause = {};
    if (search) {
        whereClause = {
            OR: [
                { fullName: { contains: search } },
                { areaCode: { contains: search } },
                { psrCode: { contains: search } },
            ],
        };
    }
    if (areaCode) {
        // If whereClause is already an OR, wrap with AND
        if (whereClause.OR) {
            whereClause = {
                AND: [whereClause, { areaCode: { equals: areaCode } }],
            };
        }
        else {
            whereClause.areaCode = { equals: areaCode };
        }
    }
    const response = yield prisma.pSR.findMany({
        where: whereClause,
        orderBy: {
            fullName: "asc",
        },
    });
    (0, SuccessHandler_1.successHandler)(response, res, "GET", `Getting ${search || areaCode ? "filtered" : "all"} PSR values`);
}));
exports.syncAndReadPSR = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // 1. Fetch from legacy HRMS
    const [rows] = yield (0, connection_1.withConnection)((connection) => connection.query(`
        SELECT 
          u.usercode, 
          u.name, 
          d.name AS district_name  
        FROM users u
        LEFT JOIN districts d ON u.district_id = d.id  
        WHERE u.position = 'PSR';
      `));
    // 2. Compute hash for each row
    const hrmsPSRs = rows.map((u) => {
        const payload = `${u.usercode}|${u.name}|${u.district_name || ""}`;
        const hash = crypto_1.default.createHash("sha256").update(payload).digest("hex");
        return {
            psrCode: u.usercode,
            fullName: u.name,
            areaCode: u.district_name,
            sourceHash: hash,
            createdById: req.user.id,
            updatedById: req.user.id,
        };
    });
    // 3. Bulk upsert only when hash differs
    yield prisma.$transaction(hrmsPSRs
        .map((psr) => prisma.pSR.upsert({
        where: { psrCode: psr.psrCode },
        create: psr,
        update: {
            // only update if the incoming hash is different
            fullName: psr.fullName,
            areaCode: psr.areaCode,
            sourceHash: psr.sourceHash,
            updatedById: psr.updatedById,
        },
        // add a conditional so Prisma only issues the UPDATE when needed
        // (unfortunately Prisma doesn’t support WHERE in UPDATE directly,
        //  so we filter in JavaScript)
    }))
        .filter((upsertOp, idx) => __awaiter(void 0, void 0, void 0, function* () {
        // fetch existing hash for comparison
        const existing = yield prisma.pSR.findUnique({
            where: { psrCode: hrmsPSRs[idx].psrCode },
            select: { sourceHash: true },
        });
        // only keep the upsert if it’s a new record or hash changed
        return !existing || existing.sourceHash !== hrmsPSRs[idx].sourceHash;
    })));
    // 4. Return the full list
    const allPSRs = yield prisma.pSR.findMany({ orderBy: { fullName: "asc" } });
    (0, SuccessHandler_1.successHandler)(allPSRs, res, "GET", "PSRs synced (only new or changed ones updated)");
}));
