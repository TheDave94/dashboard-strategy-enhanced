# Oriel principles

The guiding lines for what gets built, what doesn't, and what gets reworked. New features get measured against these. When a feature would violate one, the right move is to redesign — not to ship it and add a footnote.

## 1. Ease + flexibility, both maxed

Non-technical users build complex, customised dashboards **without writing YAML**. That's the value proposition; nothing else competes for priority.

This means:

- Every advanced feature has an editor path. If a feature is YAML-only, it's incomplete.
- The editor uses HA's `<ha-form>` patterns where possible so it feels native.
- Defaults work without configuration. The editor's job is to make exceptions easy, not to be required.
- Discoverability matters: hidden config keys aren't features.

It does **not** mean YAML support goes away. Power users can still hand-edit; the editor and the YAML are equivalent, not exclusive. But the editor must be sufficient on its own.

## 2. HACS plugins are enhancement, never requirement

Every Oriel feature must work in a clean fallback path with zero HACS dependencies. HACS plugins enhance the experience but never gate it.

Concretely:

- **"Less shiny without HACS" is fine.** "Broken without HACS" is not.
- **Auto-detect, don't assume.** Use `customElements.get(tag)` + `window.customCards` at runtime to check what's installed.
- **Fall back silently.** If the user selected a HACS card that isn't installed, emit the built-in default; log a console warning but don't surface an error to the user.
- **Don't sneak hard dependencies.** If a feature reads from a HACS plugin's internal state, it must degrade when the plugin is absent.

The audit gate: pretend HACS plugins for Bubble Card, ApexCharts, decluttering-card, floorplan-card, and every entry in the section-card-registry are uninstalled. Every Oriel feature still works. Less polished maybe, but functional.

## 3. The visual editor is the canonical surface

The YAML config is a representation, not the source of truth. The editor:

- Reads any valid config (including hand-edited YAML) without dropping fields it doesn't recognise
- Writes a clean, sparse YAML (defaults stripped) so users can still hand-edit if they want
- Surfaces every config field that affects behaviour — no hidden knobs

When a new config field gets added, the editor work is part of the feature, not a follow-up. A feature isn't done until the editor exposes it.

## 4. Don't lecture users about positioning

[Oriel positions as a different option, not a replacement for simon42.](README.MD#origin) That framing belongs in README/info.md once, where someone choosing between the two can read it. It does **not** belong as a recurring template appended to issue comments, PR descriptions, or feature replies.

When responding to upstream simon42 issues or PRs: answer the technical question. Mention Oriel only when (a) the feature only exists in Oriel and (b) the conversation invites it. The user-facing pitch is in the README; let it stand on its own.

## 5. Reactive, not speculative

Ship features that respond to real signals:

- Community feedback on upstream simon42 + Oriel issues
- User complaints about workflows that take too many steps
- Discovered gaps in the editor (YAML-only features promoted to editor exposure)

Don't ship "this would be cool" features without a signal that someone needs them. The roadmap is curated, not aspirational. Speculative XL items wait for validation.

## 6. Test the fallback path

Every release verifies the HACS-uninstalled scenario for the features that touch HACS. The Playwright suite covers the live-HA case; unit tests cover the registry detection logic. Both must pass before shipping.

---

These principles get edited when a real situation demands it. Updating them is fine; ignoring them isn't.
