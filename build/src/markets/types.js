"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwapMode = exports.DEX = exports.DexLabel = void 0;
const utils_js_1 = require("./utils.js");
var DexLabel;
(function (DexLabel) {
    DexLabel["ORCA"] = "Orca";
    DexLabel["ORCA_WHIRLPOOLS"] = "Orca (Whirlpools)";
    DexLabel["RAYDIUM"] = "Raydium";
    DexLabel["RAYDIUM_CLMM"] = "Raydium CLMM";
})(DexLabel = exports.DexLabel || (exports.DexLabel = {}));
class DEX {
    constructor(label) {
        this.pairToMarkets = new Map();
        this.ammCalcAddPoolMessages = [];
        this.label = label;
    }
    getAmmCalcAddPoolMessages() {
        return this.ammCalcAddPoolMessages;
    }
    getMarketsForPair(mintA, mintB) {
        const markets = this.pairToMarkets.get((0, utils_js_1.toPairString)(mintA, mintB));
        if (markets === undefined) {
            return [];
        }
        return markets;
    }
    getAllMarkets() {
        return Array.from(this.pairToMarkets.values()).flat();
    }
}
exports.DEX = DEX;
var SwapMode;
(function (SwapMode) {
    SwapMode["ExactIn"] = "ExactIn";
    SwapMode["ExactOut"] = "ExactOut";
})(SwapMode = exports.SwapMode || (exports.SwapMode = {}));
//# sourceMappingURL=types.js.map