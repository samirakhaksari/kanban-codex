# Board and personal profile

Implemented from the approved light/dark board and profile mockups on 2026-11-15.

- Profile access is available in the physical top-left account button and above Project board in the right sidebar.
- A signed-in profile stores given name, family name and an optional photo in SQLite, separately from login credentials. An unconfigured profile displays the real username, not the mockup's sample name.
- The demo account is not silently mapped onto a sample team member by name. Sample team portraits remain distinct, deterministic illustrations; the account's own uploaded photo is used in its header and profile preview.
- GET/PUT /api/profile select the account from the signed session; client-supplied identity fields are rejected. The additive user_profiles table preserves existing board/team data.
- Photo input accepts PNG/JPEG/WebP up to 5 MiB, crops a square and resizes it to 512x512 in the browser. The server bounds the request body, validates raster data URLs and limits decoded avatar data to 512 KB. SVG and external avatar URLs are rejected. Removing a photo is persisted only on Save.
- Unsaved profile edits require a discard choice before switching views or signing out. Failed saves preserve the draft and previous saved header identity.
- Cards have one actions disclosure; edit, move and delete remain available. Column actions preserve rename/delete. Statistics are available through a compact summary and the separate Reports view. See workspace-controls.md for the updated navigation and chat layout. Board/team persistence and the AI flow remain intact.
- Both languages and themes are retained. Narrow screens scroll the board horizontally inside its own region; the profile form reflows to one column.

## Image generation

Generated with the built-in imagegen tool. Final production asset: frontend/public/images/member-avatars.webp (1024x1024, 116820 bytes). It is a 2x2 portrait atlas: Sara, Arman, Nika, Reza. TeamAvatar selects its cell via CSS. A cropped portrait is also used as a local browser-test upload fixture at frontend/e2e/fixtures/profile.webp; no sample personal profile is saved to production.

Final generation prompt:

Use case: ui-mockup. Asset: ONE production avatar texture atlas for the approved Kanban app. Reference is the approved board mockup; match its four tiny professional illustrated portrait identities and soft 3D style.
Create a precise regular 2 by 2 square grid, 1024 by 1024, each cell exactly 512 by 512 and FULLY FILLED with its own uniform pale pastel background. Each cell contains one centered close-up adult head-and-shoulders portrait. The face and shoulders occupy center 85% of each cell so a circular CSS crop looks attractive. Same head size, eye height and studio lighting in all cells. No margins between cells, no borders, no text, no logos. Not a UI screenshot; just four portrait images in a reusable texture atlas.
TOP LEFT: friendly adult Iranian woman with dark brown ponytail, blue blouse, dark eyes, subtle lilac background. TOP RIGHT: adult Iranian man with short dark hair, neatly trimmed beard, blue shirt, pale blue background. BOTTOM LEFT: adult Iranian woman with dark bob, violet blouse, pale peach background. BOTTOM RIGHT: adult Iranian man with curly dark hair, glasses, teal shirt, pale mint background. Four distinct faces, professional approachable soft 3D portrait illustration, slightly semi-realistic, not children, not anonymous stock photography. Clean forms and strong legibility at tiny avatar sizes. Entire cell background stays filled with pastel, no transparency and no white vignette.



## Verification and rollout — 2026-11-15

- ESLint passed; 26 Vitest tests passed; 55 backend tests passed in Docker. The 10 profile API cases were rechecked against the final backend source after tightening the request-body bound.
- All 17 Playwright scenarios passed together. The three profile scenarios were rechecked after the final compact mobile assistant button and stable-theme screenshots were added.
- Covered photo processing/upload, name persistence, reload and new login, failed-save behavior, cancel, unsaved-edit navigation, invalid format rejection, and narrow-screen document width. Existing board CRUD, member assignment, team persistence and AI tests remain green.
- Visual checks covered Persian desktop light/dark board and profile, English narrow-screen profile, actual top-left identity position, and all five columns fitting at 1600px.
- Profile data was compared before and after restarting the QA server: given name, family name and photo were identical.
- Production database was backed up to data/kanban-before-profile-ad181aa0.sqlite3. Existing board, column, card, team, member and assignment counts were compared before/after the local service update and were unchanged.
- The real local service is healthy on port 8000. The account's initial profile remains empty and displays username user; sample test names/photos were never written to production.
- Existing non-blocking Vite configLoader and Starlette testclient deprecation warnings remain.
