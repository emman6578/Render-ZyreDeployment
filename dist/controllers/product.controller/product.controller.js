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
exports.update = exports.readProductToUpdate = exports.readById = exports.readProductTransactionSummary = exports.read = exports.create = void 0;
const SuccessHandler_1 = require("@utils/SuccessHandler/SuccessHandler");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const create_service_1 = require("@services/product.services/create.service");
const read_by_id_service_1 = require("@services/product.services/read-by-id.service");
const read_service_1 = require("@services/product.services/read.service");
const update_service_1 = require("@services/product.services/update.service");
const client_1 = require("@prisma/client");
const path_1 = __importDefault(require("path"));
const uploadMiddleware_1 = require("@middlewares/uploadMiddleware");
const prisma = new client_1.PrismaClient();
exports.create = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Validate user is authenticated
    if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
        throw new Error("User authentication required");
    }
    const uploadedFiles = [];
    try {
        const createdById = req.user.id;
        // Parse the products array from form data
        let productsData;
        // Check if products data is sent as JSON string in form-data
        if (req.body.products) {
            try {
                productsData = JSON.parse(req.body.products);
            }
            catch (error) {
                throw new Error("Invalid products data format. Expected JSON array.");
            }
        }
        else {
            throw new Error("Products array is required in 'products' field");
        }
        // Validate that products is an array
        if (!Array.isArray(productsData)) {
            throw new Error("Products must be an array");
        }
        if (productsData.length === 0) {
            throw new Error("At least one product is required");
        }
        // Process uploaded files - Handle multer array format
        const uploadedImages = {};
        if (req.files && Array.isArray(req.files)) {
            req.files.forEach((file, index) => {
                // Create image path
                const imagePath = `/products/${file.filename}`;
                // Map by index for easier access
                uploadedImages[index.toString()] = imagePath;
                uploadedFiles.push(path_1.default.join("public", imagePath));
            });
        }
        // Normalize and parse products data
        const normalizedProducts = productsData.map((item, index) => {
            // Get uploaded image by index
            const uploadedImagePath = uploadedImages[index.toString()];
            // Handle categoryIds conversion
            let categoryIds;
            if (typeof item.categoryIds === "string") {
                // If it's a string, try to parse as JSON array or split by comma
                try {
                    categoryIds = JSON.parse(item.categoryIds);
                }
                catch (_a) {
                    // If JSON parse fails, try splitting by comma
                    categoryIds = item.categoryIds
                        .split(",")
                        .map((id) => parseInt(id.trim(), 10));
                }
            }
            else if (Array.isArray(item.categoryIds)) {
                // If it's already an array of strings, convert to numbers
                categoryIds = item.categoryIds.map((id) => parseInt(id, 10));
            }
            else {
                throw new Error(`Invalid categoryIds format for product at index ${index}`);
            }
            // Validate that all category IDs are valid numbers
            if (categoryIds.some((id) => isNaN(id))) {
                throw new Error(`Invalid category ID(s) for product at index ${index}`);
            }
            return {
                image: uploadedImagePath || item.image, // Use uploaded image or provided URL
                genericId: parseInt(item.genericId, 10),
                brandId: parseInt(item.brandId, 10),
                categoryIds: categoryIds,
                companyId: parseInt(item.companyId, 10),
                safetyStock: parseInt(item.safetyStock, 10),
                averageCostPrice: parseFloat(item.averageCostPrice),
                averageRetailPrice: parseFloat(item.averageRetailPrice),
                lastUpdateReason: item.lastUpdateReason,
                createdById,
            };
        });
        // Create products using bulk creation
        const createdProducts = yield (0, create_service_1.create_products_bulk)(normalizedProducts);
        yield prisma.activityLog.create({
            data: {
                userId: req.user.id,
                model: "Product",
                recordId: createdProducts.length === 1 ? createdProducts[0].id : null,
                action: client_1.ActionType.CREATE,
                description: `Created product id #${createdProducts
                    .map((p) => p.id)
                    .join(", ")}`,
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"] || null,
            },
        });
        return (0, SuccessHandler_1.successHandler)(createdProducts, res, "POST", `Successfully created ${createdProducts.length} product(s)`);
    }
    catch (error) {
        // If there was an error and we uploaded files, clean them up
        if (uploadedFiles.length > 0) {
            (0, uploadMiddleware_1.deleteUploadedFiles)(uploadedFiles);
        }
        throw error;
    }
}));
// READ Products (with pagination, filtering and summary)
exports.read = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { page = 1, limit = 1000, search, categoryId, brandId, companyId, genericId, isActive, sortBy, sortOrder, } = req.query;
    // List of fields we allow clients to sort by:
    const validSortFields = [
        "id",
        "createdAt",
        "updatedAt",
        "averageCostPrice",
        "averageRetailPrice",
        "safetyStock",
    ];
    // 1) If the user supplied sortBy, make sure it's valid...
    if (sortBy) {
        if (!validSortFields.includes(sortBy)) {
            throw new Error("Invalid sortBy field. Please choose one of: " +
                validSortFields.join(", "));
        }
        // 2) ...and that they also gave us an order
        if (!sortOrder ||
            !["asc", "desc"].includes(sortOrder.toLowerCase())) {
            throw new Error("When specifying sortBy, you must also specify sortOrder as 'asc' or 'desc'.");
        }
    }
    const filters = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        search: search || undefined,
        // Handle multiple categoryIds if provided as comma-separated string
        categoryId: categoryId
            ? typeof categoryId === "string" && categoryId.includes(",")
                ? categoryId.split(",").map((id) => parseInt(id.trim(), 10))
                : parseInt(categoryId, 10)
            : undefined,
        brandId: brandId ? parseInt(brandId, 10) : undefined,
        companyId: companyId ? parseInt(companyId, 10) : undefined,
        genericId: genericId ? parseInt(genericId, 10) : undefined,
        isActive: isActive !== undefined ? isActive === "true" : undefined,
        // **Only use the client's sort params if present**; else default to newest created
        sortBy: sortBy || "id",
        sortOrder: sortOrder || "desc",
    };
    const result = yield (0, read_service_1.products)(filters);
    (0, SuccessHandler_1.successHandler)(result, res, "GET", "Products fetched successfully");
}));
exports.readProductTransactionSummary = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id: idParam } = req.params;
    const productId = parseInt(idParam, 10);
    if (!productId || isNaN(productId)) {
        throw new Error("Valid product ID is required");
    }
    // Fetch all transactions for this product
    const transactions = yield prisma.productTransaction.findMany({
        where: { productId },
        include: {
            user: { select: { id: true, fullname: true } },
        },
        orderBy: { transactionDate: "asc" },
    });
    // Prepare summary
    let totalIn = 0;
    let totalOut = 0;
    const typeSummary = {};
    transactions.forEach((tx, idx) => {
        if (tx.quantityIn)
            totalIn += tx.quantityIn;
        if (tx.quantityOut)
            totalOut += tx.quantityOut;
        if (!typeSummary[tx.transactionType]) {
            typeSummary[tx.transactionType] = {
                count: 0,
                quantityIn: 0,
                quantityOut: 0,
            };
        }
        typeSummary[tx.transactionType].count++;
        if (tx.quantityIn)
            typeSummary[tx.transactionType].quantityIn += tx.quantityIn;
        if (tx.quantityOut)
            typeSummary[tx.transactionType].quantityOut += tx.quantityOut;
    });
    const summary = {
        productId,
        totalTransactions: transactions.length,
        totalIn,
        totalOut,
    };
    (0, SuccessHandler_1.successHandler)(summary, res, "GET", "Product Transaction Summary fetched successfully");
}));
// READ Single Product by ID with comprehensive information
exports.readById = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id: idParam } = req.params;
    const { page = "1", limit = "10", dateFrom, dateTo } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const product = yield (0, read_by_id_service_1.readByid)(parseInt(idParam), pageNumber, limitNumber, dateFrom, dateTo);
    (0, SuccessHandler_1.successHandler)(product, res, "GET", "Product with comprehensive information fetched successfully");
}));
//Getting Info for products to be updated
exports.readProductToUpdate = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id: idParam } = req.params;
    const id = parseInt(idParam, 10);
    const data = yield prisma.product.findUnique({
        where: { id, isActive: true },
        include: { generic: true, brand: true, categories: true },
    });
    (0, SuccessHandler_1.successHandler)(data, res, "GET", "Product fetched successfully");
}));
// UPDATE Product
exports.update = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    // Validate authentication
    if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
        throw new Error("User authentication required");
    }
    const uploadedFiles = [];
    try {
        // Handle uploaded image if present
        let imagePath;
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            const file = req.files[0];
            imagePath = `/products/${file.filename}`;
            uploadedFiles.push(path_1.default.join("public", imagePath));
        }
        // Normalize and parse categoryIds input (allow JSON array string)
        let parsedCategoryIds;
        if (req.body.categoryIds) {
            if (Array.isArray(req.body.categoryIds)) {
                parsedCategoryIds = req.body.categoryIds.map((cid) => parseInt(cid, 10));
            }
            else if (typeof req.body.categoryIds === "string") {
                try {
                    const temp = JSON.parse(req.body.categoryIds);
                    if (Array.isArray(temp)) {
                        parsedCategoryIds = temp.map((cid) => parseInt(cid, 10));
                    }
                }
                catch (err) {
                    throw new Error("Invalid categoryIds format. Expecting JSON array string or array of IDs.");
                }
            }
            else {
                // Single value
                parsedCategoryIds = [parseInt(req.body.categoryIds, 10)];
            }
        }
        // Build update data
        const updateData = {
            image: imagePath || req.body.image,
            genericId: req.body.genericId
                ? parseInt(req.body.genericId, 10)
                : undefined,
            brandId: req.body.brandId ? parseInt(req.body.brandId, 10) : undefined,
            categoryIds: parsedCategoryIds,
            companyId: req.body.companyId
                ? parseInt(req.body.companyId, 10)
                : undefined,
            averageCostPrice: req.body.averageCostPrice !== undefined
                ? parseFloat(req.body.averageCostPrice)
                : undefined,
            averageRetailPrice: req.body.averageRetailPrice !== undefined
                ? parseFloat(req.body.averageRetailPrice)
                : undefined,
            lastUpdateReason: req.body.lastUpdateReason,
            updatedById: req.user.id,
        };
        // Proceed with update
        const updatedProduct = yield (0, update_service_1.update_products)(parseInt(id, 10), updateData);
        yield prisma.activityLog.create({
            data: {
                userId: req.user.id,
                model: "Product",
                recordId: updatedProduct.id,
                action: client_1.ActionType.UPDATE,
                description: `Updated product ID ${updatedProduct.id}, Reason: ${updatedProduct === null || updatedProduct === void 0 ? void 0 : updatedProduct.lastUpdateReason}`,
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"] || null,
            },
        });
        (0, SuccessHandler_1.successHandler)(updatedProduct, res, "PUT", "Product updated successfully");
        //TODO: Provide all required fields for ProductTransaction
        // await prisma.productTransaction.create({
        //   data: {},
        // });
    }
    catch (error) {
        // Clean up uploaded files if there was an error
        if (uploadedFiles.length > 0) {
            (0, uploadMiddleware_1.deleteUploadedFiles)(uploadedFiles);
        }
        throw error;
    }
}));
// // DELETE Product (Soft delete - set isActive to false)
// export const remove = expressAsyncHandler(
//   async (req: AuthRequest, res: Response) => {
//     const { id } = req.params;
//     const { reason } = req.body;
//     if (!req.user?.id) {
//       throw new Error("User authentication required");
//     }
//     const deletedProduct = await delete_products(
//       parseInt(id),
//       reason,
//       req.user.id
//     );
//     successHandler(
//       deletedProduct,
//       res,
//       "DELETE",
//       "Product deactivated successfully"
//     );
//   }
// );
// // RESTORE Product (Reactivate soft-deleted product)
// export const restore = expressAsyncHandler(
//   async (req: AuthRequest, res: Response) => {
//     const { id } = req.params;
//     const { reason } = req.body;
//     if (!req.user?.id) {
//       throw new Error("User authentication required");
//     }
//     const restoredProduct = await restore_products(
//       parseInt(id),
//       reason,
//       req.user.id
//     );
//     successHandler(
//       restoredProduct,
//       res,
//       "PUT",
//       "Product restored successfully"
//     );
//   }
// );
