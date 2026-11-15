# Login design and motion

Implemented from the approved desktop/mobile mockups on 2026-11-15.

- Desktop: compact glass form, one static team illustration, matching geometry in light/dark themes.
- Below 900px: simple solid background, no illustration or motion.
- Decorative notes float 7px, calendar tilts 2 degrees, checkmark pulses, dotted path flows. Motion can be paused and respects prefers-reduced-motion.
- No internal form scrolling. Standard desktop/mobile viewports fit; very short screens and on-screen keyboards retain natural document scrolling so controls remain reachable.
- Authentication, session restoration and import recovery behavior are preserved. Google, registration and password reset remain visual previews.

## Image assets

Created with the built-in imagegen tool; alpha transparency is preserved in optimized WebP outputs. Both themes use these same files to keep geometry identical.

- frontend/public/images/auth-team.webp — 1400x933, 196408 bytes. Static team layer.
- frontend/public/images/auth-workflow-atlas.webp — 1152x768, 92382 bytes. Regular 3x2 atlas: yellow note, purple note, cyan note; calendar, checkmark, flag. CSS selects each cell and animates it independently.

Reference: approved desktop light/dark design generated in this chat.

## Final generation prompts

### Team base layer

Use case: compositing. Asset: production website illustration BASE LAYER with genuine transparent background. Input image is a style and character reference showing light/dark mockups of the same Kanban login page. Recreate ONLY the three coworkers and laptop from the LIGHT preview: standing friendly bearded man at left with blue shirt and tablet gesturing toward seated woman with dark ponytail behind an open silver laptop at center, curly-haired man with glasses seated on right holding a stylus. Same friendly premium soft-3D sculpted illustration style, same poses and blue clothing, same three adult teammates, attractive clean hands and faces. Compact waist-up scene, entire silhouettes visible, a tiny green plant in white pot at lower left, subtle tabletop at bottom fading cleanly to transparent; very subtle short contact shadows only. Transparent space above and around them. NO floating workflow icons, NO calendar, NO notes, NO checkmarks, NO flags, NO connector lines, NO background foliage, NO backdrop or colored rectangle, NO UI, NO letters or numbers, NO watermark. Neutral soft daylight and small cyan edge light, suitable on BOTH a pale light surface and midnight navy page. Team group fills image horizontally, tightly composed landscape 3:2, transparent outside subjects. Characters are one static base layer; later animations will be separate assets. Crisp high quality edges with real alpha transparency.

### Workflow atlas

Use case: ui-mockup. Asset: single production texture atlas for a website, genuine transparent background. Input image is only STYLE reference for premium soft-3D floating workflow motifs in the Kanban desktop login mockup. Create ONE atlas in a precise 3 column by 2 row grid on transparent canvas, landscape 3:2 aspect, equal square cells. Exactly ONE centered isolated object per cell, each contained within center 65 percent with generous transparent margin. All objects evenly lit, front facing with slight isometric depth, consistent glossy clay soft-3D style matching reference. TOP LEFT cell: yellow square sticky note with two short raised orange line marks, slight curled corner. TOP MIDDLE cell: violet sticky note with two short lavender line marks. TOP RIGHT cell: cyan sticky note with two short darker cyan line marks. BOTTOM LEFT cell: white and violet desk calendar with purple rings, simple square date blocks but NO text or numerals. BOTTOM MIDDLE cell: vivid green round badge with raised white checkmark. BOTTOM RIGHT cell: little yellow waving milestone flag on slender violet pole and violet diamond base. No other objects, no people, no connecting lines, no shadows extending into other cells, no labels, NO grid lines, NO painted background. True transparent alpha background. Art must remain legible against light blue-gray and dark navy. Atlas is exactly 3x2 aligned regular grid, nothing touches cell boundaries.


## Verification — 2026-11-15

- ESLint passed; 26 Vitest tests passed; Next.js production/static build and Docker image build passed.
- All 14 distinct Playwright scenarios passed on the final application image across focused runs: seven login layout/motion checks, six board/persistence/AI checks, and one sign-in/import/session/logout check against a fresh, health-checked container.
- Login layout checks cover 1440x900, 1280x720, 1920x1080, 390x844, 375x667 and 360x640 in both themes and languages, with no document overflow or internal panel scrolling at those sizes.
- Motion was observed running, manually paused/resumed and disabled by prefers-reduced-motion.
- Older board tests now select Password exactly, distinguishing it from Show password. Docker login and initialization make multiple requests; trace showed the combined chain exceeding five seconds, so these integration tests use a 15-second expectation deadline and 60-second test deadline.
- The first request of one run preceded container readiness (ERR_EMPTY_RESPONSE). The final sign-in/import/session/logout check passed after polling /api/health before starting.
- Temporary QA container used disposable data. The local service on port 8000 was replaced with the final image using the existing data bind mount.

## Motion control update — 2026-11-15

At the user’s request, the manual pause/play control has been removed. Decorative motion remains enabled and still respects prefers-reduced-motion; mobile keeps its plain background.
