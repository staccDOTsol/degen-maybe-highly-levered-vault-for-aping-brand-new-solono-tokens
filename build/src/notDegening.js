"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const core_1 = require("@jup-ag/core");
const raydium_sdk_1 = require("@raydium-io/raydium-sdk");
const T2 = tslib_1.__importStar(require("@solana/spl-token"));
const spl_token_1 = require("@solana/spl-token");
const web3_js_1 = require("@solana/web3.js");
const wallet = web3_js_1.Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs_1.default.readFileSync('/home/stacc/photon.json', 'utf-8').toString())));
const connection = new web3_js_1.Connection("http://202.8.8.185:8899", "finalized");
async function main() {
    const goodCache = JSON.parse(fs_1.default.readFileSync('/home/stacc/goodCache.json', 'utf-8').toString());
    const goodKeys = Object.keys(goodCache);
    // @ts-ignore
    const cumulativeVolumes = Object.values(goodCache).map((pool) => pool.cumulativeVolume);
    // keys sorted by cumulative volume
    const sortedKeys = goodKeys.sort((a, b) => {
        return cumulativeVolumes[goodKeys.indexOf(a)] - cumulativeVolumes[goodKeys.indexOf(b)];
    });
    const goodKeysLen = goodKeys.length;
    // slice top 10% 
    const topKeys = sortedKeys.slice(0, Math.floor(goodKeysLen * 0.1));
    console.log(topKeys);
    // take Math.floor(Math.random()*len)
    const key = topKeys[Math.floor(Math.random() * topKeys.length)];
    console.log(key);
    const volumes = goodCache[key][0];
    const mainnetJson = JSON.parse(fs_1.default.readFileSync('./src/markets/raydium/mainnet.json', 'utf-8').toString());
    const poolKeys = mainnetJson.unOfficial.find((pool) => pool.baseMint === key && pool.quoteMint == core_1.WRAPPED_SOL_MINT.toBase58());
    console.log((0, raydium_sdk_1.jsonInfo2PoolKeys)(poolKeys));
    try {
        const { quoteMint, lpMint } = poolKeys;
        const poolInfo = await raydium_sdk_1.Liquidity.fetchInfo({ connection, poolKeys: (0, raydium_sdk_1.jsonInfo2PoolKeys)(poolKeys) });
        const quoteMintAccountInfo = await connection.getAccountInfo(new web3_js_1.PublicKey(quoteMint));
        const lpMintAccountInfo = await connection.getAccountInfo(new web3_js_1.PublicKey(lpMint));
        const { quoteDecimals } = poolInfo;
        const currencyAmount = new raydium_sdk_1.TokenAmount(new raydium_sdk_1.Token(quoteMintAccountInfo.owner, quoteMint, quoteDecimals), Math.floor(volumes.volume / 10));
        const anotherCurrency = raydium_sdk_1.Currency.SOL;
        const { maxAnotherAmount } = raydium_sdk_1.Liquidity.computeAnotherAmount({
            poolKeys: (0, raydium_sdk_1.jsonInfo2PoolKeys)(poolKeys),
            poolInfo,
            amount: currencyAmount,
            anotherCurrency,
            slippage: new raydium_sdk_1.Percent(66),
        });
        console.log(maxAnotherAmount.toExact());
        const tokenAccounts = [
            await raydium_sdk_1.Spl.getAssociatedTokenAccount({ programId: quoteMintAccountInfo.owner, mint: new web3_js_1.PublicKey(quoteMint), owner: wallet.publicKey }),
            await raydium_sdk_1.Spl.getAssociatedTokenAccount({ programId: lpMintAccountInfo.owner, mint: new web3_js_1.PublicKey(lpMint), owner: wallet.publicKey })
        ];
        const splAccounts = [];
        let index = 0;
        let mints = [quoteMint, lpMint];
        for (const tokenAccount in tokenAccounts) {
            let accountInfo = await connection.getAccountInfo(tokenAccounts[tokenAccount]);
            if (accountInfo == undefined) {
                const mintInfo = await connection.getAccountInfo(new web3_js_1.PublicKey(mints[index]));
                // create ata
                const tx = new web3_js_1.Transaction().add(T2.Token.createAssociatedTokenAccountInstruction(spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID, mintInfo.owner, new web3_js_1.PublicKey(mints[index]), tokenAccounts[tokenAccount], wallet.publicKey, wallet.publicKey));
                tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
                tx.feePayer = wallet.publicKey;
                try {
                    await connection.sendTransaction(tx, [wallet]);
                    accountInfo = await connection.getAccountInfo(tokenAccounts[tokenAccount]);
                }
                catch (err) {
                    console.log(err);
                }
            }
            index++;
            try {
                let hm = raydium_sdk_1.SPL_ACCOUNT_LAYOUT.decode(accountInfo.data);
                splAccounts.push(hm);
            }
            catch (err) {
                console.log(err);
            }
        }
        const tokenAccountsTyepd = [];
        tokenAccountsTyepd.push({
            pubkey: tokenAccounts[0],
            accountInfo: splAccounts[0],
            programId: quoteMintAccountInfo.owner,
        });
        tokenAccountsTyepd.push({
            pubkey: tokenAccounts[1],
            accountInfo: splAccounts[1],
            programId: lpMintAccountInfo.owner,
        });
        const { innerTransactions: inners } = await raydium_sdk_1.Liquidity.makeSwapInstructionSimple({
            connection,
            poolKeys: (0, raydium_sdk_1.jsonInfo2PoolKeys)(poolKeys),
            userKeys: {
                tokenAccounts: tokenAccountsTyepd,
                owner: wallet.publicKey,
            },
            amountIn: currencyAmount,
            amountOut: maxAnotherAmount,
            makeTxVersion: 0,
            fixedSide: "in",
        });
        console.log(inners);
        for (const innerTx of inners) {
            console.log(innerTx);
            const tx = new web3_js_1.Transaction().add(...innerTx.instructions);
            const txid = await connection.sendTransaction(tx, [wallet, ...innerTx.signers]);
            console.log('swapping https://solscan.io/tx/' + txid);
        }
        const { innerTransactions } = await raydium_sdk_1.Liquidity.makeAddLiquidityInstructionSimple({
            connection,
            poolKeys: (0, raydium_sdk_1.jsonInfo2PoolKeys)(poolKeys),
            userKeys: {
                tokenAccounts: tokenAccountsTyepd,
                owner: wallet.publicKey,
            },
            amountInA: currencyAmount,
            amountInB: maxAnotherAmount,
            fixedSide: "a",
            makeTxVersion: 0
        });
        for (const innerTx of innerTransactions) {
            const tx = new web3_js_1.Transaction().add(...innerTx.instructions);
            const txid = await connection.sendTransaction(tx, [wallet, ...innerTx.signers]);
            console.log("add liq https://solscan.io/tx/" + txid);
        }
    }
    catch (err) {
        console.log(err);
    }
    main();
}
main();
//# sourceMappingURL=notDegening.js.map