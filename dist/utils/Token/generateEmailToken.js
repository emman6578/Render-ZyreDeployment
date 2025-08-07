"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmailToken = generateEmailToken;
function generateEmailToken() {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
}
