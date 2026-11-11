# Daily targets (approved 2026-11-11)

1. Migration 006: user_settings with ONLY the four daily targets
   (daily_kcal 1-10000, protein/carbs/fat 0-1000, all optional, blank =
   no target) plus updated_at. user_id is the primary key. Own-row RLS.
   Weekly budget, week start and timezone come later with the features
   that use them. Timezone stays in the cookie for now; update the
   comment in timezone-sync.tsx.
2. Pure, tested /lib: target validation (blank = no target, decimals
   rounded to whole numbers, "1,000" ambiguous, kcal 0 refused) and
   progress(total, target). When a food is missing calories, say
   "up to 860 kcal left".
3. /settings screen with a "Daily targets" tile, 2x2 inputs like the
   food form, a 4/4/9 soft hint if macros don't match the calorie
   target by more than 20% (like the food form), and a gentle grey note
   when calories are under 1,200: "That's lower than most adults need.
   If it's intentional, it may be worth checking with a doctor or
   dietitian." Neither blocks saving. Reached by a grey "Settings" link
   in the header next to Log out.
4. Today: big number "860 kcal left" when a target is set; calories
   eaten on past days or with no target. Thin matcha-soft bars with the
   amount always written; bars are aria-hidden. No bars on past days
   (targets aren't stored per day yet). Going over: plain "120 kcal
   over" in normal ink, no red. Protein says "Goal reached" in matcha.
   "Set daily targets" link when none are set.
5. Unit tests only, no Playwright yet. Add "targets per day" to the
   deferred list in the reviewer's memory.

## Layouts (approved)

/settings: header "Settings" + Log out. Grey "Daily targets" tile:
"Leave any blank for no target.", 2x2 grid Calories / Protein (matcha
label) / Carbs / Fat with the unit inside each input, grey hint line,
errors under each field, full-width matcha "Save targets" button,
grey "Saved" status after saving. Loading: placeholder tile.

Today tile: target set and today -> big "860 kcal left" (or "up to",
or "120 kcal over" in ink), grey "1,140 of 2,000 eaten", thin bar.
Macros as stacked rows: label left, "62 of 140 g" right, bar under.
No target for a macro -> "62 g", no bar. Past days / no calorie target
-> calories eaten as the big number. No targets at all -> matcha
"Set daily targets" link at the bottom.
