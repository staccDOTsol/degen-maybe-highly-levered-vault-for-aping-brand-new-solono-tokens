import fs from "fs";

import { WRAPPED_SOL_MINT } from "@jup-ag/core";
import {
  Currency,
  jsonInfo2PoolKeys,
  Liquidity,
  LiquidityPoolKeysV4,
  Percent,
  Spl,
  SPL_ACCOUNT_LAYOUT,
  SplAccount,
  Token,
  TokenAccount,
  TokenAmount,
} from "@raydium-io/raydium-sdk";
import * as T2 from "@solana/spl-token";
import { ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";

const wallet = Keypair.fromSecretKey(
    new Uint8Array(
        JSON.parse(fs.readFileSync('/home/stacc/photon.json', 'utf-8').toString())  
    )
)
const connection = new Connection("http://202.8.8.185:8899", "finalized")
async function main(){
    const goodCache = JSON.parse(fs.readFileSync('/home/stacc/goodCache.json', 'utf-8').toString())
    const goodKeys = Object.keys(goodCache);
    // @ts-ignore
    const cumulativeVolumes = Object.values(goodCache).map((pool) => pool.cumulativeVolume);
    // keys sorted by cumulative volume
    const sortedKeys = goodKeys.sort((a, b) => {
      return cumulativeVolumes[goodKeys.indexOf(a)] - cumulativeVolumes[goodKeys.indexOf(b)];
    });
    const goodKeysLen = goodKeys.length;

    // slice top 10% 
    const topKeys = sortedKeys.slice(0, Math.floor(goodKeysLen*0.1));
    console.log(topKeys)
    // take Math.floor(Math.random()*len)
    const key = topKeys[Math.floor(Math.random()*topKeys.length)];
    console.log(key)
    const volumes = goodCache[key][0];
    const mainnetJson = JSON.parse(fs.readFileSync('./src/markets/raydium/mainnet.json', 'utf-8').toString());
    const poolKeys = mainnetJson.unOfficial.find((pool) => pool.baseMint === key && pool.quoteMint == WRAPPED_SOL_MINT.toBase58())
    console.log(jsonInfo2PoolKeys(poolKeys) as LiquidityPoolKeysV4)
    try {
    const { quoteMint, lpMint } = poolKeys;
    const poolInfo = await Liquidity.fetchInfo({ connection, poolKeys: jsonInfo2PoolKeys(poolKeys) as LiquidityPoolKeysV4 });
    const quoteMintAccountInfo = await connection.getAccountInfo(new PublicKey(quoteMint));
    const lpMintAccountInfo = await connection.getAccountInfo(new PublicKey(lpMint));
    const { quoteDecimals } = poolInfo;
    const currencyAmount = new TokenAmount(new Token(quoteMintAccountInfo.owner, quoteMint, quoteDecimals), Math.floor(volumes.volume / 10));
    const anotherCurrency = Currency.SOL;
    
    const { maxAnotherAmount } = Liquidity.computeAnotherAmount({
      poolKeys: jsonInfo2PoolKeys(poolKeys) as LiquidityPoolKeysV4,
      poolInfo,
      amount: currencyAmount,
      anotherCurrency,
      slippage: new Percent(66),
    });
    console.log(maxAnotherAmount.toExact());
    const tokenAccounts = [
        await Spl.getAssociatedTokenAccount({ programId: quoteMintAccountInfo.owner, mint: new PublicKey(quoteMint), owner: wallet.publicKey }),
        await Spl.getAssociatedTokenAccount({ programId: lpMintAccountInfo.owner, mint: new PublicKey(lpMint), owner: wallet.publicKey })
    ]
    const splAccounts: SplAccount[] = [];
    let index = 0;
    let mints = [quoteMint, lpMint];
    for (const tokenAccount in tokenAccounts){
        let accountInfo = await connection.getAccountInfo(tokenAccounts[tokenAccount]);
        if (accountInfo == undefined){
            const mintInfo = await connection.getAccountInfo(new PublicKey(mints[index]))
            // create ata
            const tx = new Transaction().add(
                T2.Token.createAssociatedTokenAccountInstruction(ASSOCIATED_TOKEN_PROGRAM_ID, mintInfo.owner,
                    new PublicKey(mints[index]),

                    tokenAccounts[tokenAccount],
                    wallet.publicKey,
                    wallet.publicKey,
                )
            )
            tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            tx.feePayer = wallet.publicKey;
            try {
                await connection.sendTransaction(tx, [wallet]);
            accountInfo = await connection.getAccountInfo(tokenAccounts[tokenAccount]);
            } catch (err){
                console.log(err)
               
            }
        }
        index++
        try {
        let hm = SPL_ACCOUNT_LAYOUT.decode(accountInfo.data);
        splAccounts.push(hm);
        }
        catch (err){
            console.log(err)
        }
    }
    const tokenAccountsTyepd : TokenAccount[] = [];
    tokenAccountsTyepd.push ({
        pubkey: tokenAccounts[0],
        accountInfo: splAccounts[0],
        programId: quoteMintAccountInfo.owner,
    })
    tokenAccountsTyepd.push ({
        pubkey: tokenAccounts[1],
        accountInfo: splAccounts[1],
        programId: lpMintAccountInfo.owner,
    })
    const {innerTransactions: inners} = await Liquidity.makeSwapInstructionSimple({
        connection,
        poolKeys: jsonInfo2PoolKeys(poolKeys) as LiquidityPoolKeysV4,
        userKeys: {
            tokenAccounts: tokenAccountsTyepd,
            owner: wallet.publicKey,
        },
        amountIn: currencyAmount,
        amountOut: maxAnotherAmount,
        makeTxVersion: 0,
        fixedSide: "in",
        });
        console.log(inners)
    for (const innerTx of inners){
        console.log(innerTx)
        const tx = new Transaction().add(...innerTx.instructions)
        const txid = await connection.sendTransaction(tx, [wallet, ...innerTx.signers]);
        console.log('swapping https://solscan.io/tx/'+txid);
    }

    const { innerTransactions } = await Liquidity.makeAddLiquidityInstructionSimple({
      connection,
      poolKeys: jsonInfo2PoolKeys(poolKeys) as LiquidityPoolKeysV4,
      userKeys: {
        tokenAccounts: tokenAccountsTyepd,
        owner: wallet.publicKey,
      },
      amountInA: currencyAmount,
      amountInB: maxAnotherAmount,
      fixedSide: "a",
      makeTxVersion: 0
    });
    for (const innerTx of innerTransactions){
        const tx = new Transaction().add(...innerTx.instructions)
        const txid = await connection.sendTransaction(tx, [wallet, ...innerTx.signers]);

        console.log("add liq https://solscan.io/tx/"+txid);
    }
} catch (err){
    console.log(err)
}
main()
}
 main()