import { Clanker } from 'clanker-sdk';
import { createPublicClient, createWalletClient, http, type PublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import config from '../config';

const account = config.deployerPrivateKey ? privateKeyToAccount(config.deployerPrivateKey) : null;

const publicClient = createPublicClient({
  chain: base,
  transport: http(config.baseRpcUrl),
}) as PublicClient;

const walletClient = account ? createWalletClient({
  account,
  chain: base,
  transport: http(config.baseRpcUrl),
}) : null;

// Initialize Clanker SDK
const clanker = (account && walletClient) ? new Clanker({
  publicClient,
  wallet: walletClient,
}) : null;

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
  if (!clanker || !account) {
    return { success: false, error: 'Deployer wallet not configured' };
  }

  try {
    const balance = await publicClient.getBalance({ address: account.address });
    if (balance < BigInt(0.001 * 10**18)) {
      return { success: false, error: 'Insufficient ETH for gas' };
    }

    console.log(`🚀 Deploying ${params.name} ($${params.symbol}) via Clanker SDK v4...`);

    // Deploy using Clanker SDK
    const tokenAddress = await clanker.deployToken({
      name: params.name,
      symbol: params.symbol,
      image: params.imageUrl,
      metadata: {
        description: params.description,
        socialMediaUrls: [
          params.website ? { platform: 'website', url: params.website } : null,
          params.twitter ? { platform: 'x', url: `https://twitter.com/${params.twitter.replace('@', '')}` } : null,
        ].filter(Boolean) as { platform: string; url: string }[],
        auditUrls: [],
      },
      context: {
        interface: 'PetPad',
        platform: 'moltbook',
        messageId: '',
        id: '',
      },
      rewardsConfig: {
        creatorReward: 80, // 80% to agent
        creatorAdmin: params.agentWallet,
        creatorRewardRecipient: params.agentWallet,
        interfaceAdmin: config.platformWallet,
        interfaceRewardRecipient: config.platformWallet,
      },
    });

    console.log(`✅ Deployed: ${tokenAddress}`);

    return {
      success: true,
      tokenAddress,
      txHash: '',
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
