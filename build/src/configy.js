"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TOKEN = exports.addLookupTableInfo = exports.makeTxVersion = exports.RAYDIUM_MAINNET_API = exports.ENDPOINT = exports.PROGRAMIDS = exports.connection = exports.wallet = exports.rpcToken = exports.rpcUrl = void 0;
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const raydium_sdk_1 = require("@raydium-io/raydium-sdk");
const web3_js_1 = require("@solana/web3.js");
exports.rpcUrl = "https://jarrett-solana-7ba9.mainnet.rpcpool.com/8d890735-edf2-4a75-af84-92f7c9e31718";
exports.rpcToken = undefined;
exports.wallet = web3_js_1.Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs_1.default.readFileSync("/Users/jd/photon.json").toString())));
exports.connection = new web3_js_1.Connection("https://jarrett-solana-7ba9.mainnet.rpcpool.com/8d890735-edf2-4a75-af84-92f7c9e31718");
exports.PROGRAMIDS = raydium_sdk_1.MAINNET_PROGRAM_ID;
exports.ENDPOINT = raydium_sdk_1.ENDPOINT;
exports.RAYDIUM_MAINNET_API = raydium_sdk_1.RAYDIUM_MAINNET;
exports.makeTxVersion = raydium_sdk_1.TxVersion.V0; // LEGACY
exports.addLookupTableInfo = raydium_sdk_1.LOOKUP_TABLE_CACHE; // only mainnet. other = undefined
exports.DEFAULT_TOKEN = {
    'SOL': new raydium_sdk_1.Currency(9, 'USDC', 'USDC'),
    'WSOL': new raydium_sdk_1.Token(raydium_sdk_1.TOKEN_PROGRAM_ID, new web3_js_1.PublicKey('So11111111111111111111111111111111111111112'), 9, 'WSOL', 'WSOL'),
    'USDC': new raydium_sdk_1.Token(raydium_sdk_1.TOKEN_PROGRAM_ID, new web3_js_1.PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), 6, 'USDC', 'USDC'),
    'RAY': new raydium_sdk_1.Token(raydium_sdk_1.TOKEN_PROGRAM_ID, new web3_js_1.PublicKey('4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'), 6, 'RAY', 'RAY'),
    'RAY_USDC-LP': new raydium_sdk_1.Token(raydium_sdk_1.TOKEN_PROGRAM_ID, new web3_js_1.PublicKey('FGYXP4vBkMEtKhxrmEBcWN8VNmXX8qNgEJpENKDETZ4Y'), 6, 'RAY-USDC', 'RAY-USDC'),
};
//# sourceMappingURL=configy.js.map