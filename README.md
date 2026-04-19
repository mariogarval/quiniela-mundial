# Quiniela Mundial 2026

Web app de quiniela del Mundial 2026. Cada usuario predice los 48 partidos de la fase de grupos, mira tabla predictiva en tiempo real, su Octavos de Final se arma automáticamente a partir de sus predicciones, y continúa hasta la Final.

## Stack

- **Next.js 14** (App Router)
- **Supabase** (Postgres + RLS)
- **Tailwind CSS**
- **TypeScript**
- **Vercel** (deploy)

## Mecánica principal

1. Admin crea una quiniela (free = 15 jugadores max, business = ilimitado + Slack).
2. Jugadores entran con el código de 6 caracteres antes del **13 Jun 2026 00:00 GMT-6**.
3. Cada jugador predice los **48 partidos de grupos** — la tabla de posiciones se actualiza en tiempo real usando los tiebreakers oficiales FIFA 2026 (Pts → GD → GF → H2H Pts → H2H GD → H2H GF).
4. Los 2 primeros de cada grupo auto-pueblan el **Octavos de Final personal** del jugador (R16 → QF → SF → 3er Puesto → Final).
5. Cada fase se cascadea desde la anterior. El jugador envía su quiniela completa y queda bloqueada permanentemente.
6. A medida que el admin ingresa resultados reales, el motor de puntos recalcula el ranking de todas las quinielas.

## Sistema de puntos

**Fase de grupos:**
- Resultado exacto: 5 pts
- Ganador/empate correcto: 3 pts
- Ganador de grupo correcto: +5 bonus
- Sub-campeón de grupo correcto: +3 bonus
- Tercer puesto correcto: +2 bonus

**Eliminatorias (Option A strict + wildcard):**
- Ganador + marcador exacto en el slot del jugador: 8 pts
- Ganador correcto (marcador no): 5 pts
- Wildcard (el ganador real aparece en esa fase pero en otro slot del jugador): 2 pts
- Campeón correcto: +15 bonus

## Setup

### 1. Dependencias

```bash
npm install
```

### 2. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Copia `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y el `SUPABASE_SERVICE_ROLE_KEY` desde *Project Settings → API*.
3. Aplica el schema: abre el SQL editor de Supabase y corre `supabase/migrations/00001_initial_schema.sql`. Esto crea todas las tablas y siembra los 48 partidos de grupos + las 16 llaves de eliminatoria vacías.

### 3. Variables de entorno

```bash
cp .env.local.example .env.local
# Llena NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#       SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD
```

### 4. Desarrollo

```bash
npm run dev
```

Abre <http://localhost:3000>.

### 5. Build

```bash
npm run build
npm run start
```

## Estructura del proyecto

```
src/
├── app/
│   ├── page.tsx                     # Landing
│   ├── admin/                       # Panel admin (cookie-gated)
│   ├── pool/
│   │   ├── create/                  # Crear quiniela
│   │   ├── join/                    # Unirse con código
│   │   └── [id]/                    # Lobby + grupos + bracket + ranking + perfil + share
│   └── api/
│       ├── pool/                    # POST=crear, PUT=unirse
│       ├── predictions/             # GET/POST grupos
│       ├── bracket/                 # POST eliminatorias + submit
│       └── admin/
│           ├── login/               # Cookie httpOnly
│           └── results/             # POST resultado real → recompute puntos
├── components/
│   ├── primitives.tsx               # Card, Btn, ProgressBar, ScoreInput, Flag, Pill
│   ├── BottomNav.tsx
│   ├── CountdownTimer.tsx
│   ├── MatchRow.tsx
│   ├── StandingsTable.tsx           # Tabla en vivo con tiebreakers FIFA
│   ├── GruposClient.tsx             # Fase de grupos
│   ├── BracketClient.tsx            # Llave con cascade
│   ├── ShareClient.tsx
│   ├── Confetti.tsx
│   └── AdminResults.tsx
└── lib/
    ├── constants.ts                 # Tokens, grupos, LOCK_DATE_ISO
    ├── standings.ts                 # Tiebreakers FIFA 2026
    ├── bracket.ts                   # Cascade logic (R16 pairs, nextRound, third-place)
    ├── scoring.ts                   # Reglas de puntos
    ├── scoring-engine.ts            # Recomputo completo del ranking
    ├── supabase.ts                  # Cliente browser + server
    ├── session.ts                   # localStorage user identity (V1)
    └── adminAuth.ts                 # Cookie-based admin gate

supabase/migrations/
└── 00001_initial_schema.sql         # Schema + seed (48 partidos + shells knockout)
```

## Panel admin

1. Visita `/admin` e ingresa `ADMIN_PASSWORD` (env var).
2. En `/admin/dashboard` verás:
   - Estadísticas de pools (total / free / business / con pago).
   - Lista completa de quinielas con códigos.
   - Formulario para ingresar **resultados reales** por fase. Cada guardado dispara `recomputeAllPoints()` y actualiza todos los rankings.
3. Para partidos de eliminatoria, ingresa también los códigos de equipo (ej: `ARG`, `FRA`) — estos son los equipos oficiales reales, independientes de las predicciones de cada usuario.

## Notas sobre el formato

El sistema está construido para **8 grupos (A-H) × 4 equipos = 32 equipos, 48 partidos de grupos**. Los 2 primeros de cada grupo → Octavos de Final (R16) → QF → SF → 3er Puesto + Final.

El brief original menciona *Round of 32* y *8 best third-place teams*, lo cual corresponde al formato real de la Copa 2026 (12 grupos). La UI actual sigue el diseño del prototipo que muestra "Octavos de Final" con 8 grupos. Para migrar a 12 grupos:

1. Agrega `I`, `J`, `K`, `L` a `GROUPS` en `src/lib/constants.ts`.
2. Ajusta `buildR16` en `src/lib/bracket.ts` para emparejar 24 clasificados (top 2 + 8 mejores terceros) en 16 partidos R32.
3. Re-ejecuta el SQL migration; la siembra regenera matches al detectar `phase='group'`.
4. Actualiza el total de partidos (de 48 a 72) en las barras de progreso.

## Equipos de ejemplo

La siembra incluye 32 equipos *placeholder* basados en clasificatorios probables. Una vez ocurra el sorteo oficial (diciembre 2025), reemplaza los códigos/nombres en `supabase/migrations/00001_initial_schema.sql` y re-ejecuta el migration.

## Deploy en Vercel

1. `vercel link` en el proyecto.
2. Configura las mismas env vars en el dashboard de Vercel.
3. `vercel --prod`.

## Pendiente para V1.1

- Integración Lemon Squeezy para upgrades ($9 knockout unlock, $29 business).
- Webhook Slack (business).
- Export PDF del leaderboard (business).
- Auth real con Supabase Auth (hoy usa localStorage).
- Edge function para scoring (hoy corre en el route handler del admin).
- Tests (Vitest + RTL).
- `hello@` / auth magic link.
