"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionSenderAndConfirmationWaiter = exports.getSignature = void 0;
const tslib_1 = require("tslib");
const bs58_1 = tslib_1.__importDefault(require("bs58"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const node_fetch_1 = tslib_1.__importDefault(require("node-fetch"));
const promise_retry_1 = tslib_1.__importDefault(require("promise-retry"));
const yargs_1 = tslib_1.__importDefault(require("yargs"));
const api_1 = require("@jup-ag/api");
const spl_token_1 = require("@solana/spl-token");
const web3_js_1 = require("@solana/web3.js");
const yellowstone_grpc_1 = tslib_1.__importStar(require("@triton-one/yellowstone-grpc"));
const raydium_1 = require("./markets/raydium");
function getSignature(transaction) {
    const signature = "signature" in transaction
        ? transaction.signature
        : transaction.signatures[0];
    if (!signature) {
        throw new Error("Missing transaction signature, the transaction was not signed by the fee payer");
    }
    return bs58_1.default.encode(signature);
}
exports.getSignature = getSignature;
const SEND_OPTIONS = {
    skipPreflight: true,
};
async function transactionSenderAndConfirmationWaiter({ connection, serializedTransaction, blockhashWithExpiryBlockHeight, }) {
    const txid = await connection.sendRawTransaction(serializedTransaction, SEND_OPTIONS);
    const controller = new AbortController();
    const abortSignal = controller.signal;
    const abortableResender = async () => {
        while (true) {
            await wait(2000);
            if (abortSignal.aborted)
                return;
            try {
                await connection.sendRawTransaction(serializedTransaction, SEND_OPTIONS);
            }
            catch (e) {
                console.warn(`Failed to resend transaction: ${e}`);
            }
        }
    };
    try {
        abortableResender();
        const lastValidBlockHeight = blockhashWithExpiryBlockHeight.lastValidBlockHeight - 150;
        // this would throw TransactionExpiredBlockheightExceededError
        await Promise.race([
            connection.confirmTransaction({
                ...blockhashWithExpiryBlockHeight,
                lastValidBlockHeight,
                signature: txid,
                abortSignal,
            }, "confirmed"),
            new Promise(async (resolve) => {
                // in case ws socket died
                while (!abortSignal.aborted) {
                    await wait(2000);
                    const tx = await connection.getSignatureStatus(txid, {
                        searchTransactionHistory: false,
                    });
                    if (tx?.value?.confirmationStatus === "confirmed") {
                        resolve(tx);
                    }
                }
            }),
        ]);
    }
    catch (e) {
        if (e instanceof web3_js_1.TransactionExpiredBlockheightExceededError) {
            // we consume this error and getTransaction would return null
            return null;
        }
        else {
            // invalid state from web3.js
            throw e;
        }
    }
    finally {
        controller.abort();
    }
    // in case rpc is not synced yet, we add some retries
    const response = (0, promise_retry_1.default)(async (retry) => {
        const response = await connection.getTransaction(txid, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
        });
        if (!response) {
            retry(response);
        }
        return response;
    }, {
        retries: 5,
        minTimeout: 1e3,
    });
    return response;
}
exports.transactionSenderAndConfirmationWaiter = transactionSenderAndConfirmationWaiter;
const wait = (time) => new Promise((resolve) => setTimeout(resolve, time));
const jupiterQuoteApi = (0, api_1.createJupiterApiClient)(); // config is optional
const payer = web3_js_1.Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs_1.default.readFileSync("/Users/jd/7i.json").toString())));
const connection = new web3_js_1.Connection("https://jarrett-solana-7ba9.mainnet.rpcpool.com/8d890735-edf2-4a75-af84-92f7c9e31718", 'confirmed');
// A simple cache object to store prices; in a more complex application, consider using a more robust caching solution
let priceCache = {};
async function fetchPrice(tokenId) {
    const apiUrl = `https://price.jup.ag/v4/price?ids=${tokenId}`;
    try {
        const response = await (0, node_fetch_1.default)(apiUrl);
        const data = await response.json();
        if (data && data.data && data.data[tokenId] && data.data[tokenId].price) {
            // Cache the price
            priceCache[tokenId] = data.data[tokenId].price;
            return data.data[tokenId].price;
        }
        else {
            // No price found
            return null;
        }
    }
    catch (error) {
        console.error('Error fetching price:', error);
        return null;
    }
}
// @ts-ignore
const raydium = new raydium_1.RaydiumDEX();
//  new RaydiumClmmDEX(),
async function main() {
    const args = parseCommandLineArgs();
    // Open connection.
    const client = new yellowstone_grpc_1.default(args.endpoint, args.xToken);
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
            console.error(`Unknown command: ${args["_"]}. Use "--help" for a list of supported commands.`);
            break;
    }
}
function parseCommitmentLevel(commitment) {
    if (!commitment) {
        commitment = "confirmed";
    }
    const typedCommitment = commitment.toUpperCase();
    return yellowstone_grpc_1.CommitmentLevel[typedCommitment];
}
async function subscribeCommand(client, args) {
    // Subscribe for events
    const stream = await client.subscribe();
    // Create `error` / `end` handler
    const streamClosed = new Promise((resolve, reject) => {
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
    const goodCache = {};
    const fs = require('fs');
    /**
     * Attempts to infer the price of an unknown token given pre and post transaction balances
     * for a transaction involving one known and one unknown token.
     */
    async function inferUnknownTokenPrice(preBalances, postBalances) {
        try {
            for (const p of preBalances) {
                if (!Object.keys(priceCache).includes(p.mint)) {
                    await fetchPrice(p.mint);
                }
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
            const buyOrSell = unknownTokenPost.uiTokenAmount.uiAmount - unknownTokenPre.uiTokenAmount.uiAmount > 0 ? 'buy' : 'sell';
            // Ensure there's a meaningful change to calculate from
            if (knownAmountChange === 0 || unknownAmountChange === 0) {
                return;
            }
            // Use the known token's price and the ratio of amount changes to infer the unknown token's price
            const knownTokenPrice = priceCache[knownTokenPre.mint];
            const inferredUnknownPrice = (knownTokenPrice * knownAmountChange) / unknownAmountChange;
            if (!Object.keys(priceCache).includes(unknownTokenPre.mint)) {
                console.log(`Inferred price for ${unknownTokenPre.mint}: $${inferredUnknownPrice.toFixed(6)} (based on ${knownTokenPre.mint})`);
                console.log('Inferred volume in $USD for', unknownTokenPre.mint, 'is', (inferredUnknownPrice * unknownAmountChange).toFixed(6));
                const plainOldTokens = await connection.getParsedTokenAccountsByOwner(payer.publicKey, { programId: spl_token_1.TOKEN_PROGRAM_ID });
                const t22Tokens = await connection.getParsedTokenAccountsByOwner(payer.publicKey, { programId: new web3_js_1.PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb") });
                const tokens = plainOldTokens.value.concat(t22Tokens.value);
                const token = tokens.find(t => t.account.data.parsed.info.mint === unknownTokenPre.mint);
                console.log(buyOrSell);
                if (buyOrSell === 'buy') {
                    const usdc = tokens.find(t => t.account.data.parsed.info.mint === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
                    const usdcBalance = Math.floor(Number(usdc.account.data.parsed.info.tokenAmount.amount) / 1000);
                    const quote = await jupiterQuoteApi.quoteGet({
                        inputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                        outputMint: unknownTokenPre.mint,
                        amount: usdcBalance,
                        maxAccounts: 52,
                        slippageBps: 1000
                    });
                    console.log(quote);
                    // Get serialized transaction
                    const swapResult = await jupiterQuoteApi.swapPost({
                        swapRequest: {
                            quoteResponse: quote,
                            userPublicKey: payer.publicKey.toBase58(),
                            dynamicComputeUnitLimit: true,
                            prioritizationFeeLamports: "auto",
                            // prioritizationFeeLamports: {
                            //   autoMultiplier: 2,
                            // },
                        },
                    });
                    console.dir(swapResult, { depth: null });
                    // Serialize the transaction
                    const swapTransactionBuf = Buffer.from(swapResult.swapTransaction, "base64");
                    var transaction = web3_js_1.VersionedTransaction.deserialize(swapTransactionBuf);
                    // Sign the transaction
                    transaction.sign([payer]);
                    const signature = getSignature(transaction);
                    console.log("Signature:", signature);
                    // We first simulate whether the transaction would be successful
                    const { value: simulatedTransactionResponse } = await connection.simulateTransaction(transaction, {
                        replaceRecentBlockhash: true,
                        commitment: "processed",
                    });
                    const { err, logs } = simulatedTransactionResponse;
                    if (err) {
                        // Simulation error, we can check the logs for more details
                        // If you are getting an invalid account error, make sure that you have the input mint account to actually swap from.
                        console.error("Simulation Error:");
                        console.error({ err, logs });
                        return;
                    }
                    const serializedTransaction = Buffer.from(transaction.serialize());
                    const blockhash = transaction.message.recentBlockhash;
                    const transactionResponse = await transactionSenderAndConfirmationWaiter({
                        connection,
                        serializedTransaction,
                        blockhashWithExpiryBlockHeight: {
                            blockhash,
                            lastValidBlockHeight: swapResult.lastValidBlockHeight,
                        },
                    });
                    console.log("Transaction Response:", transactionResponse);
                }
                else if (buyOrSell === 'sell' && token !== undefined) {
                    const tokenBalance = (Number(token.account.data.parsed.info.tokenAmount.amount) / 100);
                    const quote = await jupiterQuoteApi.quoteGet({
                        inputMint: unknownTokenPre.mint,
                        outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                        amount: tokenBalance,
                        maxAccounts: 52,
                        slippageBps: 1000
                    });
                    console.log(quote);
                    // Get serialized transaction
                    const swapResult = await jupiterQuoteApi.swapPost({
                        swapRequest: {
                            quoteResponse: quote,
                            userPublicKey: payer.publicKey.toBase58(),
                            dynamicComputeUnitLimit: true,
                            prioritizationFeeLamports: "auto",
                            // prioritizationFeeLamports: {
                            //   autoMultiplier: 2,
                            // },
                        },
                    });
                    console.dir(swapResult, { depth: null });
                    // Serialize the transaction
                    const swapTransactionBuf = Buffer.from(swapResult.swapTransaction, "base64");
                    var transaction = web3_js_1.VersionedTransaction.deserialize(swapTransactionBuf);
                    // Sign the transaction
                    transaction.sign([payer]);
                    const signature = getSignature(transaction);
                    console.log("Signature:", signature);
                    // We first simulate whether the transaction would be successful
                    const { value: simulatedTransactionResponse } = await connection.simulateTransaction(transaction, {
                        replaceRecentBlockhash: true,
                        commitment: "processed",
                    });
                    const { err, logs } = simulatedTransactionResponse;
                    if (err) {
                        // Simulation error, we can check the logs for more details
                        // If you are getting an invalid account error, make sure that you have the input mint account to actually swap from.
                        console.error("Simulation Error:");
                        console.error({ err, logs });
                        return;
                    }
                    const serializedTransaction = Buffer.from(transaction.serialize());
                    const blockhash = transaction.message.recentBlockhash;
                    const transactionResponse = await transactionSenderAndConfirmationWaiter({
                        connection,
                        serializedTransaction,
                        blockhashWithExpiryBlockHeight: {
                            blockhash,
                            lastValidBlockHeight: swapResult.lastValidBlockHeight,
                        },
                    });
                    console.log("Transaction Response:", transactionResponse);
                }
                // save an object for the inferred volume in $USD, along with cumulative volume for the last 1hr, as well as a timestamp
                // discount any trade earlier than 1hr
                // save the object to a file
                if (!Object.keys(goodCache).includes(unknownTokenPre.mint)) {
                    goodCache[unknownTokenPre.mint] = [{
                            volume: Math.abs(Number(unknownTokenPost.uiTokenAmount.amount) - Number(unknownTokenPre.uiTokenAmount.amount)),
                            price: inferredUnknownPrice,
                            cumulativeVolume: 0,
                            timestamp: Date.now()
                        }];
                }
                else {
                    goodCache[unknownTokenPre.mint].push({
                        price: inferredUnknownPrice,
                        volume: Math.abs(Number(unknownTokenPost.uiTokenAmount.amount) - Number(unknownTokenPre.uiTokenAmount.amount)),
                        cumulativeVolume: Number((inferredUnknownPrice * unknownAmountChange).toFixed(6)) + goodCache[unknownTokenPre.mint][goodCache[unknownTokenPre.mint].length - 1].cumulativeVolume,
                        timestamp: Date.now()
                    });
                }
                const tCache = {};
                for (const c of Object.keys(goodCache)) {
                    const cached = goodCache[c];
                    for (const item of cached) {
                        if (item.timestamp < Date.now() - 3600000) {
                            cached.shift();
                        }
                    }
                    tCache[c] = cached;
                }
                const data = JSON.stringify(tCache);
                // 1-1000 random chance 
                fs.writeFileSync('./goodCache.json', data);
            }
            else { }
        }
        catch (err) {
            console.error(err);
        }
    }
    // Handle updates
    stream.on("data", async (data) => {
        if (data.transaction != undefined) {
            const preTokenBalances = data.transaction.transaction.meta.preTokenBalances;
            const postTokenBalances = data.transaction.transaction.meta.postTokenBalances;
            await inferUnknownTokenPrice(preTokenBalances, postTokenBalances);
        }
    });
    // Create subscribe request based on provided arguments.
    const request = {
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
        const filters = [];
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
    await new Promise((resolve, reject) => {
        stream.write(request, (err) => {
            if (err === null || err === undefined) {
                resolve();
            }
            else {
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
    return (0, yargs_1.default)(process.argv.slice(2))
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
        .command("is-blockhash-valid", "check the validity of a given block hash", (yargs) => {
        return yargs.options({
            blockhash: {
                type: "string",
                demandOption: true,
            },
        });
    })
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
                describe: "filter by offset and data, format: `offset,data in base58`",
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
                describe: "receive only part of updated data account, format: `offset,size`",
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
                default: JSON.parse(fs_1.default.readFileSync('10s.txt').toString()),
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
//# sourceMappingURL=client.js.map