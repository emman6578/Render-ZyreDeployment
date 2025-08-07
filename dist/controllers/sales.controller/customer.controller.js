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
exports.update = exports.create = exports.read = void 0;
const client_1 = require("@prisma/client");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const SuccessHandler_1 = require("@utils/SuccessHandler/SuccessHandler");
const prisma = new client_1.PrismaClient();
exports.read = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { search, page = "1", limit = "10" } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const itemsPerPage = parseInt(limit, 10) || 1000;
    const skip = (pageNumber - 1) * itemsPerPage;
    const whereClause = search
        ? {
            customerName: {
                contains: search,
            },
        }
        : {};
    // Get total count for pagination
    const totalItems = yield prisma.customer.count({ where: whereClause });
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const findCustomer = yield prisma.customer.findMany({
        where: whereClause,
        orderBy: {
            createdAt: "desc",
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
    (0, SuccessHandler_1.successHandler)({ customers: findCustomer, pagination }, res, "GET", `Getting ${search ? "filtered" : "all"} customers successfully`);
}));
exports.create = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    (0, SuccessHandler_1.successHandler)("result", res, "POST", "Customer created successfully");
}));
// add her on update the isActive to soft delete the customer
exports.update = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    (0, SuccessHandler_1.successHandler)("Updated Customer", res, "PUT", "Customer updated successfully");
}));
