import bs58 from "bs58";
import fs from "fs";
import yargs from "yargs";

import {
  CurrencyAmount,
  jsonInfo2PoolKeys,
  Liquidity,
  LiquidityPoolKeys,
  Percent,
  Token,
  TokenAmount,
  TxVersion,
} from "@raydium-io/raydium-sdk";
import { NATIVE_MINT } from "@solana/spl-token";
import {
  Connection,
  Keypair,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  checkIfInstructionParser,
  ParserType,
  SolanaFMParser,
} from "@solanafm/explorer-kit";
import { getProgramIdl } from "@solanafm/explorer-kit-idls";
import Client, {
  CommitmentLevel,
  SubscribeRequest,
  SubscribeRequestFilterAccountsFilter,
} from "@triton-one/yellowstone-grpc";

import {
  DEFAULT_TOKEN,
  wallet,
} from "./configy";
import { formatAmmKeysById } from "./formatAmmKeysById.ts";
import { RaydiumDEX } from "./markets/raydium";
import {
  buildAndSendTx,
  getWalletTokenAccount,
} from "./util";

const programId = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const decodedDatas: any = []
//const markets = JSON.parse(fs.readFileSync('./src/markets/raydium/mainnet.json').toString())['unOfficial']
/**/
type WalletTokenAccounts2 = Awaited<ReturnType<typeof getWalletTokenAccount>>
type TestTxInputInfo2 = {
  outputToken: Token
  targetPool: string
  inputTokenAmount: TokenAmount
  slippage: Percent
  walletTokenAccounts: WalletTokenAccounts2
  wallet: Keypair
}
async function swapOnlyAmm(input: TestTxInputInfo2) {
  try {
  // -------- pre-action: get pool info --------
  const targetPoolInfo = await formatAmmKeysById(input.targetPool)
  const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys

  // -------- step 1: coumpute amount out --------
  const {  minAmountOut } = Liquidity.computeAmountOut({
    poolKeys: poolKeys,
    poolInfo: await Liquidity.fetchInfo({ connection, poolKeys }),
    amountIn: input.inputTokenAmount,
    currencyOut: input.outputToken,
    slippage: input.slippage,
  })

  // -------- step 2: create instructions by SDK function --------
  const { innerTransactions } = await Liquidity.makeSwapInstructionSimple({
    connection,
    poolKeys,
    userKeys: {
      tokenAccounts: input.walletTokenAccounts,
      owner: input.wallet.publicKey,
    },
    computeBudgetConfig: {
      microLamports: 32000},
    amountIn: input.inputTokenAmount,
    amountOut: minAmountOut,
    fixedSide: 'in',
    makeTxVersion: TxVersion.V0,
  })

  //console.log('amountOut:', amountOut.toFixed(), '  minAmountOut: ', minAmountOut.toFixed())

  return { innerTxs: (innerTransactions) }
}
catch (err){
  console.error(err)
  return {innerTxs: []}
}
}
export function getSignature(
  transaction: Transaction | VersionedTransaction
): string {
  const signature =
    "signature" in transaction
      ? transaction.signature
      : transaction.signatures[0];
  if (!signature) {
    throw new Error(
      "Missing transaction signature, the transaction was not signed by the fee payer"
    );
  }
  return bs58.encode(signature);
}
/*
type TransactionSenderAndConfirmationWaiterArgs = {
  connection: Connection;
  serializedTransaction: Buffer;
  blockhashWithExpiryBlockHeight: BlockhashWithExpiryBlockHeight;
};

const SEND_OPTIONS = {
  skipPreflight: true,
};

export async function transactionSenderAndConfirmationWaiter({
  connection,
  serializedTransaction,
  blockhashWithExpiryBlockHeight,
}: TransactionSenderAndConfirmationWaiterArgs): Promise<VersionedTransactionResponse | null> {
  const txid = await connection.sendRawTransaction(
    serializedTransaction,
    SEND_OPTIONS
  );

  const controller = new AbortController();
  const abortSignal = controller.signal;

  const abortableResender = async () => {
    while (true) {
      await wait(2_000);
      if (abortSignal.aborted) return;
      try {
        await connection.sendRawTransaction(
          serializedTransaction,
          SEND_OPTIONS
        );
      } catch (e) {
        console.warn(`Failed to resend transaction: ${e}`);
      }
    }
  };

  try {
    abortableResender();
    const lastValidBlockHeight =
      blockhashWithExpiryBlockHeight.lastValidBlockHeight - 150;

    // this would throw TransactionExpiredBlockheightExceededError
    await Promise.race([
      connection.confirmTransaction(
        {
          ...blockhashWithExpiryBlockHeight,
          lastValidBlockHeight,
          signature: txid,
          abortSignal,
        },
        "confirmed"
      ),
      new Promise(async (resolve) => {
        // in case ws socket died
        while (!abortSignal.aborted) {
          await wait(2_000);
          const tx = await connection.getSignatureStatus(txid, {
            searchTransactionHistory: false,
          });
          if (tx?.value?.confirmationStatus === "confirmed") {
            resolve(tx);
          }
        }
      }),
    ]);
  } catch (e) {
    if (e instanceof TransactionExpiredBlockheightExceededError) {
      // we consume this error and getTransaction would return null
      return null;
    } else {
      // invalid state from web3.js
      throw e;
    }
  } finally {
    controller.abort();
  }

  // in case rpc is not synced yet, we add some retries
  const response = promiseRetry(
    async (retry) => {
      const response = await connection.getTransaction(txid, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (!response) {
        retry(response);
      }
      return response;
    },
    {
      retries: 5,
      minTimeout: 1e3,
    }
  );

  return response;
}

 const wait = (time: number) =>
  new Promise((resolve) => setTimeout(resolve, time));
/*
const payer = Keypair.fromSecretKey(
  new Uint8Array(
    JSON.parse(
      fs.readFileSync("/home/stacc/akeypair.json").toString()
    )
  )
);*/
const connection = new Connection("http://202.8.8.185:8899", 'confirmed');
// A simple cache object to store prices; in a more complex application, consider using a more robust caching solution
//let priceCache = {"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": 1}
//let fetchedCache = {}
//let accountCache = {}
//let confidenceCache = {"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": 1}
/*
// Function to calculate quartiles
function quartile(arr, q) {
  const sorted = arr.slice().sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
      return sorted[base];
  }
}
*/
//const url = `https://mainnet.helius-rpc.com/?api-key=baea1964-f797-49e8-8152-6d2292c21241`
/*
const getAsset = async (asset: string) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'my-id',
      method: 'getAsset',
      params: {
        id: asset
      },
    }),
  });
  // @ts-ignore 
  const { result } = await response.json();
  return result 
};*/
/*
async function fetchPrice(tokenId) {
  let aggPrices = [] 
  const markets = raydium.pairToMarkets.get(toPairString("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", tokenId));
  if (markets){
    if (!Object.keys(fetchedCache).includes(tokenId)){
      fetchedCache[tokenId] = Date.now() + 666
    }
    if (fetchedCache[tokenId] > Date.now()){
      fetchedCache[tokenId] = Date.now() + 666

  for (const market of markets){
  const targetPoolInfo = await formatAmmKeysById(market.id)
  if (!Object.keys(accountCache).includes(tokenId)){
    const ai = await connection.getAccountInfo(new PublicKey(tokenId))
    const decoded = MintLayout.decode(ai.data)
    accountCache[tokenId] = {owner:
       ai.owner,
       ...decoded}
  }
  const quoteToken = new Token(TOKEN_PROGRAM_ID, new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), 6, 'USDC', 'USDC');
  const baseToken = new Token(accountCache[tokenId].owner, new PublicKey(tokenId), accountCache[tokenId].decimals, 'token', 'token');
  const inputTokenAmount = new TokenAmount(baseToken, 1 * 10 ** accountCache[tokenId].decimals )
  
  // -------- step 1: compute another amount --------
  const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys
  const slippage = new Percent(1, 100)

  // -------- step 1: coumpute amount out --------
  const { currentPrice, priceImpact} = Liquidity.computeAmountOut({
    poolKeys: poolKeys,
    poolInfo: await Liquidity.fetchInfo({ connection, poolKeys }),
    amountIn: inputTokenAmount,
    currencyOut: quoteToken,
    slippage: slippage,
  })
  if (Number(priceImpact.toFixed(18)) < 0.01){
  aggPrices.push(Number(currentPrice.toFixed(18)))
  }
  }
}
if (aggPrices.length == 0) return 
const data = aggPrices

const Q1 = quartile(data, 0.25);
const Q3 = quartile(data, 0.75);
const IQR = Q3 - Q1;

// Filtering out the outliers
const filteredData = data.filter(x => (x >= (Q1 - 1.5 * IQR)) && (x <= (Q3 + 1.5 * IQR)));

const confidence = filteredData.length / data.length;

// Calculating the mean of filtered data
const meanFilteredData = filteredData.reduce((acc, val) => acc + val, 0) / filteredData.length;

console.log('Filtered Data:', filteredData);
console.log('Confidence (Proportion of Data Retained):', confidence.toFixed(2));
console.log('Mean of Filtered Data:', meanFilteredData.toFixed(18));
priceCache[tokenId] = meanFilteredData.toFixed(18)
confidenceCache[tokenId] = confidence
  }
}*/
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
//const goodCache: any = {};
const fs = require('fs')
/**
 * Attempts to infer the price of an unknown token given pre and post transaction balances
 * for a transaction involving one known and one unknown token.
 *//*
const openai = new OpenAI();
const assetToRacism: Map<string, number> = new Map(); */
/*
async function inferUnknownTokenPrice(preBalances: any[], postBalances: any[]): Promise<void> {
  try {
  for (const p of preBalances){
    //if (!Object.keys(priceCache).includes(p.mint)){
       ///await fetchPrice(p.mint)
       if (false){//p.mint != NATIVE_MINT.toBase58()){
        if (!assetToRacism.has(p.mint)){
          assetToRacism.set(p.mint, 0)
        const asset = await  getAsset(p.mint);
        if (asset){
  console.log(JSON.stringify(asset.content.metadata))
  const completion = await openai.chat.completions.create({
    messages: [{"role": "system", "content": `You are a helpful assistant who is helping us help solana Introducing the Racelist

    A list of Solana wallets that created or traded overtly racist tokens.
    
    Feel free to reference it or purge them from your airdrop recipients.
    .`},
        {"role": "user", "content": `Is the following content racist: {
          description: 'Make America Great Again 🇺🇸 ',
          name: 'MAGA',
          symbol: 'TRUMP',
          token_standard: 'Fungible'
        }`},
        {"role": "assistant", "content": "20%"},
        {"role": "user", "content": `Is the following content racist: {
          description: 'jus a dog wif a hood \n\nt.me/dogwifhoodSOL\nx.com/dogwifhood\ndogwifhood.xyz',
          name: 'dogwifhood',
          symbol: 'HOOD',
          token_standard: 'Fungible'
        } `},
        {"role": "assistant", "content": "0%"},
        {"role": "user", "content": `Is the following content racist: {
          description: '
          name: 'NIGGACHU',
          symbol: 'NIGGACHU',
          token_standard: 'Fungible'}`},

        {"role": "assistant", "content": "100%"},
        {"role": "user", "content": `Is the following content racist: 
          ` + JSON.stringify(asset.content.metadata) + ``}],
    model: "gpt-3.5-turbo",
  });

  console.log(completion.choices[0])
  assetToRacism.set(p.mint, Number(completion.choices[0].message.content.replace('%','')))
const baddies: any = []
assetToRacism.forEach((value, key) => {
    
   value > 0 ? baddies.push({key: key, value: value}) : null
        })
        if (baddies.length > 0){
console.log(baddies)
fs.writeFileSync('./baddies.json', JSON.stringify(baddies));
        }
      }}
       }
       if (Object.keys(priceCache).includes(p.mint)){
       goodCache[p.mint] = [{
        volume: 0,
        confidence: confidenceCache[p.mint],
        price: priceCache[p.mint],
        cumulativeVolume: 0,
        timestamp: Date.now()
      }]
    }
    //}
  }
  fs.writeFileSync('./goodCache.json', JSON.stringify(goodCache));
/*
  // Identify the known and unknown tokens from the pre-transaction balances
  const knownTokenPreC = preBalances.filter(balance => balance.mint in priceCache);
  const unknownTokenPreC = preBalances.filter(balance => !(balance.mint in priceCache));
  // return if there are more than 1 of either of these

  if (knownTokenPreC.length > 1 || unknownTokenPreC.length > 1){
    return;
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
  //const buyOrSell = unknownTokenPost.uiTokenAmount.uiAmount - unknownTokenPre.uiTokenAmount.uiAmount > 0 ? 'buy' : 'sell';

  // Ensure there's a meaningful change to calculate from
  if (knownAmountChange === 0 || unknownAmountChange === 0) {
    return;
  }

  // Use the known token's price and the ratio of amount changes to infer the unknown token's price
  const knownTokenPrice = priceCache[knownTokenPre.mint];

  goodCache[knownTokenPre.mint] = [{
    volume: 0,
    price: priceCache[knownTokenPre.mint],
    cumulativeVolume: 0,
    timestamp: Date.now()
  }]
  const inferredUnknownPrice = (knownTokenPrice * knownAmountChange) / unknownAmountChange;
  console.log('knownToeknPrice, knownAmountChange, unknownAmountChange', knownTokenPrice, knownAmountChange, unknownAmountChange)
  if (!Object.keys(priceCache).includes(unknownTokenPre.mint)){//} && isTokenAccountOfInterest(unknownTokenPre.mint)){
  console.log(`Inferred price for ${unknownTokenPre.mint}: $${inferredUnknownPrice.toFixed(6)} (based on ${knownTokenPre.mint})`);
  console.log('Inferred volume in $USD for', unknownTokenPre.mint, 'is', (inferredUnknownPrice * unknownAmountChange).toFixed(6))
  /*
  const plainOldTokens = await connection.getParsedTokenAccountsByOwner(payer.publicKey, {programId: TOKEN_PROGRAM_ID})
  const t22Tokens = await connection.getParsedTokenAccountsByOwner(payer.publicKey, {programId: new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb")})
  const tokens = plainOldTokens.value.concat(t22Tokens.value)
  const token = tokens.find(t => t.account.data.parsed.info.mint === unknownTokenPre.mint)
  console.log(buyOrSell)
  if (buyOrSell === 'buy'){
   // const usdc = tokens.find(t => t.account.data.parsed.info.mint === "So11111111111111111111111111111111111111112")
    const usdcBalance = Math.floor(Number(await connection.getBalance(payer.publicKey)) / 100)
    
    const inputToken = new Token(TOKEN_PROGRAM_ID, NATIVE_MINT, 9, 'SOL', 'SOL')
    const outputTokenAccountInfo = await connection.getParsedAccountInfo(new PublicKey(unknownTokenPre.mint))
    // @ts-ignore
    const outputToken = new Token(outputTokenAccountInfo.value.owner, new PublicKey(unknownTokenPre.mint), outputTokenAccountInfo.value.data.parsed.info.decimals, outputTokenAccountInfo.value.data.parsed.info.symbol, outputTokenAccountInfo.value.data.parsed.info.symbol)
    const targetPool = markets.find(m => m.quoteMint === "So11111111111111111111111111111111111111112" && m.baseMint === unknownTokenPre.mint)
    if (targetPool != undefined){


    const inputTokenAmount = new TokenAmount(inputToken, usdcBalance)
    const slippage = new Percent(1, 100)
    const walletTokenAccounts = await getWalletTokenAccount(new Connection("http://202.8.8.185:8899"), payer.publicKey)
  
    swapOnlyAmm({
      outputToken,
      targetPool: targetPool.id,
      inputTokenAmount,
      slippage,
      walletTokenAccounts,
      wallet: payer,
    }).then(({ txids }) => {
      console.log('txids', txids)
    })
    }
  }
   else if (buyOrSell === 'sell' && token != undefined){
    const inputTokenAccountInfo = await connection.getParsedAccountInfo(new PublicKey(unknownTokenPre.mint))
    const tokenBalance = Math.floor(Number(token.account.data.parsed.info.tokenAmount.amount) / 10)

    // @ts-ignore
    const inputToken = new Token(inputTokenAccountInfo.value.owner, new PublicKey(unknownTokenPre.mint), inputTokenAccountInfo.value.data.parsed.info.decimals, inputTokenAccountInfo.value.data.parsed.info.symbol, inputTokenAccountInfo.value.data.parsed.info.symbol)
    const outputToken = new Token(TOKEN_PROGRAM_ID, NATIVE_MINT, 9, 'SOL', 'SOL')
    const targetPool = markets.find(m => m.quoteMint === "So11111111111111111111111111111111111111112" && m.baseMint === unknownTokenPre.mint)
    if (targetPool != undefined){
    const inputTokenAmount = new TokenAmount(inputToken, tokenBalance)
    const slippage = new Percent(1, 100)
    const walletTokenAccounts = await getWalletTokenAccount(new Connection("http://202.8.8.185:8899"), payer.publicKey)
  
    swapOnlyAmm({
      outputToken,
      targetPool: targetPool.id,
      inputTokenAmount,
      slippage,
      walletTokenAccounts,
      wallet: payer,
    }).then(({ txids }) => {
      console.log('txids', txids)
    })
  }
  }
  // save an object for the inferred volume in $USD, along with cumulative volume for the last 1hr, as well as a timestamp
  // discount any trade earlier than 1hr
  // save the object to a file
  if (true){
goodCache[unknownTokenPre.mint] = [{
  volume: Math.abs(Number(unknownTokenPost.uiTokenAmount.amount) - Number(unknownTokenPre.uiTokenAmount.amount)),
  price: inferredUnknownPrice,
  cumulativeVolume: 0,
  confidence: confidenceCache[unknownTokenPre.mint] || 1,
  timestamp: Date.now()
}]
  } else {
    goodCache[unknownTokenPre.mint].push(
      {
        price: inferredUnknownPrice,
        volume: Math.abs(Number(unknownTokenPost.uiTokenAmount.amount) - Number(unknownTokenPre.uiTokenAmount.amount)),
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
  fs.writeFileSync('./goodCache.json', data);


  
  }
  else {
    

  }
} catch (err){
  console.error(err)

}
}
*/
type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>
type TestTxInputInfo = {
  baseToken: Token
  quoteToken: Token
  targetPool: string
  inputTokenAmount: TokenAmount
  slippage: Percent
  walletTokenAccounts: WalletTokenAccounts
  wallet: Keypair
  dir: string
  targetPoolInfo: any
  poolKeys: any
}

async function ammAddLiquidity(
  input: TestTxInputInfo
): Promise<{ txids: string[]; anotherAmount: TokenAmount | CurrencyAmount }> {
  try {
  const targetPoolInfo = input.targetPoolInfo
  const poolKeys = input.poolKeys
  const lpTokens = poolKeys.lpMint
  const lpTokenAccount = await connection.getParsedAccountInfo(lpTokens)
  // @ts-ignore
  //console.log(lpTokenAccount.value.data.parsed)
  if (poolKeys.quoteMint.equals(NATIVE_MINT)){
  //  console.log('weiner?')
  const extraPoolInfo = await Liquidity.fetchInfo({ connection, poolKeys })
  // @ts-ignore
  const aratio=(1/ Number(extraPoolInfo.lpSupply.toNumber() / (Number(lpTokenAccount.value.data.parsed.info.supply))))
  //console.log(aratio)
  if (aratio != 0 && aratio < 0.011 && input.dir == 'deposit'){
 // console.log(extraPoolInfo)
  const { maxAnotherAmount, anotherAmount } = Liquidity.computeAnotherAmount({
    poolKeys,
    poolInfo: { ...targetPoolInfo, ...extraPoolInfo },
    amount: input.inputTokenAmount as any,
    anotherCurrency: input.baseToken as any,
    slippage: input.slippage,
  })

 /* console.log('will add liquidity info', {
    liquidity: liquidity.toString(),
    liquidityD: new Decimal(liquidity.toString()).div(10 ** extraPoolInfo.lpDecimals),
  })*/
  
let innerTxs = await  swapOnlyAmm({
    outputToken: input.baseToken,
    targetPool: input.targetPool,
    inputTokenAmount: input.inputTokenAmount,
    slippage: input.slippage,
    walletTokenAccounts: input.walletTokenAccounts,
    wallet: wallet,
  })
  const txids = await buildAndSendTx(innerTxs.innerTxs)
  console.log('awaiting ' + txids[0])
  try {
  await connection.confirmTransaction(txids[0], 'recent')
  } catch (err){}
    try {
  // -------- step 2: make instructions --------
  const addLiquidityInstructionResponse = await Liquidity.makeAddLiquidityInstructionSimple({
    connection,
    poolKeys,
    userKeys: {
      owner: input.wallet.publicKey,
      payer: input.wallet.publicKey,
      tokenAccounts: input.walletTokenAccounts
    },
    computeBudgetConfig: {
      microLamports: 32000},
    amountInA: maxAnotherAmount as any,
    amountInB: input.inputTokenAmount as any,
    fixedSide: 'b',
    makeTxVersion: TxVersion.V0,
  })
  return { txids: [...await buildAndSendTx(addLiquidityInstructionResponse.innerTransactions)], anotherAmount: anotherAmount }
} catch (Err){
  console.log(Err)
  return {txids: [], anotherAmount: null}
}
}
else if (input.dir == 'withdraw'){
  // -------- step 2: make instructions --------
  const removeLiquidityInstructionResponse = await Liquidity.makeRemoveLiquidityInstructionSimple({
    connection,
    poolKeys,
    userKeys: {
      owner: input.wallet.publicKey,
      payer: input.wallet.publicKey,
      tokenAccounts: input.walletTokenAccounts,
    },
    computeBudgetConfig: {
      microLamports: 32000},
    makeTxVersion: TxVersion.V0,
    amountIn: input.inputTokenAmount as any,

  })

  return { txids: await buildAndSendTx(removeLiquidityInstructionResponse.innerTransactions), anotherAmount:  null }
}
  }
return {txids: [], anotherAmount: null}
  } catch (err){
    console.log(err)
    return {txids: [], anotherAmount: null
  }
}
}
let lastWalletRefresh = Date.now()
let walletTokenAccounts: WalletTokenAccounts = []
  // Handle updates
  stream.on("data", async(data) => {
    // Get the IDL for a specific program hash
const SFMIdlItem = await getProgramIdl(programId);

    if (data.transaction != undefined){
      const ixDatas = (data.transaction.transaction.meta.innerInstructions.map((i: any) => i.instructions.map((i: any) => i))).flat()
        for (const ixData of ixDatas){
// Checks if SFMIdlItem is defined, if not you will not be able to initialize the parser layout
if (SFMIdlItem) {
  try {  
  const parser = new SolanaFMParser(SFMIdlItem, programId);

    const instructionParser = parser.createParser(ParserType.INSTRUCTION);

    if (instructionParser && checkIfInstructionParser(instructionParser)) {
        // Parse the transaction
        const decodedData = instructionParser.parseInstructions(bs58.encode(ixData.data));
        if (
      decodedData != null &&  ( decodedData.name == 'deposit' || decodedData.name == 'withdraw' )){
        if (data.transaction.transaction.transaction.message.addressTableLookups.length == 0){
         
    
          let accountKeys: any | null = null;
          try {
            accountKeys = (data.transaction.transaction.transaction.message.accountKeys)
           
          } catch (e) {
            console.log(e, 'address not in lookup table');
          }
          const accountsOfInterest: any = accountKeys
    
          for (const account of (accountsOfInterest)){
            try {
  const targetPoolInfo = await formatAmmKeysById(bs58.encode(account))
  if (Object.keys(targetPoolInfo).length > 0){
    const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys
    const poolInfo = await Liquidity.fetchInfo({ connection, poolKeys })
     // console.log('weiner')
      const baseMintAI = await connection.getAccountInfo(poolKeys.baseMint)
  const baseToken = new Token(baseMintAI.owner, poolKeys.baseMint, poolInfo.baseDecimals, 'USDC', 'USDC')
  const quoteToken = DEFAULT_TOKEN.WSOL // RAY
  const inputTokenAmount = new TokenAmount( quoteToken, Math.floor((await connection.getBalance(wallet.publicKey)) / 1000))
  const slippage = new Percent(138, 10000)
  if (Date.now() - lastWalletRefresh > 30000){
    walletTokenAccounts = await getWalletTokenAccount(new Connection("http://202.8.8.185:8899"), wallet.publicKey)
    lastWalletRefresh = Date.now()
  }
  ammAddLiquidity({
    dir: decodedData.name,
    baseToken,
    quoteToken,
    targetPool: bs58.encode(account),
    inputTokenAmount,
    slippage,
    walletTokenAccounts,
    wallet: wallet,
    targetPoolInfo,
    poolKeys
  }).then(({ txids, anotherAmount }) => {
    /** continue with txids */
    txids.length > 0 ? 
    console.log('txids', txids, anotherAmount) : null
  })
    }
          fs.writeFileSync('./initialize.json', JSON.stringify(decodedDatas))
      } catch (err){
console.log(err)
      }
    }

          
}

   /* const preTokenBalances = data.transaction.transaction.meta.preTokenBalances
    const postTokenBalances = data.transaction.transaction.meta.postTokenBalances
   await inferUnknownTokenPrice(preTokenBalances, postTokenBalances)
*/

  }
  }
}
  
  catch (err){
console.log(err)
  }
}
}
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
          default: JSON.parse(fs.readFileSync('10s.txt').toString()),
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
