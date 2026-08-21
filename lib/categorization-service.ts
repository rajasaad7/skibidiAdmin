import Groq from 'groq-sdk';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

interface DomainInfo {
  domainName: string;
  url: string;
  description?: string | null;
}

interface Category {
  _id: string;
  name: string;
}

interface CategorizationResult {
  domainName: string;
  suggestedCategory: string | null;
  categoryId: string | null;
  suggestedLanguage: string | null;
  suggestedCountry: string | null;
  confidence: string;
  reason: string;
  error?: string;
}

// Language code to full name mapping
const languageMap: Record<string, string> = {
  'aa': 'Afar',
  'ab': 'Abkhazian',
  'ae': 'Avestan',
  'af': 'Afrikaans',
  'ak': 'Akan',
  'am': 'Amharic',
  'an': 'Aragonese',
  'ar': 'Arabic',
  'as': 'Assamese',
  'av': 'Avaric',
  'ay': 'Aymara',
  'az': 'Azerbaijani',
  'ba': 'Bashkir',
  'be': 'Belarusian',
  'bg': 'Bulgarian',
  'bh': 'Bihari',
  'bi': 'Bislama',
  'bm': 'Bambara',
  'bn': 'Bengali',
  'bo': 'Tibetan',
  'br': 'Breton',
  'bs': 'Bosnian',
  'ca': 'Catalan',
  'ce': 'Chechen',
  'ch': 'Chamorro',
  'co': 'Corsican',
  'cr': 'Cree',
  'cs': 'Czech',
  'cu': 'Church Slavic',
  'cv': 'Chuvash',
  'cy': 'Welsh',
  'da': 'Danish',
  'de': 'German',
  'dv': 'Divehi',
  'dz': 'Dzongkha',
  'ee': 'Ewe',
  'el': 'Greek',
  'en': 'English',
  'eo': 'Esperanto',
  'es': 'Spanish',
  'et': 'Estonian',
  'eu': 'Basque',
  'fa': 'Persian',
  'ff': 'Fulah',
  'fi': 'Finnish',
  'fj': 'Fijian',
  'fo': 'Faroese',
  'fr': 'French',
  'fy': 'Western Frisian',
  'ga': 'Irish',
  'gd': 'Scottish Gaelic',
  'gl': 'Galician',
  'gn': 'Guarani',
  'gu': 'Gujarati',
  'gv': 'Manx',
  'ha': 'Hausa',
  'he': 'Hebrew',
  'hi': 'Hindi',
  'ho': 'Hiri Motu',
  'hr': 'Croatian',
  'ht': 'Haitian',
  'hu': 'Hungarian',
  'hy': 'Armenian',
  'hz': 'Herero',
  'ia': 'Interlingua',
  'id': 'Indonesian',
  'ie': 'Interlingue',
  'ig': 'Igbo',
  'ii': 'Sichuan Yi',
  'ik': 'Inupiaq',
  'io': 'Ido',
  'is': 'Icelandic',
  'it': 'Italian',
  'iu': 'Inuktitut',
  'ja': 'Japanese',
  'jv': 'Javanese',
  'ka': 'Georgian',
  'kg': 'Kongo',
  'ki': 'Kikuyu',
  'kj': 'Kuanyama',
  'kk': 'Kazakh',
  'kl': 'Kalaallisut',
  'km': 'Khmer',
  'kn': 'Kannada',
  'ko': 'Korean',
  'kr': 'Kanuri',
  'ks': 'Kashmiri',
  'ku': 'Kurdish',
  'kv': 'Komi',
  'kw': 'Cornish',
  'ky': 'Kyrgyz',
  'la': 'Latin',
  'lb': 'Luxembourgish',
  'lg': 'Ganda',
  'li': 'Limburgish',
  'ln': 'Lingala',
  'lo': 'Lao',
  'lt': 'Lithuanian',
  'lu': 'Luba-Katanga',
  'lv': 'Latvian',
  'mg': 'Malagasy',
  'mh': 'Marshallese',
  'mi': 'Maori',
  'mk': 'Macedonian',
  'ml': 'Malayalam',
  'mn': 'Mongolian',
  'mr': 'Marathi',
  'ms': 'Malay',
  'mt': 'Maltese',
  'my': 'Burmese',
  'na': 'Nauru',
  'nb': 'Norwegian Bokmål',
  'nd': 'North Ndebele',
  'ne': 'Nepali',
  'ng': 'Ndonga',
  'nl': 'Dutch',
  'nn': 'Norwegian Nynorsk',
  'no': 'Norwegian',
  'nr': 'South Ndebele',
  'nv': 'Navajo',
  'ny': 'Chichewa',
  'oc': 'Occitan',
  'oj': 'Ojibwa',
  'om': 'Oromo',
  'or': 'Oriya',
  'os': 'Ossetian',
  'pa': 'Punjabi',
  'pi': 'Pali',
  'pl': 'Polish',
  'ps': 'Pashto',
  'pt': 'Portuguese',
  'qu': 'Quechua',
  'rm': 'Romansh',
  'rn': 'Rundi',
  'ro': 'Romanian',
  'ru': 'Russian',
  'rw': 'Kinyarwanda',
  'sa': 'Sanskrit',
  'sc': 'Sardinian',
  'sd': 'Sindhi',
  'se': 'Northern Sami',
  'sg': 'Sango',
  'si': 'Sinhala',
  'sk': 'Slovak',
  'sl': 'Slovenian',
  'sm': 'Samoan',
  'sn': 'Shona',
  'so': 'Somali',
  'sq': 'Albanian',
  'sr': 'Serbian',
  'ss': 'Swati',
  'st': 'Southern Sotho',
  'su': 'Sundanese',
  'sv': 'Swedish',
  'sw': 'Swahili',
  'ta': 'Tamil',
  'te': 'Telugu',
  'tg': 'Tajik',
  'th': 'Thai',
  'ti': 'Tigrinya',
  'tk': 'Turkmen',
  'tl': 'Tagalog',
  'tn': 'Tswana',
  'to': 'Tonga',
  'tr': 'Turkish',
  'ts': 'Tsonga',
  'tt': 'Tatar',
  'tw': 'Twi',
  'ty': 'Tahitian',
  'ug': 'Uyghur',
  'uk': 'Ukrainian',
  'ur': 'Urdu',
  'uz': 'Uzbek',
  've': 'Venda',
  'vi': 'Vietnamese',
  'vo': 'Volapük',
  'wa': 'Walloon',
  'wo': 'Wolof',
  'xh': 'Xhosa',
  'yi': 'Yiddish',
  'yo': 'Yoruba',
  'za': 'Zhuang',
  'zh': 'Chinese',
  'zu': 'Zulu',
};

// Country code to full name mapping
const countryMap: Record<string, string> = {
  'US': 'United States',
  'UK': 'United Kingdom',
  'GB': 'United Kingdom',
  'CA': 'Canada',
  'AU': 'Australia',
  'NZ': 'New Zealand',
  'IE': 'Ireland',
  'DE': 'Germany',
  'FR': 'France',
  'ES': 'Spain',
  'IT': 'Italy',
  'PT': 'Portugal',
  'NL': 'Netherlands',
  'BE': 'Belgium',
  'CH': 'Switzerland',
  'AT': 'Austria',
  'SE': 'Sweden',
  'NO': 'Norway',
  'DK': 'Denmark',
  'FI': 'Finland',
  'PL': 'Poland',
  'CZ': 'Czech Republic',
  'GR': 'Greece',
  'TR': 'Turkey',
  'RU': 'Russia',
  'UA': 'Ukraine',
  'RO': 'Romania',
  'HU': 'Hungary',
  'IN': 'India',
  'CN': 'China',
  'JP': 'Japan',
  'KR': 'South Korea',
  'SG': 'Singapore',
  'MY': 'Malaysia',
  'TH': 'Thailand',
  'VN': 'Vietnam',
  'ID': 'Indonesia',
  'PH': 'Philippines',
  'BR': 'Brazil',
  'MX': 'Mexico',
  'AR': 'Argentina',
  'CL': 'Chile',
  'CO': 'Colombia',
  'ZA': 'South Africa',
  'EG': 'Egypt',
  'IL': 'Israel',
  'AE': 'United Arab Emirates',
  'SA': 'Saudi Arabia',
  'NG': 'Nigeria',
  'KE': 'Kenya',
  'GH': 'Ghana',
  'ET': 'Ethiopia',
  'TZ': 'Tanzania',
  'UG': 'Uganda',
  'MA': 'Morocco',
  'DZ': 'Algeria',
  'TN': 'Tunisia',
  'SD': 'Sudan',
  'AO': 'Angola',
  'MZ': 'Mozambique',
  'ZW': 'Zimbabwe',
  'BW': 'Botswana',
  'NA': 'Namibia',
  'SN': 'Senegal',
  'CI': 'Ivory Coast',
  'CM': 'Cameroon',
  'PE': 'Peru',
  'VE': 'Venezuela',
  'EC': 'Ecuador',
  'BO': 'Bolivia',
  'UY': 'Uruguay',
  'PY': 'Paraguay',
  'CR': 'Costa Rica',
  'PA': 'Panama',
  'GT': 'Guatemala',
  'HN': 'Honduras',
  'SV': 'El Salvador',
  'NI': 'Nicaragua',
  'DO': 'Dominican Republic',
  'CU': 'Cuba',
  'JM': 'Jamaica',
  'TT': 'Trinidad and Tobago',
  'PK': 'Pakistan',
  'BD': 'Bangladesh',
  'LK': 'Sri Lanka',
  'NP': 'Nepal',
  'MM': 'Myanmar',
  'KH': 'Cambodia',
  'LA': 'Laos',
  'MN': 'Mongolia',
  'KZ': 'Kazakhstan',
  'UZ': 'Uzbekistan',
  'TM': 'Turkmenistan',
  'KG': 'Kyrgyzstan',
  'TJ': 'Tajikistan',
  'AF': 'Afghanistan',
  'IQ': 'Iraq',
  'IR': 'Iran',
  'SY': 'Syria',
  'JO': 'Jordan',
  'LB': 'Lebanon',
  'PS': 'Palestine',
  'YE': 'Yemen',
  'OM': 'Oman',
  'KW': 'Kuwait',
  'BH': 'Bahrain',
  'QA': 'Qatar',
  'AM': 'Armenia',
  'AZ': 'Azerbaijan',
  'GE': 'Georgia',
  'BY': 'Belarus',
  'MD': 'Moldova',
  'LT': 'Lithuania',
  'LV': 'Latvia',
  'EE': 'Estonia',
  'SK': 'Slovakia',
  'SI': 'Slovenia',
  'HR': 'Croatia',
  'BA': 'Bosnia and Herzegovina',
  'RS': 'Serbia',
  'ME': 'Montenegro',
  'MK': 'North Macedonia',
  'AL': 'Albania',
  'BG': 'Bulgaria',
  'IS': 'Iceland',
  'LU': 'Luxembourg',
  'MT': 'Malta',
  'CY': 'Cyprus',
  'LI': 'Liechtenstein',
  'MC': 'Monaco',
  'AD': 'Andorra',
  'SM': 'San Marino',
  'VA': 'Vatican City',
  'TW': 'Taiwan',
  'HK': 'Hong Kong',
  'MO': 'Macau',
  'BN': 'Brunei',
  'FJ': 'Fiji',
  'PG': 'Papua New Guinea',
  'NC': 'New Caledonia',
  'WS': 'Samoa',
  'TO': 'Tonga',
  'VU': 'Vanuatu',
  'SB': 'Solomon Islands',
  'GU': 'Guam',
  'PF': 'French Polynesia',
  'PR': 'Puerto Rico',
  'VI': 'U.S. Virgin Islands',
  'KY': 'Cayman Islands',
  'BM': 'Bermuda',
  'GI': 'Gibraltar',
  'IM': 'Isle of Man',
  'JE': 'Jersey',
  'GG': 'Guernsey',
  'FO': 'Faroe Islands',
  'GL': 'Greenland',
  'AX': 'Åland Islands',
  'RE': 'Réunion',
  'MQ': 'Martinique',
  'GP': 'Guadeloupe',
  'GF': 'French Guiana',
  'PM': 'Saint Pierre and Miquelon',
  'BL': 'Saint Barthélemy',
  'MF': 'Saint Martin',
  'CW': 'Curaçao',
  'AW': 'Aruba',
  'SX': 'Sint Maarten',
  'TC': 'Turks and Caicos Islands',
  'VG': 'British Virgin Islands',
  'MS': 'Montserrat',
  'AI': 'Anguilla',
  'FK': 'Falkland Islands',
  'GS': 'South Georgia',
  'SH': 'Saint Helena',
  'PN': 'Pitcairn Islands',
  'MU': 'Mauritius',
  'SC': 'Seychelles',
  'MV': 'Maldives',
  'KM': 'Comoros',
  'CV': 'Cape Verde',
  'ST': 'São Tomé and Príncipe',
  'GM': 'Gambia',
  'GN': 'Guinea',
  'GW': 'Guinea-Bissau',
  'SL': 'Sierra Leone',
  'LR': 'Liberia',
  'BF': 'Burkina Faso',
  'ML': 'Mali',
  'NE': 'Niger',
  'TD': 'Chad',
  'CF': 'Central African Republic',
  'CG': 'Republic of the Congo',
  'CD': 'Democratic Republic of the Congo',
  'GA': 'Gabon',
  'GQ': 'Equatorial Guinea',
  'RW': 'Rwanda',
  'BI': 'Burundi',
  'SO': 'Somalia',
  'DJ': 'Djibouti',
  'ER': 'Eritrea',
  'SS': 'South Sudan',
  'MW': 'Malawi',
  'ZM': 'Zambia',
  'LS': 'Lesotho',
  'SZ': 'Eswatini',
  'MG': 'Madagascar',
  'YT': 'Mayotte',
  'KP': 'North Korea',
  'BT': 'Bhutan',
  'TL': 'Timor-Leste',
};

/**
 * Fetch domain homepage and extract metadata
 */
async function fetchDomainMetadata(url: string): Promise<{
  title: string;
  description: string;
  content: string;
  htmlLang: string;
}> {
  try {
    // Ensure URL has protocol
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DomainCategorizationBot/1.0)',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract meta description
    const descMatch = html.match(/<meta\s+(?:name|property)=["'](?:description|og:description)["']\s+content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : '';

    // Extract language from html tag
    const langMatch = html.match(/<html[^>]*\slang=["']([^"']+)["']/i);
    const htmlLang = langMatch ? langMatch[1].trim() : '';

    // Extract some body text (first 1000 chars of visible text)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let bodyText = bodyMatch ? bodyMatch[1] : '';
    // Remove script and style tags
    bodyText = bodyText.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    bodyText = bodyText.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    // Remove HTML tags
    bodyText = bodyText.replace(/<[^>]+>/g, ' ');
    // Clean up whitespace
    bodyText = bodyText.replace(/\s+/g, ' ').trim();
    const content = bodyText.substring(0, 1000);

    return { title, description, content, htmlLang };
  } catch (error: any) {
    console.error(`Error fetching metadata for ${url}:`, error.message);
    return { title: '', description: '', content: '', htmlLang: '' };
  }
}

// Country-code TLDs that are marketed/used as generic TLDs; they say nothing about
// the site's country, so we never infer a country from them.
const GENERIC_USE_CCTLDS = new Set([
  'tv', 'io', 'co', 'me', 'ai', 'ly', 'cc', 'fm', 'gg', 'to', 'ws', 'nu', 'la', 'sh',
  'ac', 'st', 'vc', 'so', 'cx', 'tk', 'ml', 'ga', 'cf', 'gq', 'su', 'eu', 'as', 'gs',
  'ms', 'nf', 'pw', 'tc', 'tl', 'cd', 'dj', 'ki', 'ps', 'sc', 'tm', 'vu', 'bz', 'gl',
]);

/**
 * Return the ISO 3166-1 alpha-2 country code implied by the domain's TLD when it is
 * a real country ccTLD (e.g. ".fr" -> "FR", ".co.uk" -> "GB"); null for gTLDs
 * (.com/.net/.org) and ccTLDs that are used generically (.tv/.io/.co/...).
 */
function countryCodeFromTld(domainName: string): string | null {
  const host = domainName.toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  const labels = host.split('.').filter(Boolean);
  if (labels.length < 2) return null;
  const tld = labels[labels.length - 1];
  if (tld.length !== 2 || GENERIC_USE_CCTLDS.has(tld)) return null;
  if (tld === 'uk') return 'GB';
  const code = tld.toUpperCase();
  return countryMap[code] ? code : null;
}

/** Primary ISO 639-1 subtag of an html lang attribute ("fr-FR" -> "fr"), or null. */
function primaryLanguageCode(htmlLang: string): string | null {
  const code = (htmlLang || '').trim().toLowerCase().split(/[-_]/)[0];
  return code && languageMap[code] ? code : null;
}

/**
 * Use Groq AI to categorize a domain with retry logic
 */
async function categorizeDomainWithAI(
  domainInfo: DomainInfo,
  metadata: { title: string; description: string; content: string; htmlLang: string },
  categories: Category[]
): Promise<CategorizationResult> {
  const { domainName, description: domainDescription } = domainInfo;
  const { title, description: metaDescription, content, htmlLang } = metadata;

  try {
    const categoryList = categories.map(cat => `- ${cat.name}`).join('\n');

    const tldCountry = countryCodeFromTld(domainName);
    const declaredLang = primaryLanguageCode(htmlLang);

    const prompt = `Categorize this website and detect its language and country.
Domain: ${domainName}
TLD country hint: ${tldCountry ? `${tldCountry} (country-code TLD, strong signal)` : 'none (generic TLD, infer from content)'}
HTML lang attribute: ${htmlLang || 'N/A'}
Title: ${title || 'N/A'}
Description: ${metaDescription || domainDescription || 'N/A'}
Content: ${content.substring(0, 600) || 'N/A'}

Categories (pick exactly one name from this list):
${categoryList}

Rules:
- language: ISO 639-1 code of the language the title/description/content are actually written in. The HTML lang attribute is a hint; the text itself wins if they disagree.
- country: exactly ONE ISO 3166-1 alpha-2 code, the single primary audience/market the site serves (never a list, never a region). A country-code TLD (.fr, .de, .co.uk ...) is a strong signal, so use it unless the content clearly targets another country. For generic TLDs infer from language, currency, addresses, phone formats or place names; if the audience spans several countries pick the primary one; use "UNKNOWN" if there is no real evidence. Never default to US.
- confidence: High, Medium or Low.

Return JSON only, exactly this shape (replace the placeholders):
{"category":"<category name from the list>","language":"<ISO 639-1 code>","country":"<ISO 3166-1 alpha-2 code or UNKNOWN>","confidence":"<High|Medium|Low>","reason":"<short reason>"}`;

    // Retry logic for rate limits
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          // Groq retired llama-3.1-8b-instant (Aug 2026). gpt-oss-20b is the small/fast
          // replacement; low reasoning effort + a wider completion budget so the
          // reasoning tokens never starve the JSON answer.
          model: 'openai/gpt-oss-20b',
          reasoning_effort: 'low',
          temperature: 0.2,
          max_completion_tokens: 300,
        });

        const responseText = chatCompletion.choices[0]?.message?.content || '';

        // Parse the AI response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Invalid AI response format');
        }

        const aiResponse = JSON.parse(jsonMatch[0]);

        // Find the matching category ID
        const matchedCategory = categories.find(
          cat => cat.name.toLowerCase() === aiResponse.category.toLowerCase()
        );

        // Language: model answer, falling back to the page's declared html lang.
        let langCode: string | null = String(aiResponse.language || '').toLowerCase().split(/[-_]/)[0] || null;
        if ((!langCode || !languageMap[langCode]) && declaredLang) langCode = declaredLang;
        const languageFullName = langCode ? (languageMap[langCode] || 'Others') : null;

        // Country: a real country-code TLD wins over the model unless the model
        // disagrees with High confidence AND actually saw page content. This keeps
        // .fr/.de/... sites from being filed under an invented default country.
        // No evidence at all (UNKNOWN / empty / unmapped code) resolves to the
        // platform's neutral value "Others" so stale guesses never survive a re-run.
        // Exactly one country per domain: take the FIRST valid alpha-2 code even if the
        // model answered with a list ("IN/US", "IN, US") or a name ("India (IN)").
        const countryRaw = String(aiResponse.country || '').toUpperCase();
        let countryCode: string | null = countryRaw === 'UNKNOWN'
          ? null
          : (countryRaw.match(/\b[A-Z]{2}\b/g) || []).find(code => !!countryMap[code]) || null;
        if (tldCountry) {
          const modelOverrides = countryCode && countryCode !== tldCountry
            && aiResponse.confidence === 'High' && content.length > 0;
          if (!modelOverrides) countryCode = tldCountry;
        }
        const countryFullName = (countryCode && countryMap[countryCode]) || 'Others';

        return {
          domainName,
          suggestedCategory: aiResponse.category,
          categoryId: matchedCategory?._id || null,
          suggestedLanguage: languageFullName,
          suggestedCountry: countryFullName,
          confidence: aiResponse.confidence,
          reason: aiResponse.reason,
        };
      } catch (error: any) {
        lastError = error;

        // Check if it's a rate limit error
        if (error.message && error.message.includes('rate_limit')) {
          console.log(`Rate limit hit for ${domainName}, attempt ${attempt + 1}/3`);
          if (attempt < 2) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 2000));
            continue;
          }
        }

        // For other errors, don't retry
        throw error;
      }
    }

    // If all retries failed
    throw lastError || new Error('Failed after 3 attempts');
  } catch (error: any) {
    console.error(`Error categorizing ${domainName}:`, error.message);
    return {
      domainName,
      suggestedCategory: null,
      categoryId: null,
      suggestedLanguage: null,
      suggestedCountry: null,
      confidence: 'Low',
      reason: 'Error during categorization',
      error: error.message,
    };
  }
}

/**
 * Main function to categorize a domain
 */
export async function categorizeDomain(
  domainInfo: DomainInfo,
  categories: Category[]
): Promise<CategorizationResult> {
  // Fetch domain metadata
  const metadata = await fetchDomainMetadata(domainInfo.url);

  // Use AI to categorize
  const result = await categorizeDomainWithAI(domainInfo, metadata, categories);

  return result;
}

/**
 * Categorize multiple domains
 */
export async function categorizeDomainsBulk(
  domains: DomainInfo[],
  categories: Category[],
  onProgress?: (completed: number, total: number, current: string) => void
): Promise<CategorizationResult[]> {
  const results: CategorizationResult[] = [];

  for (let i = 0; i < domains.length; i++) {
    const domain = domains[i];

    if (onProgress) {
      onProgress(i, domains.length, domain.domainName);
    }

    const result = await categorizeDomain(domain, categories);
    results.push(result);

    // Longer delay to avoid rate limiting (2 seconds between requests)
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  if (onProgress) {
    onProgress(domains.length, domains.length, 'Completed');
  }

  return results;
}
