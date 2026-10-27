# Assets accessibility review
Date: October 26, 2026
Target: WCAG 2.2 AA. Scope: Assets component cards and their surrounding browser.

## Fixed
- Escape in component options now dismisses that disclosure first, returns focus to its trigger, and leaves Assets open (keyboard operation / predictable focus).
- Options close when focus leaves, and only one disclosure stays open.
- Options targets increased from 24 to 32 CSS pixels; action buttons have a 32px minimum height.
- Long component names wrap instead of being visually truncated.
- Grid columns can shrink below 160px when needed; forced-colors mode retains thumbnail boundaries and option indicators.

## Verified
- Enter and Space open the options disclosure.
- Tab reaches the named Insert action. Escape restores focus to the options trigger.
- Escape with no disclosure open closes Assets and restores focus to its navigation button.
- Search and page filter have accessible names; results use a status region.
- Native controls inside thumbnails have inert and aria-hidden attributes and are absent from the accessibility tree.
- Visible keyboard focus ring appears on disclosure controls.
- Card text #222 on white: 15.91:1. Secondary text #666 on white: 5.74:1. Both exceed 4.5:1.
- Build and three asset unit tests pass.

## Remaining verification
This is a focused review, not a full-app compliance certification. No automated axe scan or real VoiceOver/NVDA speech test was run. Full 200% zoom, narrow viewport, floating-window mode, and assistive-technology testing still need coverage. User-authored component colors are preserved in thumbnails; the editor cannot assume those designs are accessible.
