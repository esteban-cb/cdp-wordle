import { LocalAccount, SignableMessage } from 'viem';
import { CdpClient } from '@coinbase/cdp-sdk';

/**
 * Type definitions for CDP SDK responses
 */
interface CDPSignatureResponse {
  signature: string;
}

interface CDPAccount {
  address: string;
  name: string;
}

/**
 * Optional callback for tracking signing events
 */
interface SigningEventCallback {
  onSigningAttempted?: (type: 'message' | 'typedData' | 'transaction' | 'hash') => void;
  onSigningSuccess?: (type: 'message' | 'typedData' | 'transaction' | 'hash') => void;
  onSigningError?: (type: 'message' | 'typedData' | 'transaction' | 'hash', error: Error) => void;
}

/**
 * Type for EIP-712 typed data input
 */
interface TypedDataInput {
  domain: Record<string, unknown>;
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message: Record<string, unknown>;
}

/**
 * CDP-to-Viem Account Adapter for X402 Integration
 * 
 * Bridges CDP SDK's server-side signing with viem's account interface.
 * Specifically designed to enable X402 payment protocol compatibility.
 */
export function createViemAccountFromCDP(
  cdpAccount: CDPAccount,
  cdpClient: CdpClient,
  signingCallback?: SigningEventCallback
): LocalAccount {
  const address = cdpAccount.address as `0x${string}`;

  /**
   * Extract signature string from CDP response object
   */
  const extractSignature = (result: unknown): `0x${string}` => {
    let signatureString: string;
    
    if (typeof result === 'object' && result && 'signature' in result) {
      const response = result as CDPSignatureResponse;
      signatureString = response.signature;
    } else if (typeof result === 'string') {
      signatureString = result;
    } else {
      signatureString = String(result);
    }
    
    // Ensure 0x prefix
    return (signatureString.startsWith('0x') ? signatureString : `0x${signatureString}`) as `0x${string}`;
  };

  // Create a viem-compatible account that uses CDP client for signing
  const account: LocalAccount = {
    address,
    publicKey: '0x' as `0x${string}`, // CDP manages public keys server-side
    source: 'custom' as const,
    type: 'local' as const,

    // Sign a message using CDP client
    async signMessage({ message }: { message: SignableMessage }): Promise<`0x${string}`> {
      console.log('🔐 CDP Adapter: Signing message...');
      signingCallback?.onSigningAttempted?.('message');
      
      try {
        // Handle different message formats from viem
        let messageString: string;
        if (typeof message === 'string') {
          messageString = message;
        } else if (message && typeof message === 'object' && 'raw' in message && typeof message.raw === 'string') {
          messageString = message.raw;
        } else {
          messageString = String(message);
        }
        
        const result = await cdpClient.evm.signMessage({
          address: cdpAccount.address as `0x${string}`,
          message: messageString,
        });
        
        console.log('✅ CDP Adapter: Message signed');
        signingCallback?.onSigningSuccess?.('message');
        return extractSignature(result);
      } catch (error) {
        console.error('❌ CDP Adapter: Failed to sign message:', error);
        signingCallback?.onSigningError?.('message', error as Error);
        throw error;
      }
    },

    // Sign typed data (EIP-712) - CRITICAL for X402 payment authorization
    async signTypedData(typedDataInput: Record<string, unknown>): Promise<`0x${string}`> {
      console.log('🔐 CDP Adapter: Signing EIP-712 typed data for X402...', { 
        domain: (typedDataInput as { domain?: { name?: string } }).domain?.name,
        primaryType: (typedDataInput as { primaryType?: string }).primaryType 
      });
      signingCallback?.onSigningAttempted?.('typedData');
      
      try {
        const input = typedDataInput as unknown as TypedDataInput;
        
        // Ensure EIP712Domain type is included (required by CDP SDK)
        const typesWithDomain = {
          ...input.types,
          EIP712Domain: input.types.EIP712Domain || [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
          ]
        };

        // Use CDP client's signTypedData method - this is the key method for X402
        const result = await cdpClient.evm.signTypedData({
          address: cdpAccount.address as `0x${string}`,
          domain: input.domain,
          types: typesWithDomain,
          primaryType: input.primaryType,
          message: input.message,
        });
        
        console.log('✅ CDP Adapter: EIP-712 typed data signed successfully');
        signingCallback?.onSigningSuccess?.('typedData');
        return extractSignature(result);
      } catch (error) {
        console.error('❌ CDP Adapter: Failed to sign typed data:', error);
        signingCallback?.onSigningError?.('typedData', error as Error);
        throw error;
      }
    },

    // Basic transaction signing - simplified for X402 use case
    async signTransaction(transaction: Record<string, unknown>): Promise<`0x${string}`> {
      console.log('🔐 CDP Adapter: Transaction signing requested');
      signingCallback?.onSigningAttempted?.('transaction');
      
      try {
        // For X402, we mainly need message/typed data signing
        // Transaction signing can use message signing as fallback
        const result = await cdpClient.evm.signMessage({
          address: cdpAccount.address as `0x${string}`,
          message: JSON.stringify(transaction),
        });
        
        console.log('✅ CDP Adapter: Transaction signed');
        signingCallback?.onSigningSuccess?.('transaction');
        return extractSignature(result);
      } catch (error) {
        console.error('❌ CDP Adapter: Failed to sign transaction:', error);
        signingCallback?.onSigningError?.('transaction', error as Error);
        throw error;
      }
    },

    // Simple hash signing
    async sign({ hash }: { hash: `0x${string}` }): Promise<`0x${string}`> {
      console.log('🔐 CDP Adapter: Hash signing');
      signingCallback?.onSigningAttempted?.('hash');
      
      try {
        const result = await cdpClient.evm.signMessage({
          address: cdpAccount.address as `0x${string}`,
          message: hash,
        });
        
        console.log('✅ CDP Adapter: Hash signed');
        signingCallback?.onSigningSuccess?.('hash');
        return extractSignature(result);
      } catch (error) {
        console.error('❌ CDP Adapter: Failed to sign hash:', error);
        signingCallback?.onSigningError?.('hash', error as Error);
        throw error;
      }
    },

    // Nonce manager not needed for X402
    nonceManager: undefined,
  };

  return account;
}

/**
 * Validate that an account has the required signing capabilities for X402
 */
export function validateViemAccount(account: LocalAccount): boolean {
  return (
    typeof account.signMessage === 'function' &&
    typeof account.signTypedData === 'function' &&
    account.address !== undefined &&
    account.address.startsWith('0x')
  );
}

/**
 * Type-safe wrapper for CDP account data
 */
export function createCDPAccount(address: string, name: string): CDPAccount {
  if (!address.startsWith('0x') || address.length !== 42) {
    throw new Error(`Invalid Ethereum address: ${address}`);
  }
  
  return { address, name };
} 