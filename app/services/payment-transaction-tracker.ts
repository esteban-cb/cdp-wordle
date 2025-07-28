/**
 * Real X402 Payment Transaction Tracker
 * This service tracks and verifies real blockchain transactions for X402 payments
 */

import { NetworkConfig } from "../types/wordle";

export interface RealPaymentTransaction {
  txHash: string;
  networkId: string;
  blockNumber?: number;
  timestamp: string;
  amount: string;
  asset: string;
  from: string;
  to: string;
  status: 'pending' | 'confirmed' | 'failed';
  x402PaymentId: string;
  gasUsed?: string;
  gasPrice?: string;
  explorerUrl: string;
}

export interface PaymentVerificationResult {
  isReal: boolean;
  transactionHash?: string;
  blockExplorerUrl?: string;
  confirmations?: number;
  gasUsed?: string;
  timestamp?: string;
  error?: string;
}

/**
 * Track a real X402 payment transaction
 */
export async function trackRealPayment(
  txHash: string,
  network: NetworkConfig,
  paymentDetails: {
    amount: string;
    from: string;
    to: string;
    x402PaymentId: string;
  }
): Promise<RealPaymentTransaction> {
  const explorerUrl = getBlockExplorerUrl(txHash, network);
  
  const transaction: RealPaymentTransaction = {
    txHash,
    networkId: network.id,
    timestamp: new Date().toISOString(),
    amount: paymentDetails.amount,
    asset: 'USDC',
    from: paymentDetails.from,
    to: paymentDetails.to,
    status: 'pending',
    x402PaymentId: paymentDetails.x402PaymentId,
    explorerUrl
  };

  console.log('🔗 Real X402 Payment Transaction Tracked:', {
    txHash,
    network: network.name,
    explorerUrl,
    amount: `${paymentDetails.amount} USDC`,
    isTestnet: network.isTestnet
  });

  return transaction;
}

/**
 * Verify that a payment transaction is real and confirmed on-chain
 */
export async function verifyRealPayment(
  txHash: string,
  network: NetworkConfig
): Promise<PaymentVerificationResult> {
  try {
    console.log(`🔍 Verifying real payment transaction: ${txHash}`);
    console.log(`🌐 Network: ${network.name} (${network.isTestnet ? 'Testnet' : 'Mainnet'})`);

    // Make RPC call to verify transaction exists on blockchain
    const rpcCall = {
      jsonrpc: '2.0',
      method: 'eth_getTransactionByHash',
      params: [txHash],
      id: 1
    };

    const response = await fetch(network.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rpcCall)
    });

    const data = await response.json();
    
    if (data.result) {
      // Transaction exists on blockchain - it's real!
      const tx = data.result;
      const blockExplorerUrl = getBlockExplorerUrl(txHash, network);
      
      // Get transaction receipt for confirmation status
      const receiptCall = {
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
        id: 2
      };

      const receiptResponse = await fetch(network.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(receiptCall)
      });

      const receiptData = await receiptResponse.json();
      const receipt = receiptData.result;

      const confirmations = receipt ? parseInt(receipt.blockNumber, 16) : 0;
      const gasUsed = receipt ? parseInt(receipt.gasUsed, 16).toString() : undefined;

      console.log('✅ Real payment verified on blockchain:', {
        txHash,
        blockNumber: tx.blockNumber,
        gasUsed,
        confirmed: !!receipt,
        explorerUrl: blockExplorerUrl
      });

      return {
        isReal: true,
        transactionHash: txHash,
        blockExplorerUrl,
        confirmations,
        gasUsed,
        timestamp: new Date().toISOString()
      };
    } else {
      console.log('❌ Transaction not found on blockchain - may still be pending');
      return {
        isReal: false,
        error: 'Transaction not found on blockchain'
      };
    }
  } catch (error) {
    console.error('❌ Error verifying real payment:', error);
    return {
      isReal: false,
      error: error instanceof Error ? error.message : 'Unknown verification error'
    };
  }
}

/**
 * Get block explorer URL for transaction
 */
function getBlockExplorerUrl(txHash: string, network: NetworkConfig): string {
  return `${network.blockExplorer}/tx/${txHash}`;
}

/**
 * Generate a unique X402 payment ID for tracking
 */
export function generateX402PaymentId(): string {
  return `x402-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log real payment details for transparency
 */
export function logRealPaymentDetails(
  transaction: RealPaymentTransaction,
  verification?: PaymentVerificationResult
) {
  console.log('\n📋 REAL X402 PAYMENT SUMMARY:');
  console.log('=====================================');
  console.log(`💳 Transaction Hash: ${transaction.txHash}`);
  console.log(`🌐 Network: ${transaction.networkId} ${transaction.networkId.includes('sepolia') ? '(Testnet)' : '(Mainnet)'}`);
  console.log(`💰 Amount: ${transaction.amount} USDC`);
  console.log(`👤 From: ${transaction.from}`);
  console.log(`🏪 To: ${transaction.to}`);
  console.log(`⏰ Timestamp: ${transaction.timestamp}`);
  console.log(`🔗 Explorer: ${transaction.explorerUrl}`);
  console.log(`🆔 X402 ID: ${transaction.x402PaymentId}`);
  
  if (verification) {
    console.log(`✅ Verified: ${verification.isReal ? 'YES - Real blockchain transaction' : 'NO - Not found on blockchain'}`);
    if (verification.confirmations) {
      console.log(`⛏️ Confirmations: ${verification.confirmations}`);
    }
    if (verification.gasUsed) {
      console.log(`⛽ Gas Used: ${verification.gasUsed}`);
    }
  }
  
  console.log('=====================================\n');
}

/**
 * Create a payment proof object for real X402 transactions
 */
export interface RealPaymentProof {
  isRealPayment: true;
  protocolVersion: 'x402-v1';
  transactionHash: string;
  network: string;
  amount: string;
  asset: 'USDC';
  blockExplorerUrl: string;
  timestamp: string;
  verificationStatus: 'confirmed' | 'pending' | 'failed';
}

export function createRealPaymentProof(
  transaction: RealPaymentTransaction,
  verification: PaymentVerificationResult
): RealPaymentProof {
  return {
    isRealPayment: true,
    protocolVersion: 'x402-v1',
    transactionHash: transaction.txHash,
    network: transaction.networkId,
    amount: transaction.amount,
    asset: 'USDC',
    blockExplorerUrl: transaction.explorerUrl,
    timestamp: transaction.timestamp,
    verificationStatus: verification.isReal ? 'confirmed' : 'pending'
  };
} 