import { toAccount } from "viem/accounts";
import { getTypesForEIP712Domain, type Address, type Hash, type LocalAccount, type TypedDataDomain } from "viem";
import { 
  getCurrentUser,
  signEvmMessage,
  signEvmTransaction,
  signEvmTypedData,
  type AllowedEvmTransactionType,
  type EIP712TypedData,
  type EIP712Domain,
  type EIP712Types,
  type EIP712Message
} from "@coinbase/cdp-core";

/**
 * Creates a Viem LocalAccount interface wrapper around CDP Core embedded wallet
 * This allows the embedded wallet to work seamlessly with X402 payment framework
 */
export async function getViemAccount(): Promise<LocalAccount> {
  const user = await getCurrentUser();
  if (!user || !user.evmAccounts || user.evmAccounts.length === 0) {
    throw new Error("No CDP user or EVM accounts found");
  }

  const address = user.evmAccounts[0] as Address;

  return toAccount({
    address,
    async signMessage({ message }) {
      console.log("🔍 Viem account signMessage() called with:", message);
      
      let messageStr: string;
      if (typeof message === 'string') {
        messageStr = message;
      } else if (message instanceof Uint8Array) {
        messageStr = new TextDecoder().decode(message);
      } else if ('raw' in message) {
        messageStr = typeof message.raw === 'string' ? message.raw : new TextDecoder().decode(message.raw);
      } else {
        console.error("❌ Unsupported message format in signMessage():", message);
        throw new Error('Unsupported message format');
      }
      
      console.log("🔐 Signing message string with CDP Core:", messageStr);
        
      const result = await signEvmMessage({
        evmAccount: address,
        message: messageStr,
      });
      
      console.log("✅ CDP Core signMessage result:", result.signature);
      return result.signature as Hash;
    },
    async signTransaction(transaction) {
      const cdpTransaction = {
        to: transaction.to ?? null,
        value: transaction.value?.toString() ?? "0",
        data: transaction.data ?? "0x",
        nonce: transaction.nonce ?? 0,
        gas: transaction.gas?.toString() ?? "0",
        maxFeePerGas: transaction.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: transaction.maxPriorityFeePerGas?.toString(),
      } as unknown as AllowedEvmTransactionType;

      const result = await signEvmTransaction({
        evmAccount: address,
        transaction: cdpTransaction,
      });
      
      return result.signedTransaction as Hash;
    },
    async signTypedData(params) {
      console.log("🔍 Viem account signTypedData() called with:", params);
      
      const typedData: EIP712TypedData = {
          domain: params.domain as EIP712Domain,
          types: {
            EIP712Domain: getTypesForEIP712Domain({
                domain: params.domain as TypedDataDomain
            }),
            ...(params.types as EIP712Types),
          },
          primaryType: params.primaryType as string,
          message: params.message as EIP712Message,
      }

      console.log("🔐 Signing typed data with CDP Core:", typedData);

      const result = await signEvmTypedData({
        evmAccount: address,
        typedData,
      });
      
      console.log("✅ CDP Core signTypedData result:", result.signature);
      return result.signature as Hash;
    },
    async sign(message) {
      console.log("🔍 Viem account sign() called with:", message);
      
      // The X402 interceptor might call this with different message formats
      let messageToSign: string;
      
      if (typeof message === 'string') {
        messageToSign = message;
      } else if (message && typeof message.hash === 'string') {
        // If message has a hash property, use it as a hex string
        messageToSign = message.hash;
      } else if (message && (message as any).raw) {
        // If message has raw bytes, convert to hex string
        const rawBytes = (message as any).raw instanceof Uint8Array ? (message as any).raw : new Uint8Array((message as any).raw);
        messageToSign = '0x' + Array.from(rawBytes).map((b: any) => b.toString(16).padStart(2, '0')).join('');
      } else {
        console.error("❌ Unsupported message format in sign():", message);
        throw new Error('Unsupported message format in sign method');
      }
      
      console.log("🔐 Signing message with CDP Core:", messageToSign);
      
      const result = await signEvmMessage({
        evmAccount: address,
        message: messageToSign,
      });
      
      console.log("✅ CDP Core signature result:", result.signature);
      return result.signature as Hash;
    }
  }) as LocalAccount;
}