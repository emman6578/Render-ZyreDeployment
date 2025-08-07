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
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPurchase_service = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const verifyPurchase_service = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const { purchaseId, userId, ipAddress, userAgent } = params;
    try {
        // Check if purchase exists and get current user's name
        const [purchase, user] = yield Promise.all([
            prisma.purchase.findUnique({
                where: { id: purchaseId },
                select: {
                    id: true,
                    batchNumber: true,
                    verifiedBy: true,
                    verificationDate: true,
                    status: true,
                },
            }),
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    fullname: true,
                },
            }),
        ]);
        if (!purchase) {
            throw new Error("Purchase not found");
        }
        if (!user) {
            throw new Error("User not found");
        }
        // Check if already verified
        if (purchase.verifiedBy && purchase.verificationDate) {
            throw new Error(`Purchase batch #${purchase.batchNumber} has already been verified by ${purchase.verifiedBy} on ${purchase.verificationDate.toLocaleDateString()}`);
        }
        // Update purchase verification
        const updatedPurchase = yield prisma.purchase.update({
            where: { id: purchaseId },
            data: {
                verifiedBy: user.fullname,
                verificationDate: new Date(),
                updatedBy: { connect: { id: userId } },
            },
            select: {
                id: true,
                batchNumber: true,
                verifiedBy: true,
                verificationDate: true,
                supplier: {
                    select: {
                        name: true,
                    },
                },
                items: {
                    select: {
                        product: {
                            select: {
                                generic: { select: { name: true } },
                                brand: { select: { name: true } },
                            },
                        },
                        initialQuantity: true,
                    },
                },
            },
        });
        // Create activity log for verification
        yield prisma.activityLog.create({
            data: {
                userId: userId,
                model: "Purchase",
                recordId: purchaseId,
                action: client_1.ActionType.UPDATE,
                description: `Verified purchase batch #${updatedPurchase.batchNumber} from ${updatedPurchase.supplier.name} containing ${updatedPurchase.items.length} product(s)`,
                ipAddress: ipAddress,
                userAgent: userAgent,
            },
        });
        // Transform response data
        const response = {
            id: updatedPurchase.id,
            batchNumber: updatedPurchase.batchNumber,
            verification: {
                verifiedBy: updatedPurchase.verifiedBy,
                verificationDate: updatedPurchase.verificationDate,
            },
            supplier: updatedPurchase.supplier.name,
            totalProducts: updatedPurchase.items.length,
            totalQuantity: updatedPurchase.items.reduce((sum, item) => sum + item.initialQuantity, 0),
            verificationTimestamp: new Date().toISOString(),
        };
        return response;
    }
    catch (error) {
        console.error("Purchase verification error:", error);
        // Handle specific error cases
        if (error.message === "Purchase not found") {
            throw new Error("Purchase not found");
        }
        if (error.message === "User not found") {
            throw new Error("User not found");
        }
        if (error.message.includes("already been verified")) {
            throw new Error(error.message);
        }
        // Handle Prisma errors
        if (error.code === "P2025") {
            throw new Error("Purchase not found");
        }
        // Fallback
        throw new Error(error.message || "Failed to verify purchase");
    }
});
exports.verifyPurchase_service = verifyPurchase_service;
