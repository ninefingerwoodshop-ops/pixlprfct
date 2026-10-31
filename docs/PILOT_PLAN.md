# PixlPrfct daily-work pilot

Prepared 2026-10-30. **Not yet run. No participants have been recruited.**
Use the build that passes `docs/RELEASE_ACCEPTANCE.md`; record its version and
commit/diff identifier. Start with 3–5 people who regularly build component-based
screens in Figma. Use a copy of one real project per participant and the public
727-layer acceptance fixture. The project and participant list are awaiting the
product owner's selection. This plan does not authorize sending invitations.

## The question

Can a designer finish a routine screen change in PixlPrfct, trust the saved result,
and choose to come back for the next change? A feature demo does not answer this.

## Sessions

Day 0: 45 minutes, observed. Ask the participant to explain their usual workflow,
then give the tasks below without a walkthrough. Record help and fallback as they
happen. Stop if work appears at risk; preserve a `.pixl` copy.

1. Import a copy of the project. Find the relevant page, component and instance.
2. Change a shared text/color/effect style and confirm the intended instances
   update. Make one local edit and explain what stays linked.
3. Change layout, edit a slot, switch a variant and undo one change.
4. Close and reopen the file. Verify the change, export `.pixl`, and reopen the
   exported copy. Ask what evidence makes them confident the work was preserved.
5. Produce the required SVG or code deliverable. Record any cleanup in another app.

Day 2: offer another real change. Record whether the participant chooses PixlPrfct,
uses help, or goes back to Figma. Day 7: repeat with a new change and ask what still
prevents routine use. A scheduled study visit alone does not count as voluntary
return use. Record at least one unguided work session separately.

## Evidence and decision

Record anonymous participant IDs, tasks attempted/completed, assistance, elapsed
minutes, any fallback to another tool and the reason, recovery incidents, and
voluntary use on a later day. Keep project content out of the event log. Do not
add product telemetry or send recordings anywhere as part of this pilot.

Provisional entry criteria: all automated acceptance checks pass; the actual
desktop sleep/wake probe passes on the tested build. Provisional expansion
criteria: zero unrecovered data loss; at least 80% of attempted tasks completed
without help; at least 60% of participants voluntarily return by day 7; at most
20% of sessions need a fallback. Report counts alongside percentages. With 3–5
people these are directional gates, not estimates of market-wide retention.

Use the event format in `scripts/acceptance/pilot-report.mjs`. Run
`node scripts/acceptance/pilot-report.mjs path/to/events.json` to get the actual
denominators, outcomes, fallback reasons, and insufficient-evidence status.
Do not fill unknown outcomes with successes or count this acceptance automation
as customer usage.

Invitation draft, to customize after participants are selected:

> I'd like to watch you make a real screen change in PixlPrfct, including reopening
> and exporting it. It is an alpha, so we'll work on a copy. The first session is
> 45 minutes; we'd also like to learn whether you choose to use it again during
> the following week. The aim is to identify where the workflow breaks down.

## Simulated acceptance — 2026-10-30

At the user’s request, simulated teammates exercise the implemented workflow.
See [TEAM_SIMULATION_2026-10-30.md](TEAM_SIMULATION_2026-10-30.md). Participant
count remains zero; no retention, satisfaction or independent usability evidence
has been generated. The human pilot protocol above is still available for later.
