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
exports.generateRefNumber = generateRefNumber;
const date_fns_1 = require("date-fns");
const DEFAULT_RANDOM_LENGTH = 4;
function generateRefNumber(prisma_1) {
    return __awaiter(this, arguments, void 0, function* (prisma, randomLength = DEFAULT_RANDOM_LENGTH, prefix) {
        // 1. Build the date portion
        const datePart = (0, date_fns_1.format)(new Date(), "yyyyMMdd");
        // 2. Random digits helper
        const makeRandom = () => Math.floor(Math.random() * Math.pow(10, randomLength))
            .toString()
            .padStart(randomLength, "0");
        let candidate;
        let conflict = true;
        // 3. Loop until we find a non‐existent one
        while (conflict) {
            candidate = `${prefix}-${datePart}-${makeRandom()}`;
            const existing = yield prisma.purchaseReturn.findFirst({
                where: { referenceNumber: candidate },
                select: { id: true },
            });
            if (!existing) {
                conflict = false;
            }
        }
        return candidate;
    });
}
