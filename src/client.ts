import yargs from "yargs";
import Client, {
  CommitmentLevel,
  SubscribeRequest,
  SubscribeRequestFilterAccountsFilter,
} from "@triton-one/yellowstone-grpc";
import fetch from "node-fetch";
import { RaydiumDEX } from "./markets/raydium";

// A simple cache object to store prices; in a more complex application, consider using a more robust caching solution
let priceCache = {};

async function fetchPrice(tokenId) {
  const apiUrl = `https://price.jup.ag/v4/price?ids=${tokenId}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    if (data && data.data && data.data[tokenId] && data.data[tokenId].price) {
      // Cache the price
      priceCache[tokenId] = data.data[tokenId].price;
      return data.data[tokenId].price;
    } else {
      // No price found
      return null;
    }
  } catch (error) {
    console.error('Error fetching price:', error);
    return null;
  }
}
// @ts-ignore
const raydium = new RaydiumDEX();
  //  new RaydiumClmmDEX(),
async function main() {
  const args = parseCommandLineArgs();

  // Open connection.
  const client = new Client(args.endpoint, args.xToken);

  const commitment = parseCommitmentLevel(args.commitment);

  // Execute a requested command
  switch (args["_"][0]) {
    case "ping":
      console.log("response: " + (await client.ping(1)));
      break;

    case "get-version":
      console.log("response: " + (await client.getVersion()));
      break;

    case "get-slot":
      console.log("response: " + (await client.getSlot(commitment)));
      break;

    case "get-block-height":
      console.log("response: " + (await client.getBlockHeight(commitment)));
      break;

    case "get-latest-blockhash":
      console.log("response: ", await client.getLatestBlockhash(commitment));
      break;

    case "is-blockhash-valid":
      console.log("response: ", await client.isBlockhashValid(args.blockhash));
      break;

    case "subscribe":
      await subscribeCommand(client, args);
      break;

    default:
      console.error(
        `Unknown command: ${args["_"]}. Use "--help" for a list of supported commands.`
      );
      break;
  }
}

function parseCommitmentLevel(commitment: string | undefined) {
  if (!commitment) {
    commitment = "confirmed";
  }
  const typedCommitment =
    commitment.toUpperCase() as keyof typeof CommitmentLevel;
  return CommitmentLevel[typedCommitment];
}

async function subscribeCommand(client, args) {
  // Subscribe for events
  const stream = await client.subscribe();

  // Create `error` / `end` handler
  const streamClosed = new Promise<void>((resolve, reject) => {
    stream.on("error", (error) => {
      reject(error);
      stream.end();
    });
    stream.on("end", () => {
      resolve();
    });
    stream.on("close", () => {
      resolve();
    });
  });
const goodCache: any = {};
const fs = require('fs')
/**
 * Attempts to infer the price of an unknown token given pre and post transaction balances
 * for a transaction involving one known and one unknown token.
 */
function inferUnknownTokenPrice(preBalances: any[], postBalances: any[]): void {
  for (const p of preBalances){
    fetchPrice(p.mint)
  }
  // Identify the known and unknown tokens from the pre-transaction balances
  const knownTokenPre = preBalances.find(balance => balance.mint in priceCache);
  const unknownTokenPre = preBalances.find(balance => !(balance.mint in priceCache));


  if (!knownTokenPre || !unknownTokenPre) {
    return;
  }

  // Find their corresponding post-transaction balances
  const knownTokenPost = postBalances.find(balance => balance.mint === knownTokenPre.mint);
  const unknownTokenPost = postBalances.find(balance => balance.mint === unknownTokenPre.mint);

  if (!knownTokenPost || !unknownTokenPost) {
    return;
  }

  // Calculate the change in amounts for both tokens
  const knownAmountChange = Math.abs(knownTokenPost.uiTokenAmount.uiAmount - knownTokenPre.uiTokenAmount.uiAmount);
  const unknownAmountChange = Math.abs(unknownTokenPost.uiTokenAmount.uiAmount - unknownTokenPre.uiTokenAmount.uiAmount);

  // Ensure there's a meaningful change to calculate from
  if (knownAmountChange === 0 || unknownAmountChange === 0) {
    return;
  }

  // Use the known token's price and the ratio of amount changes to infer the unknown token's price
  const knownTokenPrice = priceCache[knownTokenPre.mint];
  const inferredUnknownPrice = (knownTokenPrice * knownAmountChange) / unknownAmountChange;
  if (!Object.keys(priceCache).includes(unknownTokenPre.mint)){
  console.log(`Inferred price for ${unknownTokenPre.mint}: $${inferredUnknownPrice.toFixed(6)} (based on ${knownTokenPre.mint})`);
  console.log('Inferred volume in $USD for', unknownTokenPre.mint, 'is', (inferredUnknownPrice * unknownAmountChange).toFixed(6))
  // save an object for the inferred volume in $USD, along with cumulative volume for the last 1hr, as well as a timestamp
  // discount any trade earlier than 1hr
  // save the object to a file
  if (!Object.keys(goodCache).includes(unknownTokenPre.mint)){
goodCache[unknownTokenPre.mint] = [{
  volume: Number((inferredUnknownPrice * unknownAmountChange).toFixed(6)),
  price: inferredUnknownPrice,
  cumulativeVolume: 0,
  timestamp: Date.now()
}]
  } else {
    goodCache[unknownTokenPre.mint].push(
      {
        price: inferredUnknownPrice,
        volume: Number((inferredUnknownPrice * unknownAmountChange).toFixed(6)),
        cumulativeVolume: Number((inferredUnknownPrice * unknownAmountChange).toFixed(6)) + goodCache[unknownTokenPre.mint][goodCache[unknownTokenPre.mint].length-1].cumulativeVolume,
        timestamp: Date.now()
      }
    )
  }
  const tCache: any = {}
  for (const c of Object.keys(goodCache)){
    const cached = goodCache[c]
    for (const item of cached){
      if (item.timestamp < Date.now() - 3600000){
        cached.shift()
      }
    }
    tCache[c] = cached
  }
  const data = JSON.stringify(tCache);
  // 1-1000 random chance 
  if (Math.floor(Math.random() * 1000) === 1){
  fs.writeFileSync('/root/fc-polls/public/goodCache.json', data);
  }


  
  }
  else {}
}
  // Handle updates
  stream.on("data", async(data) => {
    if (data.transaction != undefined){
    const preTokenBalances = data.transaction.transaction.meta.preTokenBalances
    const postTokenBalances = data.transaction.transaction.meta.postTokenBalances
    inferUnknownTokenPrice(preTokenBalances, postTokenBalances)


  }
  });

  // Create subscribe request based on provided arguments.
  const request: SubscribeRequest = {
    accounts: {},
    slots: {},
    transactions: {},
    entry: {},
    blocks: {},
    blocksMeta: {},
    accountsDataSlice: [],
    ping: undefined,
  };
  if (args.accounts) {
    const filters: SubscribeRequestFilterAccountsFilter[] = [];

    if (args.accounts.memcmp) {
      for (let filter in args.accounts.memcmp) {
        const filterSpec = filter.split(",", 1);
        if (filterSpec.length != 2) {
          throw new Error("invalid memcmp");
        }

        const [offset, data] = filterSpec;
        filters.push({
          memcmp: { offset, base58: data.trim() },
        });
      }
    }

    if (args.accounts.tokenaccountstate) {
      filters.push({
        tokenAccountState: args.accounts.tokenaccountstate,
      });
    }

    if (args.accounts.datasize) {
      filters.push({ datasize: args.accounts.datasize });
    }

    request.accounts.client = {
      account: args.accountsAccount,
      owner: args.accountsOwner,
      filters,
    };
  }

  if (args.slots) {
    request.slots.client = {
      filterByCommitment: args.slotsFilterByCommitment,
    };
  }

  if (args.transactions) {
    request.transactions.client = {
      vote: args.transactionsVote,
      failed: args.transactionsFailed,
      signature: args.transactionsSignature,
      accountInclude: args.transactionsAccountInclude,
      accountExclude: args.transactionsAccountExclude,
      accountRequired: args.transactionsAccountRequired,
    };
  }

  if (args.entry) {
    request.entry.client = {};
  }

  if (args.blocks) {
    request.blocks.client = {
      accountInclude: args.blocksAccountInclude,
      includeTransactions: args.blocksIncludeTransactions,
      includeAccounts: args.blocksIncludeAccounts,
      includeEntries: args.blocksIncludeEntries,
    };
  }

  if (args.blocksMeta) {
    request.blocksMeta.client = {
      account_include: args.blocksAccountInclude,
    };
  }

  if (args.accounts.dataslice) {
    for (let filter in args.accounts.dataslice) {
      const filterSpec = filter.split(",", 1);
      if (filterSpec.length != 2) {
        throw new Error("invalid data slice");
      }

      const [offset, length] = filterSpec;
      request.accountsDataSlice.push({
        offset,
        length,
      });
    }
  }

  if (args.ping) {
    request.ping = { id: args.ping };
  }

  // Send subscribe request
  await new Promise<void>((resolve, reject) => {
    stream.write(request, (err) => {
      if (err === null || err === undefined) {
        resolve();
      } else {
        reject(err);
      }
    });
  }).catch((reason) => {
    console.error(reason);
    throw reason;
  });

  await streamClosed;
}

function parseCommandLineArgs() {
  return yargs(process.argv.slice(2))
    .options({
      endpoint: {
        alias: "e",
        default: "http://localhost:10000",
        describe: "gRPC endpoint",
        type: "string",
      },
      "x-token": {
        describe: "token for auth, can be used only with ssl",
        type: "string",
      },
      commitment: {
        describe: "commitment level",
        choices: ["processed", "confirmed", "finalized"],
      },
    })
    .command("ping", "single ping of the RPC server")
    .command("get-version", "get the server version")
    .command("get-latest-blockhash", "get the latest block hash")
    .command("get-block-height", "get the current block height")
    .command("get-slot", "get the current slot")
    .command(
      "is-blockhash-valid",
      "check the validity of a given block hash",
      (yargs) => {
        return yargs.options({
          blockhash: {
            type: "string",
            demandOption: true,
          },
        });
      }
    )
    .command("subscribe", "subscribe to events", (yargs) => {
      return yargs.options({
        accounts: {
          default: false,
          describe: "subscribe on accounts updates",
          type: "boolean",
        },
        "accounts-account": {
          default: [],
          describe: "filter by account pubkey",
          type: "array",
        },
        "accounts-owner": {
          default: [],
          describe: "filter by owner pubkey",
          type: "array",
        },
        "accounts-memcmp": {
          default: [],
          describe:
            "filter by offset and data, format: `offset,data in base58`",
          type: "array",
        },
        "accounts-datasize": {
          default: 0,
          describe: "filter by data size",
          type: "number",
        },
        "accounts-tokenaccountstate": {
          default: false,
          describe: "filter valid token accounts",
          type: "boolean",
        },
        "accounts-dataslice": {
          default: [],
          describe:
            "receive only part of updated data account, format: `offset,size`",
          type: "string",
        },
        slots: {
          default: false,
          describe: "subscribe on slots updates",
          type: "boolean",
        },
        "slots-filter-by-commitment": {
          default: false,
          describe: "filter slot messages by commitment",
          type: "boolean",
        },
        transactions: {
          default: false,
          describe: "subscribe on transactions updates",
          type: "boolean",
        },
        "transactions-vote": {
          description: "filter vote transactions",
          type: "boolean",
        },
        "transactions-failed": {
          description: "filter failed transactions",
          type: "boolean",
        },
        "transactions-signature": {
          description: "filter by transaction signature",
          type: "string",
        },
        "transactions-account-include": {
          default: [],
          description: "filter included account in transactions",
          type: "array",
        },
        "transactions-account-exclude": {
          default: [],
          description: "filter excluded account in transactions",
          type: "array",
        },
        "transactions-account-required": {
          default: [],
          description: "filter required account in transactions",
          type: "array",
        },
        entry: {
          default: false,
          description: "subscribe on entry updates",
          type: "boolean",
        },
        blocks: {
          default: false,
          description: "subscribe on block updates",
          type: "boolean",
        },
        "blocks-account-include": {
          default: [],
          description: "filter included account in transactions",
          type: "array",
        },
        "blocks-include-transactions": {
          default: false,
          description: "include transactions to block messsage",
          type: "boolean",
        },
        "blocks-include-accounts": {
          default: false,
          description: "include accounts to block message",
          type: "boolean",
        },
        "blocks-include-entries": {
          default: false,
          description: "include entries to block message",
          type: "boolean",
        },
        "blocks-meta": {
          default: false,
          description: "subscribe on block meta updates (without transactions)",
          type: "boolean",
        },
        ping: {
          default: undefined,
          description: "send ping request in subscribe",
          type: "number"
        }
      });
    })
    .demandCommand(1)
    .help().argv;
}

main();
