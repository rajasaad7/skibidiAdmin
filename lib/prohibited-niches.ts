// Prohibited-niche screen for marketplace domains (moderation signal, never an auto-reject).
//
// Two layers feed `domains."prohibitedNiche"`:
//   1. this deterministic keyword screen (domain name / category / page text), run at
//      single add, bulk upload and by the admin categorizer
//   2. the AI detectors (App detect-metadata, skibidiAdmin categorization-service) which
//      answer with one of the ids below or "none"
// The admin domains page marks flagged rows red and offers a "Prohibited" filter so a
// moderator can reject them. Mirror of skibidiAdmin lib/prohibited-niches.ts: keep both
// files in sync when tuning the list.

export interface ProhibitedNicheDef {
  id: string;
  label: string;
  strong: string[];
  weak: string[];
  domain: string[];
  domainBoundary?: string[];
}

export interface ProhibitedNicheVerdict {
  id: string;
  label: string;
  reason: string;
  matches: string[];
  source?: string;
}

export const PROHIBITED_NICHES: ProhibitedNicheDef[] = [
  {
    id: 'gambling',
    label: 'Gambling & Betting',
    // strong: one hit anywhere is enough; weak: needs 2+ distinct hits in page text
    strong: ['casino', 'casinos', 'sportsbook', 'sportsbooks', 'bookmaker', 'bookmakers', 'online betting', 'sports betting', 'slot machine', 'slot machines', 'slot gacor', 'judi online', 'togel', 'gambling', 'igaming', 'i-gaming', 'online casino', 'crypto casino', 'esports betting'],
    weak: ['betting', 'poker', 'slots', 'roulette', 'blackjack', 'baccarat', 'jackpot', 'wager', 'wagering', 'gamble', 'bingo', 'lottery', 'bet365', 'parlay', 'odds'],
    domain: ['casino', 'sportsbook', 'bookmaker', 'gambl', 'poker', 'slots', 'roulette', 'blackjack', 'jackpot', 'togel', 'bingo', 'wager', 'betting', 'igaming'],
    domainBoundary: ['judi'], // judiciary must not match
  },
  {
    id: 'adult',
    label: 'Adult Content',
    strong: ['porn', 'pornography', 'xxx', 'escort service', 'escort services', 'escorts', 'hentai', 'camgirl', 'camgirls', 'onlyfans', 'sex toys', 'sex toy', 'adult dating', 'adult entertainment', 'bdsm', 'milf', 'fetish'],
    weak: ['escort', 'nude', 'nudes', 'erotic', 'erotica', 'hookup', 'hookups', 'strip club', 'sexy', 'nsfw', 'webcam'],
    domain: ['porn', 'xxx', 'escort', 'nude', 'hentai', 'milf', 'fetish', 'bdsm', 'erotic', 'camgirl', 'onlyfans', 'hookup'],
    domainBoundary: ['sex'], // only as a whole label / at a label boundary (sussex, essex, unisex must not match)
  },
  {
    id: 'cbd_cannabis',
    label: 'CBD & Cannabis',
    strong: ['cbd', 'cannabis', 'marijuana', 'dispensary', 'dispensaries', 'cannabinoid', 'cannabinoids', 'delta-8', 'delta 8', 'thc', 'kush', 'weed strain', 'weed strains'],
    weak: ['weed', 'hemp', '420', 'edibles', 'vape pen', 'bong', 'bongs', 'stoner', 'sativa', 'indica'],
    domain: ['cbd', 'cannabis', 'marijuana', 'dispensar', 'kush', 'cannabinoid', 'ganja'],
    domainBoundary: ['weed', 'thc', 'hemp'], // tweed/seaweed, healthcare, ... must not match
  },
  {
    id: 'alcohol',
    label: 'Alcohol',
    strong: ['craft beer', 'brewery', 'breweries', 'brewing company', 'winery', 'wineries', 'vineyard', 'vineyards', 'distillery', 'distilleries', 'liquor', 'liquor store', 'vodka', 'whisky', 'whiskey', 'bourbon', 'tequila', 'mezcal', 'sommelier', 'homebrew', 'homebrewing', 'beer blog', 'beer news', 'cocktail recipes', 'booze', 'adult beverage', 'adult beverages'],
    weak: ['beer', 'beers', 'wine', 'wines', 'cocktail', 'cocktails', 'spirits', 'drinking', 'brew', 'brews', 'ale', 'ipa', 'lager', 'cider', 'champagne', 'prosecco', 'rum', 'gin', 'taproom', 'pub crawl', 'happy hour', 'bartender', 'mixology'],
    domain: ['beer', 'brewer', 'brewing', 'winery', 'vineyard', 'vodka', 'whisk', 'bourbon', 'tequila', 'liquor', 'distill', 'cocktail', 'booze', 'drinking', 'sommelier', 'champagne', 'mezcal', 'taproom', 'homebrew'],
    domainBoundary: ['brew', 'wine', 'cider', 'ale', 'ipa', 'lager', 'spirits'], // hebrew, twine/swine, decider, sale, ... must not match
  },
  {
    id: 'vaping_tobacco',
    label: 'Vaping & Tobacco',
    strong: ['vape', 'vapes', 'vaping', 'e-cigarette', 'e-cigarettes', 'ecig', 'e-cig', 'e-liquid', 'eliquid', 'ejuice', 'e-juice', 'tobacco', 'cigar', 'cigars', 'cigarette', 'cigarettes', 'hookah', 'shisha', 'nicotine pouches', 'snus'],
    weak: ['nicotine', 'vapor', 'vaporizer', 'smoke shop', 'smokeshop', 'pod system'],
    domain: ['vape', 'vaping', 'ecig', 'eliquid', 'ejuice', 'cigar', 'tobacco', 'hookah', 'shisha', 'nicotine', 'smokeshop'],
  },
  {
    id: 'pharma',
    label: 'Pharmacy & Drugs',
    strong: ['online pharmacy', 'viagra', 'cialis', 'kamagra', 'anabolic steroids', 'buy steroids', 'modafinil', 'tramadol', 'xanax', 'adderall', 'phentermine', 'sarms', 'no prescription', 'without prescription', 'buy pills'],
    weak: ['steroids', 'steroid', 'pharmacy', 'prescription drugs', 'erectile', 'hgh', 'peptides', 'weight loss pills', 'diet pills'],
    domain: ['viagra', 'kamagra', 'steroid', 'anabolic', 'modafinil', 'xanax', 'adderall', 'sarms', 'pharmacy'],
    domainBoundary: ['cialis'], // specialists must not match
  },
  {
    id: 'weapons',
    label: 'Weapons & Firearms',
    strong: ['firearms', 'firearm', 'ammunition', 'gun shop', 'gun store', 'gun dealer', 'handgun', 'handguns', 'ar-15', 'ar15', 'glock', 'shotguns', 'rifles for sale', 'guns for sale'],
    weak: ['ammo', 'rifle', 'rifles', 'pistol', 'pistols', 'shotgun', 'guns', 'tactical gear', 'concealed carry', 'airsoft', 'crossbow'],
    domain: ['firearm', 'ammo', 'handgun', 'shotgun', 'glock', 'gunshop', 'gunstore', 'rifle', 'pistol'],
    domainBoundary: ['guns', 'gun'],
  },
];

export const PROHIBITED_NICHE_IDS = PROHIBITED_NICHES.map(n => n.id);

export function prohibitedNicheLabel(id: string | null | undefined): string | null {
  return PROHIBITED_NICHES.find(n => n.id === id)?.label || null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function phraseRe(phrase: string): RegExp {
  // word-boundary match, tolerant to spaces/hyphens inside multi-word phrases
  const body = phrase.trim().split(/\s+/).map(escapeRe).join('[\\s-]+');
  return new RegExp(`(^|[^a-z0-9])${body}(?=$|[^a-z0-9])`, 'i');
}

function hostOf(domainName: string | null | undefined): string {
  return String(domainName || '').toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0].replace(/^www\./, '');
}

/** Labels of the host without the TLD ("mybeerbuzz.com" -> ["mybeerbuzz"]). */
function hostLabels(host: string): string[] {
  const labels = host.split('.').filter(Boolean);
  return labels.length > 1 ? labels.slice(0, -1) : labels;
}

export interface ScreenInput {
  domainName: string;                 // host or URL
  categoryName?: string | null;        // resolved category name ("Gambling", "Casino", ...)
  title?: string | null;               // page <title> (from the site itself)
  metaDescription?: string | null;     // page meta description (from the site itself)
  content?: string | null;             // page text sample (from the site itself)
  listingDescription?: string | null;  // the PUBLISHER's listing text: corroboration only
}

/**
 * Deterministic prohibited-niche screen. The publisher's listing text can only add to a
 * domain-name or category hit (publishers write "casino posts accepted" / "no adult" on
 * normal sites), never flag on its own; page text from the site itself carries full weight.
 */
export function screenProhibitedNiche(input: ScreenInput): ProhibitedNicheVerdict | null {
  const host = hostOf(input.domainName);
  const labels = hostLabels(host);
  const labelsJoined = labels.join('.');
  const categoryName = String(input.categoryName || '').toLowerCase();
  // headline = what the site says it IS (title + meta); content = a homepage text sample,
  // which on a general news/lifestyle site legitimately mentions anything once.
  const headline = [input.title, input.metaDescription].filter(Boolean).join(' \n ').toLowerCase().slice(0, 1000);
  const content = String(input.content || '').toLowerCase().slice(0, 6000);
  const listing = String(input.listingDescription || '').toLowerCase().slice(0, 2000);

  let best: { niche: ProhibitedNicheDef; score: number; matches: string[] } | null = null;

  for (const niche of PROHIBITED_NICHES) {
    const matches: string[] = [];
    let score = 0;

    // 1. Domain name: substring tokens (safe ones) + boundary tokens (risky short ones)
    for (const token of niche.domain || []) {
      if (labelsJoined.includes(token)) { matches.push(`domain:${token}`); score += 3; break; }
    }
    for (const token of niche.domainBoundary || []) {
      const re = new RegExp(`(^|[^a-z])${escapeRe(token)}($|[^a-z])`);
      if (labels.some(l => re.test(l.replace(/[0-9_]+/g, '-')))) { matches.push(`domain:${token}`); score += 3; break; }
    }

    // 2. Category name (publisher-chosen or detected)
    if (categoryName) {
      const catHit = [...(niche.strong || []), ...(niche.weak || [])].find(k => phraseRe(k).test(categoryName));
      if (catHit) { matches.push(`category:${catHit}`); score += 3; }
    }

    // 3. Headline (title + meta): one strong phrase = the site describes itself as that
    //    niche; two distinct weak words also count, one weak word only corroborates.
    if (headline) {
      const strongHits = (niche.strong || []).filter(k => phraseRe(k).test(headline));
      const weakHits = (niche.weak || []).filter(k => phraseRe(k).test(headline));
      if (strongHits.length) { matches.push(...strongHits.slice(0, 3).map(k => `title:${k}`)); score += 3; }
      else if (weakHits.length >= 2) { matches.push(...weakHits.slice(0, 3).map(k => `title:${k}`)); score += 2; }
      else if (weakHits.length === 1 && score > 0) { matches.push(`title:${weakHits[0]}`); score += 1; }
    }

    // 4. Page content: must be SATURATED with the niche to flag on its own (4+ distinct
    //    strong phrases); fewer hits only corroborate a domain/category/headline signal.
    //    A news site with one vaping/casino story (even a wordy one) must never flag
    //    from content alone.
    if (content) {
      const strongHits = (niche.strong || []).filter(k => phraseRe(k).test(content));
      const weakHits = (niche.weak || []).filter(k => phraseRe(k).test(content));
      if (strongHits.length >= 4) { matches.push(...strongHits.slice(0, 4).map(k => `text:${k}`)); score += 3; }
      else if (strongHits.length === 3) { matches.push(...strongHits.map(k => `text:${k}`)); score += 2; }
      else if (strongHits.length >= 1) { matches.push(`text:${strongHits[0]}`); score += 1; }
      if (weakHits.length >= 3) { matches.push(...weakHits.slice(0, 2).map(k => `text:${k}`)); score += 1; }
    }

    // 5. Publisher listing text: corroboration only (needs another signal first)
    if (listing && score > 0) {
      const hit = [...(niche.strong || []), ...(niche.weak || [])].find(k => phraseRe(k).test(listing));
      if (hit) { matches.push(`listing:${hit}`); score += 1; }
    }

    // flag threshold: a domain-name token, a category, a headline phrase, or saturated
    // content each reach 3 on their own; weaker signals must stack
    if (score >= 3 && (!best || score > best.score)) {
      best = { niche, score, matches };
    }
  }

  if (!best) return null;
  return {
    id: best.niche.id,
    label: best.niche.label,
    reason: `Matched ${best.niche.label.toLowerCase()} signals: ${best.matches.join(', ')}`,
    matches: best.matches,
  };
}

/**
 * Column payload for `domains` from a screen/AI verdict ({ id, reason, source }) or null.
 * Null clears the flag (used by re-detection); a verdict stamps all four columns.
 */
export function prohibitedNicheColumns(verdict: { id: string; reason?: string | null; source?: string | null } | null) {
  if (!verdict || !verdict.id || !prohibitedNicheLabel(verdict.id)) {
    return {
      prohibitedNiche: null,
      prohibitedNicheReason: null,
      prohibitedNicheSource: null,
      prohibitedNicheDetectedAt: null,
    };
  }
  return {
    prohibitedNiche: verdict.id,
    prohibitedNicheReason: String(verdict.reason || `Detected as ${prohibitedNicheLabel(verdict.id)} content`).slice(0, 500),
    prohibitedNicheSource: verdict.source || 'keyword',
    prohibitedNicheDetectedAt: new Date().toISOString(),
  };
}
