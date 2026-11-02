# Docs Index

Every pre-existing document in the repo, what kind of document it is, and which wiki page synthesizes it. **The wiki is the structured entry point; the files below remain the detailed, dated record.** Many of them are append-only verification logs — read the newest dated section first.

## Legend

| Type | Meaning |
| --- | --- |
| **Guide** | How a feature works / how to use or operate it — mostly current |
| **Reference** | Measurements or catalogs used during implementation |
| **Log** | Dated, append-only verification or audit record — newest section wins |
| **Policy** | Rules for contributors, releases, privacy, licensing |
| **Snapshot** | One-time evaluation at a specific commit |

## Root

| File | Type | Summary | Wiki home |
| --- | --- | --- | --- |
| [README.md](../../README.md) | Guide/Log | ~75 KB feature-by-feature behavior description, run instructions, limits | [Home](Home.md), feature pages |
| [AGENTS.md](../../AGENTS.md) | Policy | Interface requirements; gap-tally rules | [Interface Design Guidelines](Interface-Design-Guidelines.md) |
| [CONTRIBUTING.md](../../CONTRIBUTING.md) | Policy | PR process, full check list, branch protection, site rules | [Contributing and Conventions](Contributing-and-Conventions.md) |
| [CODE_SIGNING.md](../../CODE_SIGNING.md) | Policy | Signing status (unsigned Windows previews; SignPath pending) | [CI/CD and Releases](CI-CD-and-Releases.md) |
| [PRIVACY.md](../../PRIVACY.md) | Policy | Local data, fonts/network requests, team server data | [Desktop App](Desktop-App.md), [Hosting Modes](Hosting-Modes.md) |
| [SECURITY.md](../../SECURITY.md) | Policy | Private advisory reporting | [Contributing and Conventions](Contributing-and-Conventions.md) |
| [PROJECT_IDEAS.md](../../PROJECT_IDEAS.md) | Snapshot | Saved direction and resume notes (2026-10-28) | [Project Status and Roadmap](Project-Status-and-Roadmap.md) |
| `roadmap.json` | Reference | Implemented/remaining scope, latest verification counts | [Project Status and Roadmap](Project-Status-and-Roadmap.md) |
| `inspector-parity.json` | Reference | Observed inspector controls per selection type | [Interface Design Guidelines](Interface-Design-Guidelines.md) |
| [LICENSE](../../LICENSE) | Policy | Pixel Perfect Community License 1.0 | [Contributing and Conventions](Contributing-and-Conventions.md) |

## `docs/`

| File | Type | Summary | Wiki home |
| --- | --- | --- | --- |
| [Interface reference log](../FIGMA_UI_REFERENCE.md) | Reference/Log | Recorded live measurements by feature; approved extensions | [Interface Design Guidelines](Interface-Design-Guidelines.md) |
| [DETACHABLE_PANELS.md](../DETACHABLE_PANELS.md) | Guide/Log | Parent windows, icon docks, side flyouts, saved layouts and verification | [Panel Workspace](Panel-Workspace.md) |
| [CAPABILITY_MATRIX.md](../CAPABILITY_MATRIX.md) | Log | Status source for roadmap: engine / UI / visual / installed per capability | [Project Status and Roadmap](Project-Status-and-Roadmap.md), [Testing and Verification](Testing-and-Verification.md) |
| [TT-Design-System-Gaps.md](../TT-Design-System-Gaps.md) | Log | Running gap tally: A = TerritoryIQ token gaps, B = PixlPrfct limitations | [Project Status and Roadmap](Project-Status-and-Roadmap.md) |
| [PROJECT_EVALUATION_2026-10-30.md](../PROJECT_EVALUATION_2026-10-30.md) | Snapshot | Independent-style evaluation at alpha.10 with P1/P2 findings and follow-ups | [Project Status and Roadmap](Project-Status-and-Roadmap.md) |
| [RELEASE_ACCEPTANCE.md](../RELEASE_ACCEPTANCE.md) | Log | Daily-work acceptance checks per build | [Testing and Verification](Testing-and-Verification.md) |
| [PERFORMANCE.md](../PERFORMANCE.md) | Log | 727-layer measurements and optimizations | [Testing and Verification](Testing-and-Verification.md), [Web Editor Architecture](Web-Editor-Architecture.md) |
| [PILOT_PLAN.md](../PILOT_PLAN.md) | Guide | Human pilot protocol (not yet run) | [Testing and Verification](Testing-and-Verification.md) |
| [MCP.md](../MCP.md) | Guide | Agent install, live editor, saved projects, tools, operations | [MCP Server](MCP-Server.md) |
| [MCP_SETUP.md](../MCP_SETUP.md) | Guide | AI-assisted team server installation | [MCP Server](MCP-Server.md), [Self-Hosted Server](Self-Hosted-Server.md) |
| [SELF_HOSTING.md](../SELF_HOSTING.md) | Guide | Databases, internet install, Docker, accounts, security | [Self-Hosted Server](Self-Hosted-Server.md) |
| [ADMIN_CONSOLE.md](../ADMIN_CONSOLE.md) | Guide | Admin UI, authorization | [Self-Hosted Server](Self-Hosted-Server.md) |
| [PROJECT_DELETION.md](../PROJECT_DELETION.md) | Guide | Trash, restore, permissions | [Self-Hosted Server](Self-Hosted-Server.md), [Cloud API and Database](Cloud-API-and-Database.md) |
| [TEAM_WORKFLOWS.md](../TEAM_WORKFLOWS.md) | Guide | Single active editor, handoff, roles, reviews | [Teams, Libraries and Collaboration](Teams-Libraries-and-Collaboration.md) |
| [TEAM_LIBRARIES.md](../TEAM_LIBRARIES.md) | Guide | Protected library publishing and permissions | [Teams, Libraries and Collaboration](Teams-Libraries-and-Collaboration.md) |
| [LIBRARIES.md](../LIBRARIES.md) | Guide | Adding libraries to existing projects (PixlPrfct + .fig) | [Teams, Libraries and Collaboration](Teams-Libraries-and-Collaboration.md) |
| [TEAM_RELEASE_WORK.md](../TEAM_RELEASE_WORK.md) | Log | Alpha.14 team follow-up evidence | [Teams, Libraries and Collaboration](Teams-Libraries-and-Collaboration.md) |
| [TEAM_SIMULATION_2026-10-30.md](../TEAM_SIMULATION_2026-10-30.md) | Log | Synthetic multi-actor acceptance | [Teams, Libraries and Collaboration](Teams-Libraries-and-Collaboration.md) |
| [DESKTOP.md](../DESKTOP.md) | Guide/Log | Electron build/run, per-alpha changes, privacy, security boundaries | [Desktop App](Desktop-App.md) |
| [SVG_ANIMATION.md](../SVG_ANIMATION.md) | Guide | SVG animator workflow and boundaries | [SVG Animator](SVG-Animator.md) |
| [Design-file import guide](../DESIGN_FILE_IMPORT.md) | Guide | `.fig` import support and limits | [Import: Design Files and SVG](Import-Design-Files.md) |
| [CSS_EDITING.md](../CSS_EDITING.md) | Guide | Per-layer CSS editing | [Layout, Auto Layout and Grid](Layout-Auto-Layout-and-Grid.md) |
| [TEXT_EDITING.md](../TEXT_EDITING.md) | Guide | Canvas text entry/creation behavior table | [Canvas Tools and Editing](Canvas-Tools-and-Editing.md) |
| [development-behaviors.md](../development-behaviors.md) | Guide | Development tab JavaScript behaviors | [Prototyping, Behaviors and Controls](Prototyping-Behaviors-and-Controls.md) |
| [starter-controls.md](../starter-controls.md) | Guide/Log | Native control starters | [Prototyping, Behaviors and Controls](Prototyping-Behaviors-and-Controls.md) |
| [dropdown-starter.md](../dropdown-starter.md) | Guide/Log | Dropdown starter configuration | [Prototyping, Behaviors and Controls](Prototyping-Behaviors-and-Controls.md) |
| [PRELOADER.md](../PRELOADER.md) | Guide | Startup animation | [Build System](Build-System.md) |
| [TERRITORY_ICON_COVERAGE.md](../TERRITORY_ICON_COVERAGE.md) | Log | Icon catalog coverage (679 icons) | [Icon Library](Icon-Library.md) |
| [LICENSING.md](../LICENSING.md) | Policy | License intent, legacy MIT/Apache versions, third-party | [Contributing and Conventions](Contributing-and-Conventions.md) |
| [SECURITY_CHECK_2026-10-30.md](../SECURITY_CHECK_2026-10-30.md) | Snapshot | Focused local security check + audit follow-up | [CI/CD and Releases](CI-CD-and-Releases.md) |
| [GRID_WORKFLOW_REVIEW.md](../GRID_WORKFLOW_REVIEW.md) | Log | Hands-on grid walkthrough and follow-ups | [Layout, Auto Layout and Grid](Layout-Auto-Layout-and-Grid.md) |
| [frames-auto-layout-comparison.md](../frames-auto-layout-comparison.md) | Reference | Measured frame/auto-layout behavior | [Layout, Auto Layout and Grid](Layout-Auto-Layout-and-Grid.md) |
| [grouping-comparison.md](../grouping-comparison.md) | Reference | Measured grouping behavior | [Canvas Tools and Editing](Canvas-Tools-and-Editing.md) |
| [RIGHT_DRAWER_AUDIT.md](../RIGHT_DRAWER_AUDIT.md) | Log | Inspector geometry audit | [Interface Design Guidelines](Interface-Design-Guidelines.md) |
| [EFFECTS_GUIDES_AUDIT.md](../EFFECTS_GUIDES_AUDIT.md) | Log | Effects and layout guides audit | [Styles, Variables and Paints](Styles-Variables-and-Paints.md) |
| [accessibility-review-2026-10-26.md](../accessibility-review-2026-10-26.md) | Snapshot | WCAG 2.1 A/AA audit and remaining work | [Testing and Verification](Testing-and-Verification.md) |
| `accessibility-scan-2026-10-26.json` | Reference | Raw scan output for the audit | — |
| [assets-accessibility-review.md](../assets-accessibility-review.md) | Snapshot | WCAG 2.2 AA review of Assets cards | [Components, Variants and Slots](Components-Variants-and-Slots.md) |
| `licenses/` | Policy | Legacy license notices | [Contributing and Conventions](Contributing-and-Conventions.md) |

## Maintaining this wiki

- When you add a doc under `docs/`, add a row here and link it from the relevant wiki page's **Source of truth**.
- When behavior changes, update the wiki page in the same PR as the code. Dated logs keep their history; wiki pages describe the **current** state.
- Keep page filenames stable — they are GitHub-wiki compatible (`Title-With-Dashes.md`), so `docs/wiki/` can be pushed as-is to the repository's GitHub Wiki.

## Related pages

[Home](Home.md) · [Repository Map](Repository-Map.md) · [Project Status and Roadmap](Project-Status-and-Roadmap.md)

## Public development journal

[Dev Log](https://ninefingerwoodshop-ops.github.io/pixlprfct/dev-log.html) is the dated release journal; [Roadmap](https://ninefingerwoodshop-ops.github.io/pixlprfct/roadmap.html) separates available work from proposed features. Source: [site/dev-log.html](../../site/dev-log.html).
