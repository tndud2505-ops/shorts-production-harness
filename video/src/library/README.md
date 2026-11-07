# SVG library entry point

Import the current character, balloons and props through `index.ts`, or from their component source. See [the pattern](../../../wiki/patterns/illustrated-developer-story.md) and [operations](../../../wiki/OPERATIONS.md).

`video/public/illustrations/manifest.json` maps all 36 exported SVG files to source components and props. Edit the TSX source, run `node scripts/production.mjs assets`, and refresh the relevant pose/type sheet. This library belongs to the current illustrated pattern; new video methods need not use it.
