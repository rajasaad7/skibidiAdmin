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
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'ja': 'Japanese',
  'zh': 'Chinese',
  'ko': 'Korean',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'nl': 'Dutch',
  'pl': 'Polish',
  'tr': 'Turkish',
  'sv': 'Swedish',
  'da': 'Danish',
  'no': 'Norwegian',
  'fi': 'Finnish',
  'cs': 'Czech',
  'el': 'Greek',
  'he': 'Hebrew',
  'id': 'Indonesian',
  'th': 'Thai',
  'vi': 'Vietnamese',
  'ro': 'Romanian',
  'uk': 'Ukrainian',
  'hu': 'Hungarian',
  'bn': 'Bengali',
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

    const prompt = `Categorize this domain:
Domain: ${domainName}
Title: ${title || 'N/A'}
Description: ${metaDescription || domainDescription || 'N/A'}
Content: ${content.substring(0, 200) || 'N/A'}

Categories: ${categoryList}

Return JSON only:
{"category":"Category Name","language":"en","country":"US","confidence":"High","reason":"short reason"}`;

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
          model: 'llama-3.1-8b-instant', // Smallest, fastest, most token-efficient model
          temperature: 0.2,
          max_tokens: 150,
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

        // Convert language code to full name
        const langCode = aiResponse.language?.toLowerCase();
        const languageFullName = langCode ? (languageMap[langCode] || langCode) : null;

        // Convert country code to full name
        const countryCode = aiResponse.country?.toUpperCase();
        const countryFullName = countryCode ? (countryMap[countryCode] || countryCode) : null;

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
