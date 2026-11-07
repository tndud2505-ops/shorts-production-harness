---
name: scene-visual-review
description: Review and fix mismatches between narration, expressions, props, balloons, figures and cue timing in an existing illustrated video. Use for scene-art consistency work, with case-specific constraints.
---

# 말과 그림 맞추기

Read the episode's wiki page and the selected implementation pattern. For ep08 start with [its pending review list](../../../wiki/episodes/ep08.md), then [OPERATIONS](../../../wiki/OPERATIONS.md).

Build a sentence→meaning→action/prop→entry/exit mapping. Render the relevant moments and boundary frames; do not accept source code or a contact sheet alone as proof of timing. Distinguish observed mismatches from subjective editorial proposals.

If a required expression, pose or prop does not exist, record an adapt/create requirement in the episode's scene-plan.json instead of substituting unrelated art. Use `scripts/scene-assets.mjs --episode <id>` to inspect the plan; file availability is not semantic or visual approval.

Check character identity in the chosen case, pose-specific speaking mouths, short-lived or invisible art, leftover props from the previous sentence, head-connected balloon tails, data/caption overlap, and actual examples versus hypothetical uses. Reuse only assets that explain the sentence. Ask only where a genuine meaning gap prevents a faithful scene.

Modify component sources, then regenerate dependent SVGs/pose sheets. Keep existing voice/timing for art-only edits. Script changes must update source, synthesis/timing and public preview together; do not silently deliver stale captions. Verify changed frames and a relevant motion interval, then report what was actually observed. Private assets missing means a silent review output, not a fabricated voiced final. Update the case's remaining issues, without turning its visual style into a universal rule.
