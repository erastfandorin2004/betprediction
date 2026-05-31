import type { Score, MatchEvent, FixtureListItem } from './fixture';
import type { PredictionBadge } from './prediction';
export type ClientMessage = {
    type: 'subscribe';
    channel: 'fixture';
    fixtureId: number;
} | {
    type: 'subscribe';
    channel: 'league_live';
    leagueId: number;
} | {
    type: 'unsubscribe';
    channel: 'fixture';
    fixtureId: number;
} | {
    type: 'ping';
};
export type ServerMessage = {
    type: 'fixture_update';
    data: FixtureListItem;
} | {
    type: 'score_update';
    data: {
        fixtureId: number;
        score: Score;
        minute: number;
    };
} | {
    type: 'event';
    data: MatchEvent;
} | {
    type: 'prediction_ready';
    data: {
        fixtureId: number;
        badge: PredictionBadge;
    };
} | {
    type: 'pong';
};
//# sourceMappingURL=ws.d.ts.map