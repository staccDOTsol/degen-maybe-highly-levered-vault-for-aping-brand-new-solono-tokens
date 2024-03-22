"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSerializableSwapParams = exports.toSwapParams = exports.toQuoteParams = exports.toSerializableQuoteParams = exports.toJupiterQuote = exports.toSerializableJupiterQuote = exports.toAccountInfo = exports.toSerializableAccountInfo = exports.toPairString = exports.toAccountMeta = exports.toSerializableAccountMeta = void 0;
const tslib_1 = require("tslib");
const web3_js_1 = require("@solana/web3.js");
const jsbi_1 = tslib_1.__importDefault(require("jsbi"));
function toPairString(mintA, mintB) {
    if (mintA < mintB) {
        return `${mintA}-${mintB}`;
    }
    else {
        return `${mintB}-${mintA}`;
    }
}
exports.toPairString = toPairString;
function toSerializableAccountInfo(accountInfo) {
    if (accountInfo == undefined) {
        return null;
    }
    return {
        data: new Uint8Array(accountInfo.data),
        executable: accountInfo.executable,
        lamports: accountInfo.lamports,
        owner: accountInfo.owner.toBase58(),
        rentEpoch: accountInfo.rentEpoch,
    };
}
exports.toSerializableAccountInfo = toSerializableAccountInfo;
function toAccountInfo(accountInfo) {
    return {
        data: Buffer.from(accountInfo.data),
        executable: accountInfo.executable,
        lamports: accountInfo.lamports,
        owner: new web3_js_1.PublicKey(accountInfo.owner),
        rentEpoch: accountInfo.rentEpoch,
    };
}
exports.toAccountInfo = toAccountInfo;
function toSerializableJupiterQuote(quote) {
    let fees = 0;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    let feeMint = quote.inputMint;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    for (const route of quote.routePlan) {
        fees += route.swapInfo.feeAmount;
        if (route.swapInfo.feeAmount > 0) {
            feeMint = route.swapInfo.feeMint;
        }
    }
    return {
        notEnoughLiquidity: false,
        minInAmount: quote.inAmount?.toString(),
        minOutAmount: quote.outAmount?.toString(),
        inAmount: quote.inAmount.toString(),
        outAmount: quote.outAmount.toString(),
        feeAmount: fees.toString(),
        feeMint: quote.feeMint,
        feePct: 0,
        priceImpactPct: 0,
    };
}
exports.toSerializableJupiterQuote = toSerializableJupiterQuote;
function toJupiterQuote(serializableQuote) {
    return {
        notEnoughLiquidity: serializableQuote.notEnoughLiquidity,
        minInAmount: serializableQuote.minInAmount
            ? jsbi_1.default.BigInt(serializableQuote.minInAmount)
            : undefined,
        minOutAmount: serializableQuote.minOutAmount
            ? jsbi_1.default.BigInt(serializableQuote.minOutAmount)
            : undefined,
        inAmount: jsbi_1.default.BigInt(serializableQuote.inAmount),
        outAmount: jsbi_1.default.BigInt(serializableQuote.outAmount),
        feeAmount: jsbi_1.default.BigInt(serializableQuote.feeAmount),
        feeMint: serializableQuote.feeMint,
        feePct: serializableQuote.feePct,
        priceImpactPct: serializableQuote.priceImpactPct,
    };
}
exports.toJupiterQuote = toJupiterQuote;
function toSerializableQuoteParams(quoteParams) {
    return {
        sourceMint: quoteParams.sourceMint.toBase58(),
        destinationMint: quoteParams.destinationMint.toBase58(),
        amount: quoteParams.amount.toString(),
        swapMode: quoteParams.swapMode,
    };
}
exports.toSerializableQuoteParams = toSerializableQuoteParams;
function toQuoteParams(serializableQuoteParams) {
    return {
        sourceMint: new web3_js_1.PublicKey(serializableQuoteParams.sourceMint),
        destinationMint: new web3_js_1.PublicKey(serializableQuoteParams.destinationMint),
        amount: jsbi_1.default.BigInt(serializableQuoteParams.amount),
        swapMode: serializableQuoteParams.swapMode,
    };
}
exports.toQuoteParams = toQuoteParams;
function toSerializableAccountMeta(meta) {
    return {
        pubkey: meta.pubkey.toBase58(),
        isSigner: meta.isSigner,
        isWritable: meta.isWritable,
    };
}
exports.toSerializableAccountMeta = toSerializableAccountMeta;
function toAccountMeta(serializableMeta) {
    return {
        pubkey: new web3_js_1.PublicKey(serializableMeta.pubkey),
        isSigner: serializableMeta.isSigner,
        isWritable: serializableMeta.isWritable,
    };
}
exports.toAccountMeta = toAccountMeta;
function toSerializableSwapParams(swapParams) {
    return {
        sourceMint: swapParams.sourceMint.toBase58(),
        destinationMint: swapParams.destinationMint.toBase58(),
        userSourceTokenAccount: swapParams.userSourceTokenAccount.toBase58(),
        userDestinationTokenAccount: swapParams.userDestinationTokenAccount.toBase58(),
        userTransferAuthority: swapParams.userTransferAuthority.toBase58(),
        amount: swapParams.amount.toString(),
        swapMode: swapParams.swapMode,
    };
}
exports.toSerializableSwapParams = toSerializableSwapParams;
function toSwapParams(serializableSwapParams) {
    return {
        sourceMint: new web3_js_1.PublicKey(serializableSwapParams.sourceMint),
        destinationMint: new web3_js_1.PublicKey(serializableSwapParams.destinationMint),
        userSourceTokenAccount: new web3_js_1.PublicKey(serializableSwapParams.userSourceTokenAccount),
        userDestinationTokenAccount: new web3_js_1.PublicKey(serializableSwapParams.userDestinationTokenAccount),
        userTransferAuthority: new web3_js_1.PublicKey(serializableSwapParams.userTransferAuthority),
        amount: jsbi_1.default.BigInt(serializableSwapParams.amount),
        swapMode: serializableSwapParams.swapMode,
    };
}
exports.toSwapParams = toSwapParams;
//# sourceMappingURL=utils.js.map