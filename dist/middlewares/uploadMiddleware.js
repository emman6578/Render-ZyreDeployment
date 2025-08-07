"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProductImage = exports.deleteUploadedFiles = exports.deleteUploadedFile = exports.uploadProductImages = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Ensure the upload directory exists
const uploadDir = "public/products";
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Configure multer storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp-originalname
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const extension = path_1.default.extname(file.originalname);
        const baseName = path_1.default.basename(file.originalname, extension);
        cb(null, `${baseName}-${uniqueSuffix}${extension}`);
    },
});
// File filter to accept only images
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    }
    else {
        cb(new Error("Only image files (jpeg, jpg, png, gif, webp) are allowed!"));
    }
};
// FIXED: Simplified multer configuration
exports.uploadProductImages = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 5MB limit per file
        files: 50, // Maximum 50 files at once
    },
    fileFilter: fileFilter,
});
// Helper functions remain the same
const deleteUploadedFile = (filePath) => {
    if (fs_1.default.existsSync(filePath)) {
        fs_1.default.unlinkSync(filePath);
        console.log(`Deleted file: ${filePath}`);
    }
};
exports.deleteUploadedFile = deleteUploadedFile;
const deleteUploadedFiles = (filePaths) => {
    filePaths.forEach((filePath) => {
        (0, exports.deleteUploadedFile)(filePath);
    });
};
exports.deleteUploadedFiles = deleteUploadedFiles;
const deleteProductImage = (imagePath) => {
    if (imagePath && imagePath.startsWith("/products/")) {
        const fullPath = path_1.default.join("public", imagePath);
        if (fs_1.default.existsSync(fullPath)) {
            fs_1.default.unlinkSync(fullPath);
            console.log(`Deleted image: ${fullPath}`);
        }
    }
};
exports.deleteProductImage = deleteProductImage;
