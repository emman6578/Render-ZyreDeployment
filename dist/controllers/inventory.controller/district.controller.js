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
// CREATE Districts
exports.create = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { name, code, isActive = true } = req.body;
    if (!name) {
        res.status(400);
        throw new Error("District name is required");
    }
    name = name.toUpperCase();
    if (code)
        code = code.toUpperCase();
    try {
        const district = yield prisma.district.create({
            data: { name, code, isActive },
        });
        (0, SuccessHandler_1.successHandler)(district, res, "POST", "Created District successfully");
    }
    catch (error) {
        if (error.code === "P2002") {
            res.status(409);
            throw new Error("District name or code must be unique");
        }
        res.status(500);
        throw new Error(error.message || "Failed to create district");
    }
}));
// READ Districts
exports.read = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { search, page = 1, limit = 100 } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const itemsPerPage = parseInt(limit, 10) || 1000;
    const skip = (pageNumber - 1) * itemsPerPage;
    const whereClause = {
        isActive: true,
    };
    // Step 1: Fetch all districts with basic filters (excluding search)
    const allDistricts = yield prisma.district.findMany({
        where: whereClause,
        orderBy: { name: "asc" },
    });
    // Step 2: Apply search filter (post-query filtering like product service)
    let searched = allDistricts;
    if (search) {
        const s = search.toString().toLowerCase();
        searched = allDistricts.filter((district) => {
            var _a, _b;
            return (district.id.toString().includes(s) ||
                ((_a = district.name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(s)) ||
                ((_b = district.code) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(s)));
        });
    }
    // Step 3: Paginate
    const totalItems = searched.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const paginated = searched.slice(skip, skip + itemsPerPage);
    const pagination = {
        currentPage: pageNumber,
        totalPages,
        totalItems,
        itemsPerPage,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
    };
    (0, SuccessHandler_1.successHandler)({ districts: paginated, pagination }, res, "GET", `Getting ${search ? "filtered" : "all"} Districts values`);
}));
// READ Single Districts by ID
exports.readById = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    (0, SuccessHandler_1.successHandler)("Read Single Districts", res, "GET", "Districts fetched successfully");
}));
// UPDATE Districts
exports.update = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    let { name, code, isActive } = req.body;
    if (!id) {
        res.status(400);
        throw new Error("District id is required");
    }
    try {
        const existing = yield prisma.district.findUnique({
            where: { id: Number(id) },
        });
        if (!existing) {
            res.status(404);
            throw new Error("District not found");
        }
        const updateData = {};
        if (name !== undefined)
            updateData.name = name.toUpperCase();
        if (code !== undefined)
            updateData.code = code.toUpperCase();
        if (isActive !== undefined)
            updateData.isActive = isActive;
        if (Object.keys(updateData).length === 0) {
            res.status(400);
            throw new Error("No update fields provided");
        }
        const updated = yield prisma.district.update({
            where: { id: Number(id) },
            data: updateData,
        });
        (0, SuccessHandler_1.successHandler)(updated, res, "PUT", "District updated successfully");
    }
    catch (error) {
        if (error.code === "P2002") {
            res.status(409);
            throw new Error("District name or code must be unique");
        }
        res.status(500);
        throw new Error(error.message || "Failed to update district");
    }
}));
// DELETE Districts (Soft delete - set isActive to false)
exports.remove = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    (0, SuccessHandler_1.successHandler)("Districts Deleted Successfully", res, "DELETE", "Districts deactivated successfully");
}));
// RESTORE Districts (Reactivate soft-deleted Districts)
exports.restore = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    (0, SuccessHandler_1.successHandler)("Districts Restored Successfully", res, "PUT", "Districts restored successfully");
}));
