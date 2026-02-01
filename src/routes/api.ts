import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import db, { queries } from '../db';
import config from '../config';
import { parsePostContent } from '../utils/parser';
import { deployPetToken, getDeployerInfo } from '../services/clanker';
import { savePixelArt } from '../services/pixelArt';

const api = new Hono();

// Health check
api.get('/health', async (c) => {
  const deployer = await getDeployerInfo();
  return c.json({
    status: 'ok',
    version: '1.0.0',
    deployer: { configured: deployer.configured, address: deployer.address, balance: deployer.balance },
  });
});

// Launch token
api.post('/launch', async (c) => {
  try {
    const { moltbook_key, post_id } = await c.req.json();
    
    if (!moltbook_key) return c.json({ error: 'moltbook_key required' }, 400);
    if (!post_id) return c.json({ error: 'post_id required' }, 400);

    // Fetch post from Moltbook
    const res = await fetch(`${config.moltbookApiUrl}/posts/${post_id}`, {
      headers: { 'Authorization': `Bearer ${moltbook_key}` },
    });
    
    if (!res.ok) {
      if (res.status === 401) return c.json({ error: 'Invalid Moltbook API key' }, 401);
      if (res.status === 404) return c.json({ error: 'Post not found' }, 404);
      return c.json({ error: 'Failed to fetch post' }, 500);
    }

    const postData = await res.json();
    const post = postData.post || postData;
    const content = post.content || post.body || '';

    // Check if already processed
    if (queries.isPostProcessed.get(post_id)) {
      return c.json({ error: 'Post already used for launch' }, 400);
    }

    // Parse content
    const parseResult = parsePostContent(content);
    if (!parseResult.success || !parseResult.data) {
      return c.json({ error: 'Invalid post format', errors: parseResult.errors }, 400);
    }

    const petData = parseResult.data;

    // Check symbol
    if (queries.getLaunchBySymbol.get(petData.symbol)) {
      return c.json({ error: `Ticker ${petData.symbol} already launched` }, 400);
    }

    // Check rate limit
    const agentId = post.author?.id || moltbook_key;
    const agentName = post.author?.username || 'Unknown';
    const rateLimit = queries.getRateLimit.get(agentId) as any;
    
    if (rateLimit) {
      const hours = (Date.now() - new Date(rateLimit.last_launch_at).getTime()) / 3600000;
      if (hours < config.rateLimitHours) {
        return c.json({ error: `Rate limit: wait ${Math.ceil(config.rateLimitHours - hours)}h` }, 429);
      }
    }

    // Generate pixel art
    const launchId = nanoid();
    const { url: imageUrl } = savePixelArt(petData.petType, launchId);
    const fullImageUrl = `https://petpad.xyz${imageUrl}`; // Update with your domain

    // Create record
    const postUrl = `https://www.moltbook.com/post/${post_id}`;
    queries.createLaunch.run(
      launchId, petData.symbol, petData.name, petData.description, petData.petType,
      fullImageUrl, agentName, petData.wallet, post_id, postUrl,
      petData.website || null, petData.twitter || null
    );

    // Deploy token
    const result = await deployPetToken({
      name: petData.name,
      symbol: petData.symbol,
      description: `${petData.description}\n\n🐾 {LAUNCHED WITH PETPAD}`,
      imageUrl: fullImageUrl,
      agentWallet: petData.wallet,
      petType: petData.petType,
      website: petData.website,
      twitter: petData.twitter,
    });

    if (!result.success) {
      queries.updateLaunchFailed.run(result.error || 'Unknown', launchId);
      queries.markPostProcessed.run(post_id, 'failed');
      return c.json({ error: 'Deploy failed', details: result.error }, 500);
    }

    // Update records
    queries.updateLaunchDeployed.run(result.tokenAddress, result.txHash, result.clankerUrl, launchId);
    queries.upsertRateLimit.run(agentId, agentName);
    queries.markPostProcessed.run(post_id, 'processed');

    return c.json({
      success: true,
      agent: agentName,
      post_id,
      post_url: postUrl,
      pet: {
        name: petData.name,
        symbol: petData.symbol,
        type: petData.petType,
        emoji: config.petEmojis[petData.petType],
      },
      image: { url: fullImageUrl, style: 'pixel', generated: true },
      token_address: result.tokenAddress,
      tx_hash: result.txHash,
      clanker_url: result.clankerUrl,
      explorer_url: result.explorerUrl,
      rewards: { agent_share: '80%', platform_share: '20%', agent_wallet: petData.wallet },
    });
  } catch (error: any) {
    console.error('Launch error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// List tokens
api.get('/tokens', (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const offset = parseInt(c.req.query('offset') || '0');
  const tokens = queries.getAllLaunches.all(limit, offset) as any[];
  const { count } = queries.countLaunches.get() as any;

  return c.json({
    success: true,
    tokens: tokens.map(t => ({
      symbol: t.symbol,
      name: t.name,
      petType: t.pet_type,
      emoji: config.petEmojis[t.pet_type],
      image: t.image_url,
      contractAddress: t.contract_address,
      clankerUrl: t.clanker_url,
      launchedAt: t.launched_at,
    })),
    pagination: { limit, offset, total: count, hasMore: offset + tokens.length < count },
  });
});

// Launch history
api.get('/launches', (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const offset = parseInt(c.req.query('offset') || '0');
  const petType = c.req.query('petType');
  const address = c.req.query('address');

  let tokens: any[];
  if (address) {
    const t = queries.getLaunchByContract.get(address);
    tokens = t ? [t] : [];
  } else if (petType) {
    tokens = queries.getLaunchesByPetType.all(petType, limit, offset) as any[];
  } else {
    tokens = queries.getAllLaunches.all(limit, offset) as any[];
  }

  const { count } = queries.countLaunches.get() as any;

  return c.json({
    success: true,
    launches: tokens.map(t => ({
      id: t.id,
      symbol: t.symbol,
      name: t.name,
      description: t.description,
      petType: t.pet_type,
      emoji: config.petEmojis[t.pet_type],
      image: t.image_url,
      agentName: t.agent_name,
      agentWallet: t.agent_wallet,
      postId: t.post_id,
      postUrl: t.post_url,
      website: t.website,
      twitter: t.twitter,
      contractAddress: t.contract_address,
      txHash: t.tx_hash,
      clankerUrl: t.clanker_url,
      launchedAt: t.launched_at,
    })),
    pagination: { limit, offset, total: count, hasMore: offset + tokens.length < count },
  });
});

// Stats
api.get('/stats', (c) => {
  const { count } = queries.countLaunches.get() as any;
  const byType = db.prepare(`SELECT pet_type, COUNT(*) as count FROM launches WHERE status='deployed' GROUP BY pet_type ORDER BY count DESC`).all() as any[];

  return c.json({
    success: true,
    stats: { totalLaunches: count },
    petTypes: byType.map(p => ({ type: p.pet_type, emoji: config.petEmojis[p.pet_type], count: p.count })),
  });
});

export default api;
