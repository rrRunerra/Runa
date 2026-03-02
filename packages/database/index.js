"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
var adapter_pg_1 = require("@prisma/adapter-pg");
var client_1 = require("@prisma/client");
var dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: "../../.env" });
var prismaClientSingleton = function () {
    var url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error("DATABASE_URL is not defined in environment variables");
    }
    // Mask sensitive info for logging
    var maskedUrl = url.replace(/:.+@/, ":****@");
    console.log("[Database] Initializing Prisma with URL: ".concat(maskedUrl));
    var adapter = new adapter_pg_1.PrismaPg({
        connectionString: url,
    });
    return new client_1.PrismaClient({ adapter: adapter });
};
exports.prisma = (_a = globalThis.prismaGlobal) !== null && _a !== void 0 ? _a : prismaClientSingleton();
if (process.env.NODE_ENV !== "production") {
    globalThis.prismaGlobal = exports.prisma;
}
__exportStar(require("@prisma/client"), exports);
