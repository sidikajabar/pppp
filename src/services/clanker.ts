import { Clanker } from 'clanker-sdk/v4';
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

// Initialize Clanker SDK v4
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

    // Deploy using Clanker SDK v4
    const { txHash, waitForTransaction, error } = await clanker.deploy({
      name: params.name,
      symbol: params.symbol,
      tokenAdmin: account.address,
      image: params.imageUrl,
      metadata: {
        description: `${params.description}\n\n🐾 {LAUNCHED WITH PETPAD}`,
        socialMediaUrls: [],
        auditUrls: [],
      },
      context: {
        interface: 'PetPad',
        platform: 'moltbook',
        messageId: '',
        id: '',
      },
      // v4 rewards format - recipients array
      rewards: {
        recipients: [
          {
            recipient: params.agentWallet,
            admin: params.agentWallet,
            bps: 8000, // 80%
            token: 'Paired',
          },
          {
            recipient: config.platformWallet,
            admin: config.platformWallet,
            bps: 2000, // 20%
            token: 'Paired',
          },
        ],
      },
    });

    if (error) {
      console.error('❌ Deploy error:', error);
      return { success: false, error: String(error) };
    }

    console.log(`📤 TX: ${txHash}`);

    // Wait for transaction and get token address
    const result = await waitForTransaction();
    const tokenAddress = result.address || '';

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
