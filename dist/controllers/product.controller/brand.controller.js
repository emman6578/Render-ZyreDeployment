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
// CREATE Brands
exports.create = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { name } = req.body;
    if (!name) {
        res.status(400);
        throw new Error("Brand name is required");
    }
    name = name.toUpperCase();
    // Check if brand already exists
    const existingBrand = yield prisma.brand.findUnique({ where: { name } });
    if (existingBrand) {
        res.status(409);
        throw new Error("Brand with this name already exists");
    }
    // Create the brand
    const brand = yield prisma.brand.create({
        data: { name },
    });
    (0, SuccessHandler_1.successHandler)(brand, res, "POST", "Brand created successfully");
}));
// READ Brands
exports.read = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { search, page = "1", limit = "10" } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const itemsPerPage = parseInt(limit, 10) || 1000;
    const skip = (pageNumber - 1) * itemsPerPage;
    const whereClause = { isActive: true };
    if (search) {
        whereClause.name = { contains: search };
    }
    // Get total count for pagination
    const totalItems = yield prisma.brand.count({ where: whereClause });
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const response = yield prisma.brand.findMany({
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
    (0, SuccessHandler_1.successHandler)({ brands: response, pagination }, res, "GET", `Getting ${search ? "filtered" : "all"} Brands values`);
}));
// READ Single Brands by ID
exports.readById = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    (0, SuccessHandler_1.successHandler)("Read Single Brands", res, "GET", "Brands fetched successfully");
}));
// UPDATE Brands
exports.update = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    let { name, isActive } = req.body;
    if (!id) {
        res.status(400);
        throw new Error("Brand id is required");
    }
    if (!name) {
        res.status(400);
        throw new Error("Brand name is required");
    }
    name = name.toUpperCase();
    // Check if brand exists
    const brand = yield prisma.brand.findUnique({ where: { id: Number(id) } });
    if (!brand) {
        res.status(404);
        throw new Error("Brand not found");
    }
    // Check for duplicate name (excluding current brand)
    const existingBrand = yield prisma.brand.findFirst({
        where: { name, id: { not: Number(id) } },
    });
    if (existingBrand) {
        res.status(409);
        throw new Error("Another brand with this name already exists");
    }
    // Prepare update data
    const updateData = { name };
    if (typeof isActive === "boolean") {
        updateData.isActive = isActive;
    }
    // Update the brand
    const updatedBrand = yield prisma.brand.update({
        where: { id: Number(id) },
        data: updateData,
    });
    (0, SuccessHandler_1.successHandler)(updatedBrand, res, "PUT", "Brand updated successfully");
}));
// DELETE Brands (Soft delete - set isActive to false)
exports.remove = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    (0, SuccessHandler_1.successHandler)("Brands Deleted Successfully", res, "DELETE", "Brands deactivated successfully");
}));
// RESTORE Brands (Reactivate soft-deleted Brands)
exports.restore = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    (0, SuccessHandler_1.successHandler)("Brands Restored Successfully", res, "PUT", "Brands restored successfully");
}));
