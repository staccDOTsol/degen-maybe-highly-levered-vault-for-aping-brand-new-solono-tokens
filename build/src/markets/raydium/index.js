"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RaydiumDEX = exports.isTokenAccountOfInterest = exports.POOLS_JSON = void 0;
const tslib_1 = require("tslib");
const web3_js_1 = require("@solana/web3.js");
const types_js_1 = require("../types.js");
const utils_js_1 = require("../utils.js");
// something is wrong with the accounts of these markets
const MARKETS_TO_IGNORE = [
    '9DTY3rv8xRa3CnoPoWJCMcQUSY7kUHZAoFKNsBhx8DDz',
    '2EXiumdi14E9b8Fy62QcA5Uh6WdHS2b38wtSxp72Mibj',
    '9f4FtV6ikxUZr8fAjKSGNPPnUHJEwi4jNk8d79twbyFf',
    '5NBtQe4GPZTRiwrmkwPxNdAuiVFGjQWnihVSqML6ADKT', // pool not tradeable
];
// @ts-ignore
const fs_1 = tslib_1.__importDefault(require("fs"));
exports.POOLS_JSON = JSON.parse(fs_1.default.readFileSync('./src/markets/raydium/mainnet.json', 'utf-8'));
console.log(`Raydium: Found ${exports.POOLS_JSON.official.length} official pools and ${exports.POOLS_JSON.unOfficial.length} unofficial pools`);
const pools = [];
exports.POOLS_JSON.unOfficial.forEach((pool) => pools.push(pool));
exports.POOLS_JSON.official.forEach((pool) => pools.push(pool));
const addressesToFetch = [];
for (const pool of pools) {
    addressesToFetch.push(new web3_js_1.PublicKey(pool.id));
    addressesToFetch.push(new web3_js_1.PublicKey(pool.marketId));
}
const tokenAccountsOfInterest = new Set();
const isTokenAccountOfInterest = (tokenAccount) => {
    return tokenAccountsOfInterest.has(tokenAccount);
};
exports.isTokenAccountOfInterest = isTokenAccountOfInterest;
class RaydiumDEX extends types_js_1.DEX {
    constructor() {
        super(types_js_1.DexLabel.RAYDIUM);
        this.pools = pools.filter((pool) => !MARKETS_TO_IGNORE.includes(pool.id));
        for (const pool of this.pools) {
            const market = {
                tokenMintA: pool.baseMint,
                tokenVaultA: pool.baseVault,
                tokenMintB: pool.quoteMint,
                tokenVaultB: pool.quoteVault,
                dexLabel: this.label,
                id: pool.id,
            };
            tokenAccountsOfInterest.add(pool.baseVault);
            tokenAccountsOfInterest.add(pool.quoteVault);
            const pairString = (0, utils_js_1.toPairString)(pool.baseMint, pool.quoteMint);
            if (this.pairToMarkets.has(pairString)) {
                this.pairToMarkets.get(pairString).push(market);
            }
            else {
                this.pairToMarkets.set(pairString, [market]);
            }
        }
    }
}
exports.RaydiumDEX = RaydiumDEX;
//# sourceMappingURL=index.js.map