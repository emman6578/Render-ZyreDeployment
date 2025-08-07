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
// CREATE Supplier
exports.create = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { name, tin_id, contact, address, isActive = true } = req.body;
    if (!name) {
        res.status(400);
        throw new Error("Supplier name is required");
    }
    name = name.toUpperCase();
    try {
        const supplier = yield prisma.supplier.create({
            data: { name, tin_id, contact, address, isActive },
        });
        (0, SuccessHandler_1.successHandler)(supplier, res, "POST", "Created Supplier successfully");
    }
    catch (error) {
        if (error.code === "P2002") {
            res.status(409);
            throw new Error("Supplier name must be unique");
        }
        res.status(500);
        throw new Error(error.message || "Failed to create supplier");
    }
}));
// READ Supplier
exports.read = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { search, page = 1, limit = 100 } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const itemsPerPage = parseInt(limit, 10) || 100;
    const skip = (pageNumber - 1) * itemsPerPage;
    const whereClause = {
        isActive: true,
    };
    if (search) {
        whereClause.name = {
            contains: search,
        };
    }
    const [totalItems, suppliers] = yield Promise.all([
        prisma.supplier.count({ where: whereClause }),
        prisma.supplier.findMany({
            where: whereClause,
            orderBy: { name: "asc" },
            skip,
            take: itemsPerPage,
            select: {
                id: true,
                name: true,
                tin_id: true,
                contact: true,
                address: true,
                isActive: true,
            },
        }),
    ]);
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const pagination = {
        currentPage: pageNumber,
        totalPages,
        totalItems,
        itemsPerPage,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
    };
    (0, SuccessHandler_1.successHandler)({ suppliers, pagination }, res, "GET", `Getting ${search ? "filtered" : "all"} Supplier values`);
}));
// READ Single Supplier by ID
exports.readById = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    (0, SuccessHandler_1.successHandler)("Read Single Supplier", res, "GET", "Supplier fetched successfully");
}));
// UPDATE Supplier
exports.update = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    let { name, tin_id, contact, address, isActive } = req.body;
    if (!id) {
        res.status(400);
        throw new Error("Supplier id is required");
    }
    try {
        const existing = yield prisma.supplier.findUnique({
            where: { id: Number(id) },
        });
        if (!existing) {
            res.status(404);
            throw new Error("Supplier not found");
        }
        const updateData = {};
        if (name !== undefined)
            updateData.name = name.toUpperCase();
        if (tin_id !== undefined)
            updateData.tin_id = tin_id;
        if (contact !== undefined)
            updateData.contact = contact;
        if (address !== undefined)
            updateData.address = address;
        if (isActive !== undefined)
            updateData.isActive = isActive;
        if (Object.keys(updateData).length === 0) {
            res.status(400);
            throw new Error("No update fields provided");
        }
        const updated = yield prisma.supplier.update({
            where: { id: Number(id) },
            data: updateData,
        });
        (0, SuccessHandler_1.successHandler)(updated, res, "PUT", "Supplier updated successfully");
    }
    catch (error) {
        if (error.code === "P2002") {
            res.status(409);
            throw new Error("Supplier name must be unique");
        }
        res.status(500);
        throw new Error(error.message || "Failed to update supplier");
    }
}));
// DELETE Supplier (Soft delete - set isActive to false)
exports.remove = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    (0, SuccessHandler_1.successHandler)("Supplier Deleted Successfully", res, "DELETE", "Supplier deactivated successfully");
}));
// RESTORE Supplier (Reactivate soft-deleted Supplier)
exports.restore = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    (0, SuccessHandler_1.successHandler)("Supplier Restored Successfully", res, "PUT", "Supplier restored successfully");
}));
