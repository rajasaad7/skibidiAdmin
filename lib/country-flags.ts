/**
 * Country name -> ISO 3166-1 alpha-2 for the signup flag on the users page.
 *
 * `user_device_details."signupCountry"` stores the English country NAME as
 * returned by ip-api.com (written by the app's deviceTracking.js), so the
 * lookup is by name. Unknown names simply render no flag.
 */
const COUNTRY_NAME_TO_ALPHA2: Record<string, string> = {
  'afghanistan': 'AF', 'albania': 'AL', 'algeria': 'DZ', 'andorra': 'AD', 'angola': 'AO',
  'argentina': 'AR', 'armenia': 'AM', 'australia': 'AU', 'austria': 'AT', 'azerbaijan': 'AZ',
  'bahamas': 'BS', 'bahrain': 'BH', 'bangladesh': 'BD', 'barbados': 'BB', 'belarus': 'BY',
  'belgium': 'BE', 'belize': 'BZ', 'benin': 'BJ', 'bhutan': 'BT', 'bolivia': 'BO',
  'bosnia and herzegovina': 'BA', 'botswana': 'BW', 'brazil': 'BR', 'brunei': 'BN',
  'bulgaria': 'BG', 'burkina faso': 'BF', 'burundi': 'BI', 'cambodia': 'KH', 'cameroon': 'CM',
  'canada': 'CA', 'cape verde': 'CV', 'chad': 'TD', 'chile': 'CL', 'china': 'CN',
  'colombia': 'CO', 'costa rica': 'CR', 'croatia': 'HR', 'cuba': 'CU', 'cyprus': 'CY',
  'czechia': 'CZ', 'czech republic': 'CZ', 'denmark': 'DK', 'dominican republic': 'DO',
  'dr congo': 'CD', 'congo': 'CG', 'ecuador': 'EC', 'egypt': 'EG', 'el salvador': 'SV',
  'estonia': 'EE', 'ethiopia': 'ET', 'fiji': 'FJ', 'finland': 'FI', 'france': 'FR',
  'georgia': 'GE', 'germany': 'DE', 'ghana': 'GH', 'greece': 'GR', 'guatemala': 'GT',
  'honduras': 'HN', 'hong kong': 'HK', 'hungary': 'HU', 'iceland': 'IS', 'india': 'IN',
  'indonesia': 'ID', 'iran': 'IR', 'iraq': 'IQ', 'ireland': 'IE', 'israel': 'IL',
  'italy': 'IT', "ivory coast": 'CI', "côte d'ivoire": 'CI', 'jamaica': 'JM', 'japan': 'JP',
  'jordan': 'JO', 'kazakhstan': 'KZ', 'kenya': 'KE', 'kosovo': 'XK', 'kuwait': 'KW',
  'kyrgyzstan': 'KG', 'laos': 'LA', 'latvia': 'LV', 'lebanon': 'LB', 'libya': 'LY',
  'liechtenstein': 'LI', 'lithuania': 'LT', 'luxembourg': 'LU', 'macao': 'MO', 'madagascar': 'MG',
  'malawi': 'MW', 'malaysia': 'MY', 'maldives': 'MV', 'mali': 'ML', 'malta': 'MT',
  'mauritius': 'MU', 'mexico': 'MX', 'moldova': 'MD', 'monaco': 'MC', 'mongolia': 'MN',
  'montenegro': 'ME', 'morocco': 'MA', 'mozambique': 'MZ', 'myanmar': 'MM', 'namibia': 'NA',
  'nepal': 'NP', 'netherlands': 'NL', 'the netherlands': 'NL', 'new zealand': 'NZ',
  'nicaragua': 'NI', 'niger': 'NE', 'nigeria': 'NG', 'north macedonia': 'MK', 'norway': 'NO',
  'oman': 'OM', 'pakistan': 'PK', 'palestine': 'PS', 'panama': 'PA', 'papua new guinea': 'PG',
  'paraguay': 'PY', 'peru': 'PE', 'philippines': 'PH', 'poland': 'PL', 'portugal': 'PT',
  'puerto rico': 'PR', 'qatar': 'QA', 'romania': 'RO', 'russia': 'RU', 'rwanda': 'RW',
  'saudi arabia': 'SA', 'senegal': 'SN', 'serbia': 'RS', 'singapore': 'SG', 'slovakia': 'SK',
  'slovenia': 'SI', 'somalia': 'SO', 'south africa': 'ZA', 'south korea': 'KR', 'south sudan': 'SS',
  'spain': 'ES', 'sri lanka': 'LK', 'sudan': 'SD', 'sweden': 'SE', 'switzerland': 'CH',
  'syria': 'SY', 'taiwan': 'TW', 'tajikistan': 'TJ', 'tanzania': 'TZ', 'thailand': 'TH',
  'trinidad and tobago': 'TT', 'tunisia': 'TN', 'turkey': 'TR', 'türkiye': 'TR',
  'turkmenistan': 'TM', 'uganda': 'UG', 'ukraine': 'UA', 'united arab emirates': 'AE',
  'united kingdom': 'GB', 'united states': 'US', 'uruguay': 'UY', 'uzbekistan': 'UZ',
  'venezuela': 'VE', 'vietnam': 'VN', 'yemen': 'YE', 'zambia': 'ZM', 'zimbabwe': 'ZW',
};

export function countryNameToAlpha2(name?: string | null): string | null {
  if (!name) return null;
  return COUNTRY_NAME_TO_ALPHA2[name.trim().toLowerCase()] || null;
}

/** Small PNG flag (renders the same on every OS, unlike emoji flags on Windows). */
export function countryFlagUrl(alpha2: string, width: 20 | 40 = 20): string {
  return `https://flagcdn.com/w${width}/${alpha2.toLowerCase()}.png`;
}
