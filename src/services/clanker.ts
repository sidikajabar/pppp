import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import config from '../config';

const CLANKER_ABI = parseAbi([
  'function deployToken(string name, string symbol, string image, string metadata, address rewardRecipient, uint256 rewardBps) external returns (address)',
]);

const account = config.deployerPrivateKey ? privateKeyToAccount(config.deployerPrivateKey) : null;
const publicClient = createPublicClient({ chain: base, transport: http(config.baseRpcUrl) });
const walletClient = account ? createWalletClient({ account, chain: base, transport: http(config.baseRpcUrl) }) : null;

export interface DeployParams {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  agentWallet: `0x${string}`;
  petType: string;
  website?: string;
  twitter?: string;
}

export interface DeployResult {
  success: boolean;
  tokenAddress?: string;
  txHash?: string;
  clankerUrl?: string;
  explorerUrl?: string;
  error?: string;
}

export async function deployPetToken(params: DeployParams): Promise<DeployResult> {
  if (!walletClient || !account) {
    return { success: false, error: 'Deployer wallet not configured' };
  }

  try {
    const balance = await publicClient.getBalance({ address: account.address });
    if (balance < BigInt(0.001 * 10**18)) {
      return { success: false, error: 'Insufficient ETH for gas' };
    }

    const metadata = JSON.stringify({
      description: `${params.description}\n\n🐾 {LAUNCHED WITH PETPAD}`,
      petType: params.petType,
      website: params.website || '',
      twitter: params.twitter || '',
    });

    console.log(`🚀 Deploying ${params.name} ($${params.symbol})...`);

    const { request } = await publicClient.simulateContract({
      account,
      address: config.clankerFactory,
      abi: CLANKER_ABI,
      functionName: 'deployToken',
      args: [
        params.name,
        params.symbol,
        params.imageUrl,
        metadata,
        params.agentWallet,
        BigInt(config.agentRewardBps),
      ],
    });

    const txHash = await walletClient.writeContract(request);
    console.log(`📤 TX: ${txHash}`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
    
    if (receipt.status === 'reverted') {
      return { success: false, txHash, error: 'Transaction reverted' };
    }

    // Get token address from logs
    const tokenAddress = receipt.logs[0]?.address || '';

    console.log(`✅ Deployed: ${tokenAddress}`);

    return {
      success: true,
      tokenAddress,
      txHash,
      clankerUrl: `https://clanker.world/clanker/${tokenAddress}`,
      explorerUrl: `https://basescan.org/token/${tokenAddress}`,
    };
  } catch (error: any) {
    console.error('❌ Deploy failed:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getDeployerInfo() {
  if (!account) return { configured: false };
  const balance = await publicClient.getBalance({ address: account.address });
  return { configured: true, address: account.address, balance: Number(balance) / 10**18 };
}
