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
exports.restore = exports.remove = exports.update = exports.readById = exports.read = exports.create = void 0;
const client_1 = require("@prisma/client");
const SuccessHandler_1 = require("@utils/SuccessHandler/SuccessHandler");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const prisma = new client_1.PrismaClient();
// CREATE Generics
exports.create = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { name, isActive = true } = req.body;
    if (!name) {
        res.status(400);
        throw new Error("Generic name is required");
    }
    name = name.toUpperCase();
    try {
        const generic = yield prisma.generic.create({
            data: { name, isActive },
        });
        (0, SuccessHandler_1.successHandler)(generic, res, "POST", "Created Generics successfully");
    }
    catch (error) {
        if (error.code === "P2002") {
            // Prisma unique constraint failed
            res.status(409);
            throw new Error("Generic name must be unique");
        }
        res.status(500);
        throw new Error(error.message || "Failed to create generic");
    }
}));
// READ Generics
exports.read = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { search, page = "1", limit = "10" } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const itemsPerPage = parseInt(limit, 10) || 1000;
    const skip = (pageNumber - 1) * itemsPerPage;
    const whereClause = Object.assign({ isActive: true }, (search
        ? {
            name: {
                contains: search,
            },
        }
        : {}));
    // Get total count for pagination
    const totalItems = yield prisma.generic.count({ where: whereClause });
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const response = yield prisma.generic.findMany({
        where: whereClause,
        orderBy: {
            name: "asc",
        },
        skip,
        take: itemsPerPage,
    });
    const pagination = {
        currentPage: pageNumber,
        totalPages,
        totalItems,
        itemsPerPage,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
    };
    (0, SuccessHandler_1.successHandler)({ generics: response, pagination }, res, "GET", `Getting ${search ? "filtered" : "all"} generics values`);
}));
// READ Single Generics by ID
exports.readById = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    (0, SuccessHandler_1.successHandler)("Read Single Generics", res, "GET", "Generics fetched successfully");
}));
// UPDATE Generics
exports.update = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    let { name, isActive } = req.body;
    if (!id) {
        res.status(400);
        throw new Error("Generic id is required");
    }
    try {
        // Check if generic exists
        const existing = yield prisma.generic.findUnique({
            where: { id: Number(id) },
        });
        if (!existing) {
            res.status(404);
            throw new Error("Generic not found");
        }
        // Prepare update data
        const updateData = {};
        if (name !== undefined)
            updateData.name = name.toUpperCase();
        if (isActive !== undefined)
            updateData.isActive = isActive;
        if (Object.keys(updateData).length === 0) {
            res.status(400);
            throw new Error("No update fields provided");
        }
        const updated = yield prisma.generic.update({
            where: { id: Number(id) },
            data: updateData,
        });
        (0, SuccessHandler_1.successHandler)(updated, res, "PUT", "Generics updated successfully");
    }
    catch (error) {
        if (error.code === "P2002") {
            // Prisma unique constraint failed
            res.status(409);
            throw new Error("Generic name must be unique");
        }
        res.status(500);
        throw new Error(error.message || "Failed to update generic");
    }
}));
// DELETE Generics (Soft delete - set isActive to false)
exports.remove = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    (0, SuccessHandler_1.successHandler)("Generics Deleted Successfully", res, "DELETE", "Generics deactivated successfully");
}));
// RESTORE Generics (Reactivate soft-deleted Generics)
exports.restore = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    (0, SuccessHandler_1.successHandler)("Generics Restored Successfully", res, "PUT", "Generics restored successfully");
}));
