interface DomainTrafficResult {
  domainName: string;
  organicTraffic: number | null;
  error?: string;
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
