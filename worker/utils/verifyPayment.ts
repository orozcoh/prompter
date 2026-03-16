/**
 * On-chain payment verification for x402
 * Verifies USDC transfer transactions on Base network
 */

import { createPublicClient, http, parseAbi, type Hex, decodeEventLog } from 'viem';
import { base, baseSepolia } from 'viem/chains';

// USDC ABI for transfer event parsing
const USDC_ABI = parseAbi([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
]);

// USDC contract addresses
const USDC_CONTRACT_MAINNET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDC_CONTRACT_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

/**
 * Get USDC contract address based on RPC URL
 */
function getUSDCContractAddress(rpcUrl?: string): string {
  if (rpcUrl?.includes('sepolia')) {
    return USDC_CONTRACT_SEPOLIA;
  }
  return USDC_CONTRACT_MAINNET;
}

/**
 * Create public client for Base network (Mainnet or Sepolia)
 */
function createBaseClient(rpcUrl?: string) {
  const url = rpcUrl || 'https://mainnet.base.org';
  const isSepolia = url.includes('sepolia');

  return createPublicClient({
    chain: isSepolia ? baseSepolia : base,
    transport: http(url),
  });
}

export interface PaymentVerificationResult {
  valid: boolean;
  error?: string;
  txHash?: string;
  from?: string;
  to?: string;
  amount?: string;
  confirmations?: number;
}

export interface PaymentVerificationParams {
  txHash: string;
  expectedPayTo: string;
  expectedAmountUsd: string;
  minConfirmations?: number;
}

/**
 * Verify a USDC transfer transaction on Base
 * Includes retry logic to wait for transaction confirmation
 */
export async function verifyPayment(
  txHash: string,
  params: PaymentVerificationParams,
  rpcUrl?: string
): Promise<PaymentVerificationResult> {
  const client = createBaseClient(rpcUrl);
  const usdcContract = getUSDCContractAddress(rpcUrl);

  // Retry logic: wait for transaction to be mined
  const maxRetries = 5;
  const retryDelayMs = 2000; // 2 seconds between retries

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Get transaction receipt
      const receipt = await client.getTransactionReceipt({
        hash: txHash as Hex,
      });

      // Check transaction status
      if (receipt.status !== 'success') {
        return {
          valid: false,
          error: 'Transaction failed on-chain',
          txHash,
        };
      }

      // Get current block number for confirmation count
      const currentBlock = await client.getBlockNumber();
      const confirmations = Number(currentBlock - receipt.blockNumber);

      // Check minimum confirmations
      const minConfirmations = params.minConfirmations || 1;
      if (confirmations < minConfirmations) {
        // If we haven't reached min confirmations but tx is valid, wait and retry
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
          continue;
        }
        return {
          valid: false,
          error: `Insufficient confirmations (${confirmations}/${minConfirmations})`,
          txHash,
          confirmations,
        };
      }

      // Parse transfer events from USDC contract
      let transferFound = false;
      let actualAmount = 0n;
      let actualTo: string | undefined;
      let actualFrom: string | undefined;

      for (const log of receipt.logs) {
        // Only process logs from USDC contract
        if (log.address.toLowerCase() !== usdcContract.toLowerCase()) {
          continue;
        }

        try {
          const decoded = decodeEventLog({
            abi: USDC_ABI,
            data: log.data,
            topics: log.topics,
          });

          if (decoded.eventName === 'Transfer') {
            const args = decoded.args as { from?: string; to?: string; value?: bigint };

            // Check if this transfer is to the expected payment address
            if (args.to?.toLowerCase() === params.expectedPayTo.toLowerCase()) {
              transferFound = true;
              actualAmount = args.value || 0n;
              actualTo = args.to;
              actualFrom = args.from;
              break;
            }
          }
        } catch {
          // Skip logs that can't be decoded
          continue;
        }
      }

      if (!transferFound) {
        return {
          valid: false,
          error: `No USDC transfer found to ${params.expectedPayTo}`,
          txHash,
          confirmations,
        };
      }

      // Verify amount (convert USD to USDC smallest units - 6 decimals for USDC)
      const expectedAmountRaw = BigInt(Math.floor(parseFloat(params.expectedAmountUsd) * 1e6));
      if (actualAmount < expectedAmountRaw) {
        const actualUsd = Number(actualAmount) / 1e6;
        return {
          valid: false,
          error: `Insufficient amount: sent $${actualUsd}, expected $${params.expectedAmountUsd}`,
          txHash,
          from: actualFrom,
          to: actualTo,
          amount: actualUsd.toString(),
          confirmations,
        };
      }

      // Payment verified successfully
      return {
        valid: true,
        txHash,
        from: actualFrom,
        to: actualTo,
        amount: (Number(actualAmount) / 1e6).toString(),
        confirmations,
      };
    } catch (error: any) {
      // Check if it's a transaction not found error (various viem error message formats)
      const notFoundPatterns = [
        'not found',
        'No transaction',
        'could not be found',
        'Unable to find',
        'missing transaction',
      ];
      const isNotFound = notFoundPatterns.some(pattern =>
        error.message?.toLowerCase().includes(pattern.toLowerCase())
      );

      if (isNotFound) {
        // Transaction not mined yet, wait and retry
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
          continue;
        }
        return {
          valid: false,
          error: 'Transaction not found on-chain. It may still be pending.',
          txHash,
        };
      }

      return {
        valid: false,
        error: `Verification failed: ${error.message}`,
        txHash,
      };
    }
  }

  // Should not reach here, but just in case
  return {
    valid: false,
    error: 'Verification timed out',
    txHash,
  };
}

/**
 * Get the number of confirmations for a transaction
 */
export async function getTransactionConfirmations(
  txHash: string,
  rpcUrl?: string
): Promise<number> {
  const client = createBaseClient(rpcUrl);

  try {
    const receipt = await client.getTransactionReceipt({
      hash: txHash as Hex,
    });

    const currentBlock = await client.getBlockNumber();
    return Number(currentBlock - receipt.blockNumber);
  } catch {
    return 0;
  }
}
