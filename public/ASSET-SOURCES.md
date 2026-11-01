# Asset and template research — Rat King

Checked on 2026-11-01. Only the Kenney UI Pack was downloaded; references listed below are not automatically incorporated into the game.

## Recommended resources

| Resource | Source | License | Suitable use |
| --- | --- | --- | --- |
| Kenney UI Pack 2.0 | https://kenney.nl/assets/ui-pack | CC0; verified in the downloaded License.txt | Rounded buttons, panels, icons, UI sounds. Local folder: `kenney-ui-pack/`. |
| Kenney Pattern Pack | https://kenney.nl/assets/pattern-pack | CC0 listed on the original page | Quiet menu backgrounds and subtle texture; 80 patterns with vector sources. Not downloaded. |
| Rodents (Rat Rework), AntumDeluge / Reemax | https://opengameart.org/content/rodents-rat-rework | CC BY 3.0 / CC BY-SA 3.0 listed on original page | Top-down anatomy/movement reference, 32px, four directions. Pixel style differs from requested cartoon style. Credit Tuomo Untinen (Reemax) and Jordan Irwin (AntumDeluge) if used under CC BY. Not downloaded. |
| Mouse, allen yatsura | https://opengameart.org/content/mouse-0 | CC0 listed on original page | Tiny pixel mouse with idle/walk animations; useful placeholder only, not recommended for final art. Not downloaded. |
| Rat icon, Delapouite | https://game-icons.net/1x1/delapouite/rat.html | CC BY 3.0 listed on original page | Menu / bestiary icon, not a top-down animated sprite. Credit Delapouite and Game-icons.net if used. Not downloaded. |

## Code / level references

- Official Phaser TypeScript + Vite starter: https://github.com/phaserjs/template-vite-ts — MIT, verified at https://raw.githubusercontent.com/phaserjs/template-vite-ts/main/LICENSE. Preserve copyright / license if copying. The starter contains an optional `log.js` reporting script; use its no-log commands or omit it from an adapted starter.
- Arrow Escape reference: https://github.com/fazal305/Arrow-Escape — generator + solver structure and snake path movement are useful conceptual references. **Current main is PolyForm Noncommercial, not MIT**, despite stale search snippets. Its README states old versions through tag `v1.0.0-mit` remain MIT. Do not copy current source for this commercial-intent project without a suitable license. No source downloaded.

## Proposed visual direction

Original rounded vector-style top-down rats, warm paper / biscuit background, muted dark outlines, small paws and pink ears. Tails should use the rats' stable colors and optional patterns, and remain programmatically drawn for generation and crossing highlights. Use a restrained neutral board so paths and over/under crossings remain readable. The downloaded UI pack is a usable source for interface details and clicks; its whole visual system does not need to be copied.
