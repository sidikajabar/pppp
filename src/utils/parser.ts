import config from '../config';

export interface ParsedPetData {
  name: string;
  symbol: string;
  wallet: `0x${string}`;
  description: string;
  petType: string;
  website?: string;
  twitter?: string;
}

export interface ParseResult {
  success: boolean;
  data?: ParsedPetData;
  errors: string[];
}

export function parsePostContent(content: string): ParseResult {
  const errors: string[] = [];
  
  if (!content.includes('!petpad')) {
    return { success: false, errors: ['Post must contain !petpad'] };
  }
  
  let data: Partial<ParsedPetData> = {};
  
  // Try JSON in code block first
  const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonMatch) {
    try {
      const json = JSON.parse(jsonMatch[1]);
      data = {
        name: json.name,
        symbol: json.symbol?.toUpperCase(),
        wallet: json.wallet as `0x${string}`,
        description: json.description,
        petType: json.petType?.toLowerCase(),
        website: json.website,
        twitter: json.twitter,
      };
    } catch { errors.push('Invalid JSON'); }
  }
  
  // Try raw JSON
  if (!data.name) {
    const rawJson = content.match(/\{[\s\S]*"name"[\s\S]*\}/);
    if (rawJson) {
      try {
        const json = JSON.parse(rawJson[0]);
        data = {
          name: json.name,
          symbol: json.symbol?.toUpperCase(),
          wallet: json.wallet as `0x${string}`,
          description: json.description,
          petType: json.petType?.toLowerCase(),
          website: json.website,
          twitter: json.twitter,
        };
      } catch {}
    }
  }
  
  // Try key:value format
  if (!data.name) {
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        const v = value.trim();
        switch (key.toLowerCase()) {
          case 'name': data.name = v; break;
          case 'symbol': data.symbol = v.toUpperCase(); break;
          case 'wallet': data.wallet = v as `0x${string}`; break;
          case 'description': data.description = v; break;
          case 'pettype': case 'pet_type': case 'type': data.petType = v.toLowerCase(); break;
          case 'website': data.website = v; break;
          case 'twitter': data.twitter = v; break;
        }
      }
    }
  }
  
  // Validate
  if (!data.name) errors.push('name is required');
  else if (data.name.length > 50) errors.push('name max 50 chars');
  
  if (!data.symbol) errors.push('symbol is required');
  else if (data.symbol.length > 10) errors.push('symbol max 10 chars');
  else if (!/^[A-Z0-9]+$/.test(data.symbol)) errors.push('symbol must be uppercase');
  
  if (!data.wallet) errors.push('wallet is required');
  else if (!/^0x[a-fA-F0-9]{40}$/.test(data.wallet)) errors.push('invalid wallet address');
  
  if (!data.description) errors.push('description is required');
  else if (data.description.length > 500) errors.push('description max 500 chars');
  
  if (!data.petType) errors.push('petType is required');
  else if (!config.validPetTypes.includes(data.petType)) {
    errors.push(`petType must be: ${config.validPetTypes.join(', ')}`);
  }
  
  if (data.twitter && !data.twitter.startsWith('@')) {
    data.twitter = '@' + data.twitter.replace(/.*(?:twitter\.com|x\.com)\//, '');
  }
  
  if (errors.length > 0) return { success: false, errors };
  return { success: true, data: data as ParsedPetData, errors: [] };
}
