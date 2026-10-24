# The Footprint design kit

Finished, tested UI for every screen of The Footprint. Pages fetch data and pass it in as props; the kit owns all styling. **Use these components as they are. Do not restyle pages with Tailwind or inline styles.** If a screen needs a visual change, change it here in the kit so every page stays consistent.

Live preview with sample data: run `npm run dev` and open `/design-preview` (also `/design-preview/tech/chris`, `/design-preview/pin`, `/design-preview/manager`).

## Files

| File | What it is |
|---|---|
| `footprint.css` | All styles. Every class starts with `fp-`, every color is a token on `.fp`, and light and dark themes are both designed. |
| `fonts.ts` | Nexa Rust Sans (brand font from `/public/fonts`), Barlow Condensed, Public Sans. Applied by the Shell, so `app/layout.tsx` needs no change. |
| `types.ts` | Data shapes: `FpTech`, `FpKpi`, `FpDrill`, `FpReview`, `FpKpiSetting`, `FpParityRow`. |
| `format.ts` | `toFpKpis()` converts the engine's `KpiResult[]` into `FpKpi[]`. Also has `statusOf()` (90+ on target, 75 to 89 close, under 75 needs work) and `KPI_META` (label, units and goal text per KPI key). |
| `Shell.tsx` | Page frame: top bar (wordmark, month, "Updated 9:05 AM") and tabs. Manager tabs show only when `isManager`. |
| `Leaderboard.tsx` | Podium (top 3) plus ranked rows. Branch filter and sort. Desktop has KPI columns; phones stack KPI chips under each name. |
| `TechCard.tsx` | Tech scorecard: sticker photo, ProScore dial, rank, biggest opportunity, KPI rows with drill-down tables, ProScore trend. |
| `PinScreen.tsx` | Team PIN keypad. |
| `ReviewQueue.tsx` | Manager review queue with tech dropdown and "Not a tech review". |
| `KpiSettings.tsx` | Manager KPI on/off, goal, weight, team-board visibility. |
| `DrivenCheck.tsx` | Ours vs Driven per tech, with xlsx upload hook and verdict. |
| `MonthPicker.tsx`, `ScoreDial.tsx`, `Photo.tsx`, `Icons.tsx` | Building blocks used above. |
| `sample.ts` | Sample data for `/design-preview` only. Never import it in real pages. |

## Wiring the real pages

### Leaderboard (`src/app/page.tsx`)

`getLeaderboard()` already calls `computeProScore(inputs)`. Keep its `kpiResults` and build `FpTech` objects:

```tsx
import { FootprintShell, Leaderboard, MonthPicker, toFpKpis, type FpTech } from "@/components/footprint";

// inside the techs.map(...)
const { proscore, proscoreRaw, kpiResults } = computeProScore(inputs);
const kpis = toFpKpis(kpiResults, undefined, {
  reservice: { detail: `${reserviceCount} reservices charged to you on ${denominator} completed services.` },
  // attendance: { private: true },   // counts toward ProScore, hidden from leaderboard columns
});
const tech: FpTech = { id: t.id, name: t.name, photoUrl: t.photoUrl, branch: branchName, rank, proscore, kpis };

// page
<FootprintShell activeTab="leaderboard" periodLabel="October 2026 · Day 17 of 31" updatedLabel={`Updated ${lastSyncTime}`} stale={syncIsOld} isManager={isManager} reviewsWaiting={unassignedCount}>
  <div className="fp-toolbar">
    <MonthPicker label="October 2026" prevHref="/?month=2026-09" nextHref={null} />
  </div>
  <Leaderboard techs={techs} branches={["Boise", "Portland"]} />
</FootprintShell>
```

Rank comes from the engine's `denseRank`. Pass techs sorted by ProScore.

### Tech card (`src/app/tech/[id]/page.tsx`)

```tsx
<FootprintShell periodLabel={period} updatedLabel={updated}>
  <TechCard tech={tech} totalTechs={count} monthLabel="October 2026" />
</FootprintShell>
```

- Give each KPI a `detail` sentence and a `drill` table built from real records (`toFpKpis(..., extras)`). Examples:
  - **Reservice:** each reservice charged, with date, account number, original service and who ran it.
  - **Prod/Hr:** production and on-site hours by service type.
  - **Completion or attendance:** counts by status.
  - **Driving:** events by week.
- Show account numbers, never customer phone numbers or addresses.
- `history`: the last 6 months of ProScore from `MonthlyScore`, oldest first.

### PIN (`src/app/pin/page.tsx` plus `middleware.ts`)

`PinScreen` takes `onSubmit(pin) => Promise<{ ok, error? }>`. Pass a server action that checks the hashed PIN, sets the iron-session cookie (30 days), and redirects to `/`. The middleware sends anyone without the cookie to `/pin`, and protects every page and API route (manager routes also need manager sign-in).

### Manager pages

Each component takes data plus an async save callback. Pass server actions.
- `/reviews`: `ReviewQueue`. `onAssign(reviewId, techId | "none" | null)`, where null means go back to the auto match.
- `/settings`: `KpiSettings`. `onSave(settings)`.
- `/driven-check`: `DrivenCheck`. `onUpload(file)` parses Driven's xlsx export (Driven names files one month behind the page), and `onSetDriven(techId, value)` saves a typed score.

Render manager pages with `isManager` on the Shell so the tabs appear.

## Adding a KPI later

1. Add the key to the scoring engine.
2. Add a line to `KPI_META` in `format.ts`: label, short, abbr (a tiny phone label of 6 characters or fewer), source, format, goal.

The leaderboard columns, phone chips, tech card and settings pick it up automatically.

## Notes

- Photos: `photoUrl` like `/photos/Larry Alexander.jpg` works as-is (spaces are encoded). Missing photos show initials on Bigfoot orange.
- Theme follows the phone's light or dark setting. Pass `theme="light"` to the Shell to force one.
- Everything is tested at 360px to 1280px wide with no sideways scrolling.
