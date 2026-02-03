interface DomainTrafficResult {
  domainName: string;
  organicTraffic: number | null;
  country?: string;
  language?: string;
  locationCode?: number;
  languageCode?: string;
  error?: string;
}

// Cache for location and language mappings
let locationsCache: Map<number, { location_name: string; languages: Map<string, string> }> | null = null;
let cacheExpiry: number | null = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch locations and languages from DataForSEO API and cache them
 */
async function getLocationsAndLanguages(login: string, password: string): Promise<Map<number, { location_name: string; languages: Map<string, string> }>> {
  // Return cached data if available and not expired
  if (locationsCache && cacheExpiry && Date.now() < cacheExpiry) {
    return locationsCache;
  }

  const credentials = Buffer.from(`${login}:${password}`).toString('base64');

  const response = await fetch(
    'https://api.dataforseo.com/v3/dataforseo_labs/locations_and_languages',
    {
      method: 'GET',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    console.error('Failed to fetch locations and languages');
    throw new Error('Failed to fetch locations and languages');
  }

  const data = await response.json();

  const locationsMap = new Map<number, { location_name: string; languages: Map<string, string> }>();

  if (data.tasks && data.tasks[0]?.status_code === 20000) {
    const result = data.tasks[0].result;
    if (result && Array.isArray(result)) {
      for (const location of result) {
        const languagesMap = new Map<string, string>();

        if (location.available_languages && Array.isArray(location.available_languages)) {
          for (const lang of location.available_languages) {
            languagesMap.set(lang.language_code, lang.language_name);
          }
        }

        locationsMap.set(location.location_code, {
          location_name: location.location_name,
          languages: languagesMap,
        });
      }
    }
  }

  // Cache the result
  locationsCache = locationsMap;
  cacheExpiry = Date.now() + CACHE_DURATION;

  return locationsMap;
}

/**
 * Get location name from code
 */
async function getLocationName(
  locationCode: number,
  login: string,
  password: string
): Promise<string> {
  try {
    const locationsMap = await getLocationsAndLanguages(login, password);
    const location = locationsMap.get(locationCode);

    if (location) {
      return location.location_name;
    }
  } catch (error) {
    console.error('Error fetching location name:', error);
  }

  return `Location ${locationCode}`;
}

/**
 * Fetch domain traffic data from DataForSEO API
 */
async function fetchDomainTraffic(
  domain: string,
  login: string,
  password: string
): Promise<{ organic_etv: number } | null> {
  try {
    // Remove protocol and www from domain
    const cleanDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];

    // Encode credentials in Base64
    const credentials = Buffer.from(`${login}:${password}`).toString('base64');

    const requestBody = [
      {
        targets: [cleanDomain],
        location_code: 2840, // USA location code
        language_code: 'en',
        ignore_synonyms: false
      },
    ];

    const response = await fetch(
      'https://api.dataforseo.com/v3/dataforseo_labs/google/bulk_traffic_estimation/live',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`DataForSEO API error ${response.status}:`, errorText);
      throw new Error(`DataForSEO API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.tasks && data.tasks[0]?.status_code === 20000) {
      const result = data.tasks[0].result;
      if (result && result.length > 0 && result[0]?.items && result[0].items.length > 0) {
        // bulk_traffic_estimation returns traffic in result[0].items[0].metrics.organic.etv
        const item = result[0].items[0];
        if (item?.metrics?.organic) {
          return {
            organic_etv: item.metrics.organic.etv || 0,
          };
        }
      }
    }

    // Check for API errors
    if (data.tasks && data.tasks[0]?.status_code !== 20000) {
      throw new Error(`DataForSEO: ${data.tasks[0].status_message}`);
    }

    return null;
  } catch (error: any) {
    console.error(`Error fetching traffic for ${domain}:`, error.message);
    throw error;
  }
}

/**
 * Get traffic for a single domain
 */
export async function getDomainTraffic(
  domain: string,
  login: string,
  password: string
): Promise<DomainTrafficResult> {
  try {
    const trafficData = await fetchDomainTraffic(domain, login, password);

    return {
      domainName: domain,
      organicTraffic: trafficData?.organic_etv || 0,
    };
  } catch (error: any) {
    console.error(`Error getting traffic for ${domain}:`, error.message);
    return {
      domainName: domain,
      organicTraffic: null,
      error: error.message,
    };
  }
}

/**
 * Fetch domain rank overview from DataForSEO API (returns all locations)
 */
async function fetchDomainRankOverview(
  domain: string,
  login: string,
  password: string
): Promise<{ organic_etv: number; location_code: number; language_code: string; location_name?: string; language_name?: string } | null> {
  try {
    // Remove protocol and www from domain
    const cleanDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];

    // Encode credentials in Base64
    const credentials = Buffer.from(`${login}:${password}`).toString('base64');

    const requestBody = [
      {
        target: cleanDomain,
        // Don't specify location_code or language_code to get all locations
      },
    ];

    const response = await fetch(
      'https://api.dataforseo.com/v3/dataforseo_labs/google/domain_rank_overview/live',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`DataForSEO API error ${response.status}:`, errorText);
      throw new Error(`DataForSEO API error: ${response.status}`);
    }

    const data = await response.json();

    console.log('DataForSEO Response for', cleanDomain, ':', JSON.stringify(data, null, 2));

    if (data.tasks && data.tasks[0]?.status_code === 20000) {
      const result = data.tasks[0].result;
      if (result && result.length > 0 && result[0]?.items && result[0].items.length > 0) {
        console.log('Items count:', result[0].items.length);

        // Find the location with highest organic traffic
        let maxTraffic = 0;
        let bestLocation = null;

        for (const item of result[0].items) {
          const organicEtv = item?.metrics?.organic?.etv || 0;
          if (organicEtv > maxTraffic) {
            maxTraffic = organicEtv;
            bestLocation = {
              organic_etv: organicEtv,
              location_code: item.location_code,
              language_code: item.language_code,
            };
          }
        }

        // Get readable name for the best location
        if (bestLocation) {
          const locationName = await getLocationName(
            bestLocation.location_code,
            login,
            password
          );
          bestLocation.location_name = locationName;
          console.log('Best location selected:', bestLocation);
        }

        return bestLocation;
      }
    }

    // Check for API errors
    if (data.tasks && data.tasks[0]?.status_code !== 20000) {
      throw new Error(`DataForSEO: ${data.tasks[0].status_message}`);
    }

    return null;
  } catch (error: any) {
    console.error(`Error fetching rank overview for ${domain}:`, error.message);
    throw error;
  }
}

/**
 * Get traffic and location data for a single domain using domain_rank_overview
 */
export async function getDomainTrafficWithLocation(
  domain: string,
  login: string,
  password: string
): Promise<DomainTrafficResult> {
  try {
    const rankData = await fetchDomainRankOverview(domain, login, password);

    if (rankData) {
      return {
        domainName: domain,
        organicTraffic: rankData.organic_etv || 0,
        country: rankData.location_name || '',
        locationCode: rankData.location_code,
        languageCode: rankData.language_code,
      };
    }

    return {
      domainName: domain,
      organicTraffic: null,
      error: 'No data available',
    };
  } catch (error: any) {
    console.error(`Error getting traffic with location for ${domain}:`, error.message);
    return {
      domainName: domain,
      organicTraffic: null,
      error: error.message,
    };
  }
}

/**
 * Get traffic for multiple domains
 */
export async function getDomainTrafficBulk(
  domains: string[],
  login: string,
  password: string,
  onProgress?: (completed: number, total: number, current: string) => void
): Promise<DomainTrafficResult[]> {
  const results: DomainTrafficResult[] = [];

  for (let i = 0; i < domains.length; i++) {
    const domain = domains[i];

    if (onProgress) {
      onProgress(i, domains.length, domain);
    }

    const result = await getDomainTraffic(domain, login, password);
    results.push(result);

    // Delay to avoid rate limiting (1 second between requests)
    if (i < domains.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  if (onProgress) {
    onProgress(domains.length, domains.length, 'Completed');
  }

  return results;
}
