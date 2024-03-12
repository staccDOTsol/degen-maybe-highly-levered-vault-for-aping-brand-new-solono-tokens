// @ts-ignore
import fs from "fs";

import { ApiPoolInfoItem } from "@raydium-io/raydium-sdk";
import { PublicKey } from "@solana/web3.js";

import {
  DEX,
  DexLabel,
  Market,
} from "../types.js";
import { toPairString } from "../utils.js";

// something is wrong with the accounts of these markets
const MARKETS_TO_IGNORE = [
  '9DTY3rv8xRa3CnoPoWJCMcQUSY7kUHZAoFKNsBhx8DDz',
  '2EXiumdi14E9b8Fy62QcA5Uh6WdHS2b38wtSxp72Mibj',
  '9f4FtV6ikxUZr8fAjKSGNPPnUHJEwi4jNk8d79twbyFf',
  '5NBtQe4GPZTRiwrmkwPxNdAuiVFGjQWnihVSqML6ADKT', // pool not tradeable
];

export const POOLS_JSON = JSON.parse(
  fs.readFileSync('./src/markets/raydium/mainnet.json', 'utf-8'),
) as { official: ApiPoolInfoItem[]; unOfficial: ApiPoolInfoItem[] };

console.log(
  `Raydium: Found ${POOLS_JSON.official.length} official pools and ${POOLS_JSON.unOfficial.length} unofficial pools`,
);

const pools: ApiPoolInfoItem[] = [];
POOLS_JSON.unOfficial.forEach((pool) => pools.push(pool));
POOLS_JSON.official.forEach((pool) => pools.push(pool));

const addressesToFetch: PublicKey[] = [];

for (const pool of pools) {
  addressesToFetch.push(new PublicKey(pool.id));
  addressesToFetch.push(new PublicKey(pool.marketId));
}
const tokenAccountsOfInterest = new Set<string>();

export const isTokenAccountOfInterest = (tokenAccount: string): boolean => {
  return tokenAccountsOfInterest.has(tokenAccount);
};
class RaydiumDEX extends DEX {
  pools: ApiPoolInfoItem[];

  constructor() {
    super(DexLabel.RAYDIUM);
    this.pools = pools.filter((pool) => !MARKETS_TO_IGNORE.includes(pool.id));

    for (const pool of this.pools) {
      const market: Market = {
        tokenMintA: pool.baseMint,
        tokenVaultA: pool.baseVault,
        tokenMintB: pool.quoteMint,
        tokenVaultB: pool.quoteVault,
        dexLabel: this.label,
        id: pool.id,
      };
      tokenAccountsOfInterest.add(pool.baseMint);
      tokenAccountsOfInterest.add(pool.quoteMint);

      const pairString = toPairString(pool.baseMint, pool.quoteMint);
      if (this.pairToMarkets.has(pairString)) {
        this.pairToMarkets.get(pairString).push(market);
      } else {
        this.pairToMarkets.set(pairString, [market]);
      }
    }
  }
}

export { RaydiumDEX };
