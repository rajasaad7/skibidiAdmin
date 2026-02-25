interface SheetDomainData {
  domainName: string;
  dr: number | null;
  da: number | null;
  spamScore: number | null;
  traffic: number | null;
  country: string | null;
}

/**
 * Fetch domain data from Google Sheet
 */
export async function fetchSheetData(
  spreadsheetId: string,
  sheetName: string
): Promise<SheetDomainData[]> {
  try {
    // Use Google Sheets API without authentication (public sheet)
    const range = `${sheetName}!A2:F`; // Skip header row, get all data including country
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&range=${encodeURIComponent(range)}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet data: ${response.status}`);
    }

    const csvText = await response.text();
    const rows = csvText.split('\n').filter(row => row.trim());

    const results: SheetDomainData[] = [];

    for (const row of rows) {
      // Parse CSV row (handle quoted values)
      const values = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      const cleanValues = values.map(v => v.replace(/^"|"$/g, '').trim());

      if (cleanValues.length >= 1 && cleanValues[0]) {
        const domainName = cleanValues[0].toLowerCase().trim();
        const dr = cleanValues[1] ? parseFloat(cleanValues[1]) : null;
        const da = cleanValues[2] ? parseFloat(cleanValues[2]) : null;
        const spamScore = cleanValues[3] ? parseFloat(cleanValues[3]) : null;
        const traffic = cleanValues[4] ? parseFloat(cleanValues[4]) : null;
        const country = cleanValues[5] ? cleanValues[5].trim() : null;

        results.push({
          domainName,
          dr: dr !== null && !isNaN(dr) ? Math.round(dr) : null,
          da: da !== null && !isNaN(da) ? Math.round(da) : null,
          spamScore: spamScore !== null && !isNaN(spamScore) ? Math.round(spamScore) : null,
          traffic: traffic !== null && !isNaN(traffic) ? Math.round(traffic) : null,
          country: country && country.length > 0 ? country : null,
        });
      }
    }

    return results;
  } catch (error: any) {
    console.error('Error fetching sheet data:', error);
    throw error;
  }
}

/**
 * Find matching domain data from sheet
 */
export function findDomainInSheet(
  domainName: string,
  sheetData: SheetDomainData[]
): SheetDomainData | null {
  const cleanDomain = domainName
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .trim();

  return sheetData.find(d => {
    const sheetDomain = d.domainName
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .trim();
    return sheetDomain === cleanDomain;
  }) || null;
}
