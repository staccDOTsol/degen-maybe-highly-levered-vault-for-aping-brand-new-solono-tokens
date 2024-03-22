import JSBI from "jsbi";

import {
  Quote,
  QuoteParams,
  SwapParams,
} from "@jup-ag/core/dist/lib/amm.js";
import {
  AccountInfo,
  AccountMeta,
  PublicKey,
} from "@solana/web3.js";

import {
  SerializableAccountInfo,
  SerializableAccountMeta,
  SerializableJupiterQuote,
  SerializableQuoteParams,
  SerializableSwapParams,
} from "./types.js";

function toPairString(mintA: string, mintB: string): string {
  if (mintA < mintB) {
    return `${mintA}-${mintB}`;
  } else {
    return `${mintB}-${mintA}`;
  }
}

function toSerializableAccountInfo(
  accountInfo: AccountInfo<Buffer>,
): SerializableAccountInfo {
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

function toAccountInfo(
  accountInfo: SerializableAccountInfo,
): AccountInfo<Buffer> {
  return {
    data: Buffer.from(accountInfo.data),
    executable: accountInfo.executable,
    lamports: accountInfo.lamports,
    owner: new PublicKey(accountInfo.owner),
    rentEpoch: accountInfo.rentEpoch,
  };
}

function toSerializableJupiterQuote(quote: Quote): SerializableJupiterQuote {
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

function toJupiterQuote(serializableQuote: SerializableJupiterQuote): Quote {
  return {
    notEnoughLiquidity: serializableQuote.notEnoughLiquidity,
    minInAmount: serializableQuote.minInAmount
      ? JSBI.BigInt(serializableQuote.minInAmount)
      : undefined,
    minOutAmount: serializableQuote.minOutAmount
      ? JSBI.BigInt(serializableQuote.minOutAmount)
      : undefined,
    inAmount: JSBI.BigInt(serializableQuote.inAmount),
    outAmount: JSBI.BigInt(serializableQuote.outAmount),
    feeAmount: JSBI.BigInt(serializableQuote.feeAmount),
    feeMint: serializableQuote.feeMint,
    feePct: serializableQuote.feePct,
    priceImpactPct: serializableQuote.priceImpactPct,
  };
}

function toSerializableQuoteParams(
  quoteParams: QuoteParams,
): SerializableQuoteParams {
  return {
    sourceMint: quoteParams.sourceMint.toBase58(),
    destinationMint: quoteParams.destinationMint.toBase58(),
    amount: quoteParams.amount.toString(),
    swapMode: quoteParams.swapMode,
  };
}

function toQuoteParams(
  serializableQuoteParams: SerializableQuoteParams,
): QuoteParams {
  return {
    sourceMint: new PublicKey(serializableQuoteParams.sourceMint),
    destinationMint: new PublicKey(serializableQuoteParams.destinationMint),
    amount: JSBI.BigInt(serializableQuoteParams.amount),
    swapMode: serializableQuoteParams.swapMode,
  };
}

export function toSerializableAccountMeta(
  meta: AccountMeta,
): SerializableAccountMeta {
  return {
    pubkey: meta.pubkey.toBase58(),
    isSigner: meta.isSigner,
    isWritable: meta.isWritable,
  };
}

export function toAccountMeta(
  serializableMeta: SerializableAccountMeta,
): AccountMeta {
  return {
    pubkey: new PublicKey(serializableMeta.pubkey),
    isSigner: serializableMeta.isSigner,
    isWritable: serializableMeta.isWritable,
  };
}

function toSerializableSwapParams(
  swapParams: SwapParams,
): SerializableSwapParams {
  return {
    sourceMint: swapParams.sourceMint.toBase58(),
    destinationMint: swapParams.destinationMint.toBase58(),
    userSourceTokenAccount: swapParams.userSourceTokenAccount.toBase58(),
    userDestinationTokenAccount:
      swapParams.userDestinationTokenAccount.toBase58(),
    userTransferAuthority: swapParams.userTransferAuthority.toBase58(),
    amount: swapParams.amount.toString(),
    swapMode: swapParams.swapMode,
  };
}

function toSwapParams(
  serializableSwapParams: SerializableSwapParams,
): SwapParams {
  return {
    sourceMint: new PublicKey(serializableSwapParams.sourceMint),
    destinationMint: new PublicKey(serializableSwapParams.destinationMint),
    userSourceTokenAccount: new PublicKey(
      serializableSwapParams.userSourceTokenAccount,
    ),
    userDestinationTokenAccount: new PublicKey(
      serializableSwapParams.userDestinationTokenAccount,
    ),
    userTransferAuthority: new PublicKey(
      serializableSwapParams.userTransferAuthority,
    ),
    amount: JSBI.BigInt(serializableSwapParams.amount),
    swapMode: serializableSwapParams.swapMode,
  };
}

export {
  toAccountInfo,
  toJupiterQuote,
  toPairString,
  toQuoteParams,
  toSerializableAccountInfo,
  toSerializableJupiterQuote,
  toSerializableQuoteParams,
  toSerializableSwapParams,
  toSwapParams,
};
