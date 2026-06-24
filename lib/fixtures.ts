/**
 * Curated FIFA World Cup 2026 fixtures, by round. Static + reliable (no live
 * API). Team names line up with `TEAMS` in gaffer.ts so a user's stored takes
 * can be matched to each fixture. Knockout matchups are plausible seedings —
 * the point is a scrollable feed the memory layer can personalise.
 */
export type Round =
  | "Group Stage"
  | "Round of 32"
  | "Round of 16"
  | "Quarter-final"
  | "Semi-final"
  | "Final";

export const ROUNDS: Round[] = [
  "Group Stage",
  "Round of 32",
  "Round of 16",
  "Quarter-final",
  "Semi-final",
  "Final",
];

export interface Team {
  name: string;
  flag: string;
}

export interface Fixture {
  id: string;
  round: Round;
  group?: string;
  date: string; // ISO date
  time: string; // local kickoff label
  venue: string;
  home: Team;
  away: Team;
  homeForm?: string; // last 5, most recent last
  awayForm?: string;
  note?: string;
}

const T: Record<string, Team> = {
  BRA: { name: "Brazil", flag: "🇧🇷" },
  ARG: { name: "Argentina", flag: "🇦🇷" },
  FRA: { name: "France", flag: "🇫🇷" },
  ENG: { name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  ESP: { name: "Spain", flag: "🇪🇸" },
  GER: { name: "Germany", flag: "🇩🇪" },
  POR: { name: "Portugal", flag: "🇵🇹" },
  NED: { name: "Netherlands", flag: "🇳🇱" },
  USA: { name: "USA", flag: "🇺🇸" },
  MEX: { name: "Mexico", flag: "🇲🇽" },
  CRO: { name: "Croatia", flag: "🇭🇷" },
  MAR: { name: "Morocco", flag: "🇲🇦" },
  BEL: { name: "Belgium", flag: "🇧🇪" },
  ITA: { name: "Italy", flag: "🇮🇹" },
  URU: { name: "Uruguay", flag: "🇺🇾" },
  JPN: { name: "Japan", flag: "🇯🇵" },
};

export const FIXTURES: Fixture[] = [
  // ── Group Stage (final round, upcoming) ──
  {
    id: "g-bra-cro",
    round: "Group Stage",
    group: "Group C",
    date: "2026-06-26",
    time: "21:00 ET",
    venue: "MetLife Stadium, New York",
    home: T.BRA,
    away: T.CRO,
    homeForm: "WWWDW",
    awayForm: "WLDWW",
    note: "Brazil top the group with a win. Croatia need a point.",
  },
  {
    id: "g-eng-usa",
    round: "Group Stage",
    group: "Group D",
    date: "2026-06-26",
    time: "18:00 ET",
    venue: "Mercedes-Benz Stadium, Atlanta",
    home: T.ENG,
    away: T.USA,
    homeForm: "DWWLD",
    awayForm: "WDLWL",
    note: "Winner takes the group; loser may face a giant in R32.",
  },
  {
    id: "g-fra-ned",
    round: "Group Stage",
    group: "Group F",
    date: "2026-06-27",
    time: "15:00 ET",
    venue: "SoFi Stadium, Los Angeles",
    home: T.FRA,
    away: T.NED,
    homeForm: "WWDWW",
    awayForm: "WWWDL",
    note: "Group of Death decider. Mbappé vs the Dutch press.",
  },
  {
    id: "g-esp-mar",
    round: "Group Stage",
    group: "Group H",
    date: "2026-06-27",
    time: "21:00 ET",
    venue: "AT&T Stadium, Dallas",
    home: T.ESP,
    away: T.MAR,
    homeForm: "WWWWD",
    awayForm: "WWDWW",
    note: "Rematch of the 2022 last-16 shock. Morocco believe.",
  },

  // ── Round of 32 ──
  {
    id: "r32-arg-jpn",
    round: "Round of 32",
    date: "2026-06-29",
    time: "21:00 ET",
    venue: "NRG Stadium, Houston",
    home: T.ARG,
    away: T.JPN,
    homeForm: "WWWWW",
    awayForm: "WWDWW",
    note: "Holders begin the defence. Japan are nobody's easy draw.",
  },
  {
    id: "r32-ger-bel",
    round: "Round of 32",
    date: "2026-06-30",
    time: "18:00 ET",
    venue: "Arrowhead Stadium, Kansas City",
    home: T.GER,
    away: T.BEL,
    homeForm: "WDWWL",
    awayForm: "WWLDW",
    note: "Two heavyweights meeting far too early.",
  },
  {
    id: "r32-por-uru",
    round: "Round of 32",
    date: "2026-07-01",
    time: "21:00 ET",
    venue: "Lumen Field, Seattle",
    home: T.POR,
    away: T.URU,
    homeForm: "WWDWW",
    awayForm: "WDWLW",
    note: "South American grit vs Portugal's golden generation, again.",
  },

  // ── Round of 16 ──
  {
    id: "r16-bra-mar",
    round: "Round of 16",
    date: "2026-07-04",
    time: "16:00 ET",
    venue: "Hard Rock Stadium, Miami",
    home: T.BRA,
    away: T.MAR,
    homeForm: "WWWWW",
    awayForm: "WWDWW",
    note: "Dark horse meets favourite. Someone's bracket breaks.",
  },
  {
    id: "r16-fra-eng",
    round: "Round of 16",
    date: "2026-07-05",
    time: "20:00 ET",
    venue: "Levi's Stadium, San Francisco",
    home: T.FRA,
    away: T.ENG,
    homeForm: "WWDWW",
    awayForm: "DWWWD",
    note: "The tie everyone feared the draw would produce.",
  },
  {
    id: "r16-arg-esp",
    round: "Round of 16",
    date: "2026-07-06",
    time: "20:00 ET",
    venue: "Gillette Stadium, Boston",
    home: T.ARG,
    away: T.ESP,
    homeForm: "WWWWW",
    awayForm: "WWWWD",
    note: "World champions vs European champions. Heavyweight.",
  },

  // ── Quarter-finals ──
  {
    id: "qf-bra-fra",
    round: "Quarter-final",
    date: "2026-07-10",
    time: "20:00 ET",
    venue: "AT&T Stadium, Dallas",
    home: T.BRA,
    away: T.FRA,
    homeForm: "WWWWW",
    awayForm: "WWWWW",
    note: "The 2006 ghosts. A final in all but name.",
  },
  {
    id: "qf-arg-ger",
    round: "Quarter-final",
    date: "2026-07-11",
    time: "16:00 ET",
    venue: "MetLife Stadium, New York",
    home: T.ARG,
    away: T.GER,
    homeForm: "WWWWW",
    awayForm: "WDWWW",
    note: "2014 final rematch. Messi's last dance against Germany?",
  },

  // ── Semi-finals ──
  {
    id: "sf-bra-arg",
    round: "Semi-final",
    date: "2026-07-14",
    time: "20:00 ET",
    venue: "AT&T Stadium, Dallas",
    home: T.BRA,
    away: T.ARG,
    homeForm: "WWWWW",
    awayForm: "WWWWW",
    note: "The Superclásico. For a place in the final.",
  },

  // ── Final ──
  {
    id: "final",
    round: "Final",
    date: "2026-07-19",
    time: "15:00 ET",
    venue: "MetLife Stadium, New York",
    home: T.BRA,
    away: T.FRA,
    homeForm: "WWWWW",
    awayForm: "WWWWW",
    note: "🏆 The 2026 FIFA World Cup Final.",
  },
];

export function fixturesByRound(): { round: Round; fixtures: Fixture[] }[] {
  return ROUNDS.map((round) => ({
    round,
    fixtures: FIXTURES.filter((f) => f.round === round),
  })).filter((g) => g.fixtures.length > 0);
}
