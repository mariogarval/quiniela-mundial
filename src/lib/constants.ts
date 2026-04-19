export const LOCK_DATE_ISO = "2026-06-11T19:00:00.000Z"; // 2026-06-11 13:00 GMT-6

export type Team = { code: string; name: string; flag: string };

export const GROUPS: Record<string, Team[]> = {
  A: [
    { code: "MEX", name: "México", flag: "🇲🇽" },
    { code: "RSA", name: "Sudáfrica", flag: "🇿🇦" },
    { code: "KOR", name: "Corea del Sur", flag: "🇰🇷" },
    { code: "CZE", name: "Rep. Checa", flag: "🇨🇿" },
  ],
  B: [
    { code: "CAN", name: "Canadá", flag: "🇨🇦" },
    { code: "QAT", name: "Qatar", flag: "🇶🇦" },
    { code: "SUI", name: "Suiza", flag: "🇨🇭" },
    { code: "BIH", name: "Bosnia-Herzegovina", flag: "🇧🇦" },
  ],
  C: [
    { code: "BRA", name: "Brasil", flag: "🇧🇷" },
    { code: "MAR", name: "Marruecos", flag: "🇲🇦" },
    { code: "SCO", name: "Escocia", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
    { code: "HAI", name: "Haití", flag: "🇭🇹" },
  ],
  D: [
    { code: "USA", name: "Estados Unidos", flag: "🇺🇸" },
    { code: "TUR", name: "Türkiye", flag: "🇹🇷" },
    { code: "AUS", name: "Australia", flag: "🇦🇺" },
    { code: "PAR", name: "Paraguay", flag: "🇵🇾" },
  ],
  E: [
    { code: "GER", name: "Alemania", flag: "🇩🇪" },
    { code: "ECU", name: "Ecuador", flag: "🇪🇨" },
    { code: "CIV", name: "Costa de Marfil", flag: "🇨🇮" },
    { code: "CUW", name: "Curaçao", flag: "🇨🇼" },
  ],
  F: [
    { code: "NED", name: "Países Bajos", flag: "🇳🇱" },
    { code: "JPN", name: "Japón", flag: "🇯🇵" },
    { code: "SWE", name: "Suecia", flag: "🇸🇪" },
    { code: "TUN", name: "Túnez", flag: "🇹🇳" },
  ],
  G: [
    { code: "BEL", name: "Bélgica", flag: "🇧🇪" },
    { code: "EGY", name: "Egipto", flag: "🇪🇬" },
    { code: "IRN", name: "Irán", flag: "🇮🇷" },
    { code: "NZL", name: "Nueva Zelanda", flag: "🇳🇿" },
  ],
  H: [
    { code: "ESP", name: "España", flag: "🇪🇸" },
    { code: "URU", name: "Uruguay", flag: "🇺🇾" },
    { code: "KSA", name: "Arabia Saudita", flag: "🇸🇦" },
    { code: "CPV", name: "Cabo Verde", flag: "🇨🇻" },
  ],
  I: [
    { code: "FRA", name: "Francia", flag: "🇫🇷" },
    { code: "SEN", name: "Senegal", flag: "🇸🇳" },
    { code: "NOR", name: "Noruega", flag: "🇳🇴" },
    { code: "IRQ", name: "Irak", flag: "🇮🇶" },
  ],
  J: [
    { code: "ARG", name: "Argentina", flag: "🇦🇷" },
    { code: "AUT", name: "Austria", flag: "🇦🇹" },
    { code: "ALG", name: "Argelia", flag: "🇩🇿" },
    { code: "JOR", name: "Jordania", flag: "🇯🇴" },
  ],
  K: [
    { code: "POR", name: "Portugal", flag: "🇵🇹" },
    { code: "COL", name: "Colombia", flag: "🇨🇴" },
    { code: "COD", name: "DR Congo", flag: "🇨🇩" },
    { code: "UZB", name: "Uzbekistán", flag: "🇺🇿" },
  ],
  L: [
    { code: "ENG", name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    { code: "CRO", name: "Croacia", flag: "🇭🇷" },
    { code: "GHA", name: "Ghana", flag: "🇬🇭" },
    { code: "PAN", name: "Panamá", flag: "🇵🇦" },
  ],
};

export const GROUP_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const;
export type GroupLetter = (typeof GROUP_LETTERS)[number];

// Round-robin order per group (indices into teams[]): 1v2, 3v4, 1v3, 2v4, 1v4, 2v3
export const GROUP_ROUND_ROBIN: [number, number][] = [
  [0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2],
];

export const PHASES = {
  GROUP: "group",
  R32: "r32",
  R16: "r16",
  QF: "qf",
  SF: "sf",
  THIRD: "third",
  FINAL: "final",
} as const;

export type Phase = (typeof PHASES)[keyof typeof PHASES];

export const SCORING = {
  group: { exact: 5, result: 3, winnerBonus: 5, runnerUpBonus: 3, thirdBonus: 2 },
  knockout: { winnerExact: 8, winnerOnly: 5, wildcard: 2, championBonus: 15 },
};
