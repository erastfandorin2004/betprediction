export interface SportsDataLeague {
  providerId: number;
  providerCode: string;
  name: string;
  shortName: string | null;
  country: string;
  countryCode: string | null;
  logo: string | null;
  season: number;
  type: string;
  startDate: string | null;
  endDate: string | null;
}

export interface SportsDataTeam {
  providerId: number;
  name: string;
  shortName: string;
  logo: string | null;
  country: string | null;
}

export interface SportsDataFixture {
  providerId: number;
  leagueProviderId: number;
  homeTeam: SportsDataTeam;
  awayTeam: SportsDataTeam;
  startsAt: Date;
  status: string;
  minute: number | null;
  round: string | null;
  scoreHome: number | null;
  scoreAway: number | null;
  halfTimeHome: number | null;
  halfTimeAway: number | null;
  venueName: string | null;
  venueCity: string | null;
}

export abstract class SportsDataProvider {
  abstract getLeagues(): Promise<SportsDataLeague[]>;
  abstract getFixturesByDate(dateFrom: string, dateTo: string): Promise<SportsDataFixture[]>;
}
