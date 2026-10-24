# Design handoff: The Footprint UI

Dan approved a finished design. It lives in `src/components/footprint/` (see its `README.md`), with a live sample at `/design-preview`. This replaces the current dark "baseball card" UI. Do not redesign or restyle anything. Wire real data into these components.

## Do this, in order

1. Run `npm run build` and `npm run test`, then open `/design-preview` locally and confirm it renders. The kit is new files only and touches nothing existing.
2. **Leaderboard:** rebuild `src/app/page.tsx` with `FootprintShell`, `MonthPicker` and `Leaderboard`, using `toFpKpis(kpiResults)` from `computeProScore`. Add month navigation with `?month=YYYY-MM`. Delete `src/app/LeaderboardTable.tsx` when done.
3. **Tech card:** rebuild `src/app/tech/[id]/page.tsx` with `TechCard`. Add a `detail` sentence and a real `drill` table to every KPI, and 6-month `history`. Remove the old gradient card code.
4. **PIN and protection:**
   - Add `src/app/pin/page.tsx` with `PinScreen` and a server action that checks the hashed PIN (starts as 1234) and sets the session cookie.
   - Add `middleware.ts` that protects every page and API route.
   - Delete or manager-lock everything under `/api/debug` and `/api/setup`.
5. **Manager pages:** `/reviews` (`ReviewQueue`), `/settings` (`KpiSettings`), `/driven-check` (`DrivenCheck`), each with server actions. Pass `isManager` to the Shell for managers so the tabs show.
6. Set `metadata.title` to "The Footprint" and replace the emoji favicon with the `FootprintBadge` mark from `Icons.tsx`.
7. Take screenshots at 375px and 1280px, light and dark, and compare them with `/design-preview`. They should match.
8. Commit, push to GitHub, and deploy from GitHub. Update `docs/PROGRESS.md`.

## Rules

- Any visual change goes in the kit (`footprint.css` or the component), never as one-off styles in a page.
- The KPI set is data, not layout. Driving, Reservice, Prod/Hr, Attendance (or Completion) and Stars all work through `KPI_META`.
- Keep `/design-preview` behind the PIN, or remove it before go-live.
