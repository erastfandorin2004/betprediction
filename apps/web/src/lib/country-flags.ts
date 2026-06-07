// Флаг-эмодзи сборной по английскому названию (как оно приходит от провайдера).
// Используется в карточках ЛВС (ЧМ-2026): флаг рядом с командой, исходом, бомбардиром.
// Для England/Scotland/Wales — спец-эмодзи субдивизий (нет ISO2-региона).

const ISO2: Record<string, string> = {
  Algeria: 'DZ', Argentina: 'AR', Australia: 'AU', Austria: 'AT', Belgium: 'BE',
  'Bosnia-Herzegovina': 'BA', 'Bosnia & Herzegovina': 'BA', Brazil: 'BR', Canada: 'CA',
  'Cape Verde': 'CV', 'Cape Verde Islands': 'CV', Colombia: 'CO', 'Congo DR': 'CD',
  'DR Congo': 'CD', Croatia: 'HR', 'Curaçao': 'CW', Czechia: 'CZ', 'Czech Republic': 'CZ',
  Ecuador: 'EC', Egypt: 'EG', France: 'FR', Germany: 'DE', Ghana: 'GH', Haiti: 'HT',
  Iran: 'IR', 'IR Iran': 'IR', Iraq: 'IQ', 'Ivory Coast': 'CI', Japan: 'JP', Jordan: 'JO',
  Mexico: 'MX', Morocco: 'MA', Mozambique: 'MZ', Netherlands: 'NL', 'New Zealand': 'NZ',
  Norway: 'NO', Oman: 'OM', Panama: 'PA', Paraguay: 'PY', Poland: 'PL', Portugal: 'PT',
  Qatar: 'QA', 'Saudi Arabia': 'SA', Senegal: 'SN', Serbia: 'RS', 'South Africa': 'ZA',
  'South Korea': 'KR', 'Korea Republic': 'KR', Spain: 'ES', Sweden: 'SE', Switzerland: 'CH',
  Tunisia: 'TN', Turkey: 'TR', 'Türkiye': 'TR', 'United States': 'US', USA: 'US',
  Uruguay: 'UY', Uzbekistan: 'UZ', Italy: 'IT', Denmark: 'DK', Hungary: 'HU', Romania: 'RO',
  Ukraine: 'UA', Russia: 'RU', Greece: 'GR', Ireland: 'IE', Slovakia: 'SK', Slovenia: 'SI',
  Finland: 'FI', Iceland: 'IS', Israel: 'IL', Albania: 'AL', 'North Macedonia': 'MK',
  Kosovo: 'XK', Georgia: 'GE', Azerbaijan: 'AZ', Kazakhstan: 'KZ', China: 'CN',
  Indonesia: 'ID', Thailand: 'TH', Vietnam: 'VN', Nigeria: 'NG', Cameroon: 'CM', Mali: 'ML',
  Chile: 'CL', Bolivia: 'BO', Peru: 'PE', Venezuela: 'VE', 'Costa Rica': 'CR',
  Honduras: 'HN', Guatemala: 'GT', Jamaica: 'JM', 'Trinidad and Tobago': 'TT',
  'North Korea': 'KP', 'Korea DPR': 'KP', 'Faroe Islands': 'FO', 'San Marino': 'SM',
  Malta: 'MT', Cyprus: 'CY', Montenegro: 'ME', Luxembourg: 'LU', Gibraltar: 'GI',
  Estonia: 'EE', Latvia: 'LV', Lithuania: 'LT', Bulgaria: 'BG', Belarus: 'BY',
  Moldova: 'MD', Armenia: 'AM',
};

// Субдивизии Великобритании — отдельные эмодзи (нет региона ISO2).
const SPECIAL: Record<string, string> = {
  England: '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  Scotland: '🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
  Wales: '🏴\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}',
};

function iso2ToEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Флаг-эмодзи сборной или '' если страна неизвестна. */
export function flagEmoji(teamName: string | null | undefined): string {
  if (!teamName) return '';
  const name = teamName.trim();
  if (SPECIAL[name]) return SPECIAL[name]!;
  const code = ISO2[name];
  return code ? iso2ToEmoji(code) : '';
}
