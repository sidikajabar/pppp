export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  databasePath: process.env.DATABASE_PATH || './data/petpad.db',
  baseRpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  chainId: 8453,
  deployerPrivateKey: process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`,
  platformWallet: process.env.PLATFORM_WALLET as `0x${string}`,
  clankerFactory: (process.env.CLANKER_FACTORY || '0x2A787b2362021cC3eEa3C24C4748a6cD5B687382') as `0x${string}`,
  agentRewardBps: 8000,
  platformRewardBps: 2000,
  moltbookApiUrl: 'https://www.moltbook.com/api/v1',
  rateLimitHours: parseInt(process.env.RATE_LIMIT_HOURS || '24'),
  validPetTypes: ['dog', 'cat', 'hamster', 'bunny', 'bird', 'turtle', 'lizard', 'fish'],
  petEmojis: {
    dog: '🐕', cat: '🐈', hamster: '🐹', bunny: '🐰',
    bird: '🦜', turtle: '🐢', lizard: '🦎', fish: '🐠',
  } as Record<string, string>,
  petColors: {
    dog: { primary: '#D4A574', secondary: '#8B6914', accent: '#FF6B9D', eye: '#2D2D2D' },
    cat: { primary: '#9B8AA5', secondary: '#6B5B7A', accent: '#7C4DFF', eye: '#4CAF50' },
    hamster: { primary: '#FFD93D', secondary: '#E5A620', accent: '#FF6B9D', eye: '#2D2D2D' },
    bunny: { primary: '#F5F5F5', secondary: '#E0E0E0', accent: '#FFB6C1', eye: '#E91E63' },
    bird: { primary: '#4FC3F7', secondary: '#0288D1', accent: '#FFD93D', eye: '#2D2D2D' },
    turtle: { primary: '#6BCB77', secondary: '#388E3C', accent: '#8B4513', eye: '#2D2D2D' },
    lizard: { primary: '#9CCC65', secondary: '#7CB342', accent: '#FF5722', eye: '#FF5722' },
    fish: { primary: '#FF8A65', secondary: '#E64A19', accent: '#4FC3F7', eye: '#2D2D2D' },
  } as Record<string, { primary: string; secondary: string; accent: string; eye: string }>,
};

export function validateConfig() {
  const errors: string[] = [];
  if (!config.deployerPrivateKey?.startsWith('0x')) errors.push('DEPLOYER_PRIVATE_KEY required');
  if (!config.platformWallet?.startsWith('0x')) errors.push('PLATFORM_WALLET required');
  if (errors.length > 0) {
    console.error('❌ Config errors:', errors.join(', '));
    process.exit(1);
  }
  console.log('✅ Config validated');
}

export default config;
