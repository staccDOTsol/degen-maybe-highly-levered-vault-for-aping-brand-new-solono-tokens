"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MintMarketGraph = void 0;
const utils_js_1 = require("./utils.js");
class Node {
    constructor(pubKey) {
        this.id = pubKey;
        this.neighbours = new Set();
    }
}
class MintMarketGraph {
    constructor() {
        this.nodes = new Map();
        this.edges = new Map();
    }
    addMint(pubKey) {
        const pubKeyStr = pubKey;
        if (!this.nodes.has(pubKeyStr)) {
            this.nodes.set(pubKeyStr, new Node(pubKeyStr));
        }
    }
    addMarket(mint1, mint2, market) {
        this.addMint(mint1);
        this.addMint(mint2);
        const node1 = this.nodes.get(mint1);
        const node2 = this.nodes.get(mint2);
        node1.neighbours.add(mint2);
        node2.neighbours.add(mint1);
        const edgeKey = (0, utils_js_1.toPairString)(mint1, mint2);
        if (!this.edges.has(edgeKey)) {
            this.edges.set(edgeKey, []);
        }
        this.edges.get(edgeKey).push(market);
    }
    getNeighbours(pubKey) {
        const node = this.nodes.get(pubKey);
        return node ? node.neighbours : new Set();
    }
    getMarkets(mint1, mint2) {
        const edgeKey = (0, utils_js_1.toPairString)(mint1, mint2);
        return this.edges.get(edgeKey) || [];
    }
}
exports.MintMarketGraph = MintMarketGraph;
//# sourceMappingURL=market-graph.js.map