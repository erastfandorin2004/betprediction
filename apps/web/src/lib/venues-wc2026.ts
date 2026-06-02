/**
 * Static WC 2026 venue mapping keyed by fixture ID.
 * Source: official FIFA World Cup 2026 schedule (FIFA.com).
 */
export interface VenueInfo {
  stadium: string;
  city: string;
  country: string;
  countryCode: string; // ISO 3166-1 alpha-2
}

const VENUES: Record<number, VenueInfo> = {
  // ── Group B: Mexico · South Korea · Czechia · South Africa ──────────────
  537327: { stadium: 'Estadio Azteca',          city: 'Mexico City',      country: 'Mexico',  countryCode: 'MX' }, // OPENING MATCH
  537328: { stadium: 'SoFi Stadium',            city: 'Los Angeles',      country: 'USA',     countryCode: 'US' },
  537329: { stadium: 'AT&T Stadium',            city: 'Dallas',           country: 'USA',     countryCode: 'US' },
  537330: { stadium: 'Estadio Akron',           city: 'Guadalajara',      country: 'Mexico',  countryCode: 'MX' },
  537331: { stadium: 'AT&T Stadium',            city: 'Dallas',           country: 'USA',     countryCode: 'US' },
  537332: { stadium: 'Estadio BBVA',            city: 'Monterrey',        country: 'Mexico',  countryCode: 'MX' },

  // ── Group A: Qatar · Canada · Bosnia-Herzegovina · Switzerland ──────────
  537333: { stadium: 'BMO Field',               city: 'Toronto',          country: 'Canada',  countryCode: 'CA' },
  537334: { stadium: "Levi's Stadium",          city: 'San Francisco',    country: 'USA',     countryCode: 'US' },
  537335: { stadium: 'Hard Rock Stadium',       city: 'Miami',            country: 'USA',     countryCode: 'US' },
  537336: { stadium: 'BC Place',                city: 'Vancouver',        country: 'Canada',  countryCode: 'CA' },
  537337: { stadium: 'Arrowhead Stadium',       city: 'Kansas City',      country: 'USA',     countryCode: 'US' },
  537338: { stadium: 'Lumen Field',             city: 'Seattle',          country: 'USA',     countryCode: 'US' },

  // ── Group C: Brazil · Morocco · Haiti · Scotland ────────────────────────
  537339: { stadium: 'MetLife Stadium',         city: 'New York',         country: 'USA',     countryCode: 'US' },
  537340: { stadium: 'Estadio BBVA',            city: 'Monterrey',        country: 'Mexico',  countryCode: 'MX' },
  537341: { stadium: 'Mercedes-Benz Stadium',   city: 'Atlanta',          country: 'USA',     countryCode: 'US' },
  537342: { stadium: 'Estadio Azteca',          city: 'Mexico City',      country: 'Mexico',  countryCode: 'MX' },
  537343: { stadium: 'Lincoln Financial Field', city: 'Philadelphia',     country: 'USA',     countryCode: 'US' },
  537344: { stadium: 'Gillette Stadium',        city: 'Boston',           country: 'USA',     countryCode: 'US' },

  // ── Group D: USA · Paraguay · Australia · Turkey ────────────────────────
  537345: { stadium: 'MetLife Stadium',         city: 'New York',         country: 'USA',     countryCode: 'US' },
  537346: { stadium: 'Lumen Field',             city: 'Seattle',          country: 'USA',     countryCode: 'US' },
  537347: { stadium: 'Hard Rock Stadium',       city: 'Miami',            country: 'USA',     countryCode: 'US' },
  537348: { stadium: 'SoFi Stadium',            city: 'Los Angeles',      country: 'USA',     countryCode: 'US' },
  537349: { stadium: 'AT&T Stadium',            city: 'Dallas',           country: 'USA',     countryCode: 'US' },
  537350: { stadium: "Levi's Stadium",          city: 'San Francisco',    country: 'USA',     countryCode: 'US' },

  // ── Group E: Germany · Curaçao · Ivory Coast · Ecuador ──────────────────
  537351: { stadium: 'Mercedes-Benz Stadium',   city: 'Atlanta',          country: 'USA',     countryCode: 'US' },
  537352: { stadium: 'BC Place',                city: 'Vancouver',        country: 'Canada',  countryCode: 'CA' },
  537353: { stadium: 'AT&T Stadium',            city: 'Dallas',           country: 'USA',     countryCode: 'US' },
  537354: { stadium: 'Hard Rock Stadium',       city: 'Miami',            country: 'USA',     countryCode: 'US' },
  537355: { stadium: 'MetLife Stadium',         city: 'New York',         country: 'USA',     countryCode: 'US' },
  537356: { stadium: 'BMO Field',               city: 'Toronto',          country: 'Canada',  countryCode: 'CA' },

  // ── Group F: Netherlands · Japan · Sweden · Tunisia ─────────────────────
  537357: { stadium: 'Lincoln Financial Field', city: 'Philadelphia',     country: 'USA',     countryCode: 'US' },
  537358: { stadium: 'Arrowhead Stadium',       city: 'Kansas City',      country: 'USA',     countryCode: 'US' },
  537359: { stadium: "Levi's Stadium",          city: 'San Francisco',    country: 'USA',     countryCode: 'US' },
  537360: { stadium: 'Gillette Stadium',        city: 'Boston',           country: 'USA',     countryCode: 'US' },
  537361: { stadium: 'SoFi Stadium',            city: 'Los Angeles',      country: 'USA',     countryCode: 'US' },
  537362: { stadium: 'Mercedes-Benz Stadium',   city: 'Atlanta',          country: 'USA',     countryCode: 'US' },

  // ── Group G: Spain · Saudi Arabia · Uruguay · Cape Verde ────────────────
  537369: { stadium: 'Gillette Stadium',        city: 'Boston',           country: 'USA',     countryCode: 'US' },
  537370: { stadium: 'Hard Rock Stadium',       city: 'Miami',            country: 'USA',     countryCode: 'US' },
  537371: { stadium: 'Lincoln Financial Field', city: 'Philadelphia',     country: 'USA',     countryCode: 'US' },
  537372: { stadium: "Levi's Stadium",          city: 'San Francisco',    country: 'USA',     countryCode: 'US' },
  537373: { stadium: 'MetLife Stadium',         city: 'New York',         country: 'USA',     countryCode: 'US' },
  537374: { stadium: 'AT&T Stadium',            city: 'Dallas',           country: 'USA',     countryCode: 'US' },

  // ── Group H: Belgium · Egypt · Iran · New Zealand ───────────────────────
  537363: { stadium: 'Lumen Field',             city: 'Seattle',          country: 'USA',     countryCode: 'US' },
  537364: { stadium: 'BC Place',                city: 'Vancouver',        country: 'Canada',  countryCode: 'CA' },
  537365: { stadium: 'Mercedes-Benz Stadium',   city: 'Atlanta',          country: 'USA',     countryCode: 'US' },
  537366: { stadium: 'Arrowhead Stadium',       city: 'Kansas City',      country: 'USA',     countryCode: 'US' },
  537367: { stadium: "Levi's Stadium",          city: 'San Francisco',    country: 'USA',     countryCode: 'US' },
  537368: { stadium: 'BMO Field',               city: 'Toronto',          country: 'Canada',  countryCode: 'CA' },

  // ── Group I: France · Senegal · Iraq · Norway ───────────────────────────
  537391: { stadium: 'MetLife Stadium',         city: 'New York',         country: 'USA',     countryCode: 'US' },
  537392: { stadium: 'AT&T Stadium',            city: 'Dallas',           country: 'USA',     countryCode: 'US' },
  537393: { stadium: 'SoFi Stadium',            city: 'Los Angeles',      country: 'USA',     countryCode: 'US' },
  537394: { stadium: 'Gillette Stadium',        city: 'Boston',           country: 'USA',     countryCode: 'US' },
  537395: { stadium: 'Lincoln Financial Field', city: 'Philadelphia',     country: 'USA',     countryCode: 'US' },
  537396: { stadium: 'Mercedes-Benz Stadium',   city: 'Atlanta',          country: 'USA',     countryCode: 'US' },

  // ── Group J: Argentina · Algeria · Austria · Jordan ─────────────────────
  537397: { stadium: 'Hard Rock Stadium',       city: 'Miami',            country: 'USA',     countryCode: 'US' },
  537398: { stadium: 'BC Place',                city: 'Vancouver',        country: 'Canada',  countryCode: 'CA' },
  537399: { stadium: 'MetLife Stadium',         city: 'New York',         country: 'USA',     countryCode: 'US' },
  537400: { stadium: 'Lumen Field',             city: 'Seattle',          country: 'USA',     countryCode: 'US' },
  537401: { stadium: 'Arrowhead Stadium',       city: 'Kansas City',      country: 'USA',     countryCode: 'US' },
  537402: { stadium: 'AT&T Stadium',            city: 'Dallas',           country: 'USA',     countryCode: 'US' },

  // ── Group K: Portugal · Uzbekistan · Colombia · Congo DR ────────────────
  537403: { stadium: 'Gillette Stadium',        city: 'Boston',           country: 'USA',     countryCode: 'US' },
  537404: { stadium: 'Hard Rock Stadium',       city: 'Miami',            country: 'USA',     countryCode: 'US' },
  537405: { stadium: 'Lincoln Financial Field', city: 'Philadelphia',     country: 'USA',     countryCode: 'US' },
  537406: { stadium: 'Lumen Field',             city: 'Seattle',          country: 'USA',     countryCode: 'US' },
  537407: { stadium: 'SoFi Stadium',            city: 'Los Angeles',      country: 'USA',     countryCode: 'US' },
  537408: { stadium: 'Mercedes-Benz Stadium',   city: 'Atlanta',          country: 'USA',     countryCode: 'US' },

  // ── Group L: England · Croatia · Ghana · Panama ──────────────────────────
  537409: { stadium: 'MetLife Stadium',         city: 'New York',         country: 'USA',     countryCode: 'US' },
  537410: { stadium: 'AT&T Stadium',            city: 'Dallas',           country: 'USA',     countryCode: 'US' },
  537411: { stadium: 'Mercedes-Benz Stadium',   city: 'Atlanta',          country: 'USA',     countryCode: 'US' },
  537412: { stadium: 'Hard Rock Stadium',       city: 'Miami',            country: 'USA',     countryCode: 'US' },
  537413: { stadium: 'Gillette Stadium',        city: 'Boston',           country: 'USA',     countryCode: 'US' },
  537414: { stadium: 'BC Place',                city: 'Vancouver',        country: 'Canada',  countryCode: 'CA' },
};

export function getVenue(fixtureId: number): VenueInfo | null {
  return VENUES[fixtureId] ?? null;
}
