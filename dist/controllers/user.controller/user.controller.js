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
exports.updateUser = exports.getCurrentUser = exports.users = void 0;
const client_1 = require("@prisma/client");
const SuccessHandler_1 = require("@utils/SuccessHandler/SuccessHandler");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
//Services Imports
const prisma = new client_1.PrismaClient();
exports.users = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const allUsers = yield prisma.user.findMany({
        include: {
            role: { select: { name: true } },
            stores: { select: { id: true, name: true } }, // Include both id and name
            position: { select: { id: true, name: true } }, // Include both id and name
        },
    });
    // Format users according to requirements with proper ID structure
    const formattedUsers = allUsers.map((user) => ({
        id: user.id,
        name: user.fullname,
        role: user.role.name.toLowerCase(),
        store: user.stores.map((store) => ({
            id: store.id,
            name: store.name.toLowerCase(),
        })),
        position: user.position
            ? {
                id: user.position.id,
                name: user.position.name.toLowerCase().replace(/_/g, "-"),
            }
            : null,
    }));
    (0, SuccessHandler_1.successHandler)(formattedUsers, res, "GET", "Successfully fetched all the users");
}));
exports.getCurrentUser = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (!req.user) {
        throw new Error("User not authenticated");
    }
    // Format user according to requirements
    const formattedUser = {
        id: req.user.id,
        name: req.user.fullname,
        role: (_a = req.user.roleName) === null || _a === void 0 ? void 0 : _a.toLowerCase(),
        store: (_b = req.user.storeNames) === null || _b === void 0 ? void 0 : _b.map((name) => name),
        position: req.user.positionName
            ? req.user.positionName.toLowerCase().replace(/_/g, "-")
            : null,
    };
    res.json(formattedUser);
}));
exports.updateUser = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const { storeIds, positionId } = req.body; // storeIds: number[], positionId?: number
    // Convert userId to number since it's an integer in the schema
    const userIdInt = parseInt(userId);
    const updatedUser = yield prisma.user.update({
        where: { id: userIdInt },
        data: {
            stores: { set: storeIds.map((id) => ({ id })) },
            positionId: positionId || null, // Direct assignment since it's a foreign key
        },
        include: {
            stores: { select: { id: true, name: true } },
            position: { select: { id: true, name: true } },
            role: { select: { name: true } },
        },
    });
    // Format user according to requirements with proper ID structure
    const formattedUser = {
        id: updatedUser.id,
        name: updatedUser.fullname,
        role: updatedUser.role.name.toLowerCase(),
        store: updatedUser.stores.map((store) => ({
            id: store.id,
            name: store.name.toLowerCase(),
        })),
        position: updatedUser.position
            ? {
                id: updatedUser.position.id,
                name: updatedUser.position.name.toLowerCase().replace(/_/g, "-"),
            }
            : null,
    };
    (0, SuccessHandler_1.successHandler)(formattedUser, res, "PUT", "User stores and position updated successfully");
}));
