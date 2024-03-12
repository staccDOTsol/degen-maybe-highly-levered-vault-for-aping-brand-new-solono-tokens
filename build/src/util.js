"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleepTime = exports.getATAAddress = exports.buildAndSendTx = exports.getWalletTokenAccount = exports.sendTx = void 0;
const raydium_sdk_1 = require("@raydium-io/raydium-sdk");
const web3_js_1 = require("@solana/web3.js");
const configy_1 = require("./configy");
async function sendTx(connection, payer, txs, options) {
    const txids = [];
    for (const iTx of txs) {
        if (iTx instanceof web3_js_1.VersionedTransaction) {
            iTx.sign([payer]);
            txids.push(await connection.sendTransaction(iTx, options));
        }
        else {
            txids.push(await connection.sendTransaction(iTx, [payer], options));
        }
    }
    return txids;
}
exports.sendTx = sendTx;
async function getWalletTokenAccount(connection, wallet) {
    const walletTokenAccount = await connection.getTokenAccountsByOwner(wallet, {
        programId: raydium_sdk_1.TOKEN_PROGRAM_ID,
    });
    return walletTokenAccount.value.map((i) => ({
        pubkey: i.pubkey,
        programId: i.account.owner,
        accountInfo: raydium_sdk_1.SPL_ACCOUNT_LAYOUT.decode(i.account.data),
    }));
}
exports.getWalletTokenAccount = getWalletTokenAccount;
async function buildAndSendTx(innerSimpleV0Transaction, options) {
    const willSendTx = await (0, raydium_sdk_1.buildSimpleTransaction)({
        connection: configy_1.connection,
        makeTxVersion: configy_1.makeTxVersion,
        payer: configy_1.wallet.publicKey,
        innerTransactions: innerSimpleV0Transaction,
        addLookupTableInfo: configy_1.addLookupTableInfo,
    });
    return await sendTx(configy_1.connection, configy_1.wallet, willSendTx, options);
}
exports.buildAndSendTx = buildAndSendTx;
function getATAAddress(programId, owner, mint) {
    const { publicKey, nonce } = (0, raydium_sdk_1.findProgramAddress)([owner.toBuffer(), programId.toBuffer(), mint.toBuffer()], new web3_js_1.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"));
    return { publicKey, nonce };
}
exports.getATAAddress = getATAAddress;
async function sleepTime(ms) {
    console.log((new Date()).toLocaleString(), 'sleepTime', ms);
    return new Promise(resolve => setTimeout(resolve, ms));
}
exports.sleepTime = sleepTime;
//# sourceMappingURL=util.js.map