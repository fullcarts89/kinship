# B6: the residence dry run — the founder's report and its stop gate

*Phase 4B B6 (`phase4-implementation-brief.md` §14, §25). Report only. Nothing in this step writes a facet, restores a line, or changes a memory, note, source, person or reason. B7 does not start from this document; B9's facet application has its own founder gate.*

## What the dry run is

Once per account, after the first sync of a build that carries it, the app asks ai-gateway for the report over that account's own lines. The gateway reads every live line of the signed-in owner under their RLS, page by page, runs the approved residence semantics (`residence.ts`, `relate.ts`, `compose.ts`) as `report.ts`, and writes **only**:

- `residence_backfill_report`: one row per line and bucket — the item id, the bucket, the rule and dataset versions. No words.
- `semantic_runs`: one row per account, `mode = report`, the versions, when it ran. Recorded last, so an interrupted run is never marked complete and the next launch runs it again.

The reply to the phone is content-free (counts, versions, groups of ids) and the phone keeps only the fact that it was answered. No model is involved; no consent, flag or quota applies; a user id in the request is ignored (the signed-in user is the only account read or written).

## The buckets (the table's exact values)

| Bucket | Meaning | Review question |
|---|---|---|
| `eligible` | The line's own words say a current residence (§5) and it may carry a reading (a stated, unshared, non-sensitive fact about the person or a related person). A line B3 already read keeps its live reading | Would a facet here be right? |
| `resolved` | Eligible, with a pinned reading: a qualifier in the same words ("Alameda, CA") or the user's answer | Safe-looking |
| `candidates` | Eligible, with one or more readings in the data, none pinned ("Alameda": the usual reading decides compatibility, nothing is pinned) | Safe-looking; the composer never invents the place |
| `unknown_place` | Eligible, no reading in the data ("the Bay Area", or more than five readings) | Fails open: its own line, never composed |
| `would_compose` | Current eligible lines of one person, subject and related person that the composer would say as one line ("Lives in Alameda, California") | Does each group read right? |
| `contradiction` | Two current eligible lines that can't both be true, read as the comparator reads them (the newer as N) | Suspicious: the invariant the comparator keeps, broken before it existed |
| `false_supersession_suspect` | A closed eligible line whose live closer the comparator would not have let close it: the same place (`same`), a refinement with no change cue (`refines`, California → Alameda), or a correction in the closer's words recorded as a plain replacement (`correction_unrecorded`) | **Case by case.** A review candidate, never proof: older lines lack the transitions and readings newer ones carry |
| `history_unknown` | A closed eligible line none of whose live closers records a transition (a supersession from before 4B, or a plain replacement) | Never shown as history (CC-20). Nothing to decide |
| `not_residence` | Examined (its words or category looked residential) and excluded by the rules: a stay, a plan, the past, an address, hedged, sensitive, shared, or not a fact about the person | Should stay without a reading |

A line may be in several buckets (eligible + candidates + would_compose, for example). Lines that never looked residential are not examined and get no row.

## Queries for the SQL editor (one account at a time)

Replace `<user id>` with the account's id (the founder's own, by their yes; never looked up by email). Every query joins the report to the owner's rows; the words appear only here, never in telemetry or the report table.

**Did it run, at which versions?**
```sql
select mode, rule_version, dataset_version, ran_at
from public.semantic_runs
where user_id = '<user id>'
order by ran_at desc;
```

**Counts by bucket**
```sql
select r.bucket, count(*) as lines
from public.residence_backfill_report r
join public.memory_items m on m.id = r.memory_item_id
where m.user_id = '<user id>' and r.rule_version = 'residence/v1' and r.dataset_version = 'places-2026.10'
group by r.bucket
order by r.bucket;
```

**Every reported line, with its buckets**
```sql
select p.display_name as person, m.subject_type, m.statement, m.status, m.user_state, m.created_at::date as told,
       string_agg(r.bucket, ', ' order by r.bucket) as buckets
from public.residence_backfill_report r
join public.memory_items m on m.id = r.memory_item_id
join public.people p on p.id = m.person_id
where m.user_id = '<user id>' and r.rule_version = 'residence/v1' and r.dataset_version = 'places-2026.10'
group by m.id, p.display_name, m.subject_type, m.statement, m.status, m.user_state, m.created_at
order by p.display_name, m.created_at;
```

**Candidate composition groups** (one row per person and subject: the lines the composer would say as one)
```sql
select p.display_name as person, m.subject_type, coalesce(m.subject_related_id::text, '') as related,
       string_agg(m.statement, '  |  ' order by m.created_at) as lines
from public.residence_backfill_report r
join public.memory_items m on m.id = r.memory_item_id
join public.people p on p.id = m.person_id
where m.user_id = '<user id>' and r.bucket = 'would_compose'
  and r.rule_version = 'residence/v1' and r.dataset_version = 'places-2026.10'
group by p.display_name, m.subject_type, m.subject_related_id
order by p.display_name;
```

**Suspected contradictions** (the same query with `r.bucket = 'contradiction'`: the lines of one person that can't both be current).

**Potential false supersessions, with the closer that closed each line**
```sql
select p.display_name as person, m.statement as closed_line, m.created_at::date as told,
       c.statement as closer, c.detail->>'transition' as transition, c.created_at::date as closer_told, c.user_state as closer_state
from public.residence_backfill_report r
join public.memory_items m on m.id = r.memory_item_id
join public.people p on p.id = m.person_id
join public.memory_items c on (c.supersedes_id = m.id or m.id = any(c.closes_ids))
  and c.deleted_at is null and c.status <> 'retracted'
where m.user_id = '<user id>' and r.bucket = 'false_supersession_suspect'
  and r.rule_version = 'residence/v1' and r.dataset_version = 'places-2026.10'
order by p.display_name, m.created_at;
```

**Closed lines that are never history** (`r.bucket = 'history_unknown'` in the query above: the closer's `transition` is null).

**Unknown or ambiguous readings** (`r.bucket = 'unknown_place'`, and `candidates` lines the composer kept apart: compare with the composition groups).

**Excluded lines** (`r.bucket = 'not_residence'`): each should read as a stay, a plan, the past, an address, a hedge, a shared or sensitive line, or not a fact about the person. The reason is not stored; the words say it.

## What the report cannot tell

- **Why a line was excluded** is counted in the gateway's reply, not stored (the table holds a bucket only). The words in the query above say it.
- **A composition group is reconstructed from the rows** (the `would_compose` lines of one person, subject and related person): the report does not store group membership. One person with two separate chains would show as one row of the query; the composer itself keeps them apart.
- **A suspect is not a wrong supersession.** The closer may have been right for a reason its stored row doesn't carry (an older line never recorded cues or transitions). Any repair is item by item under `data-cleanup-plan.md`, with the founder's yes; the report changes nothing.
- **Which lines are examined** is decided by the user's own words (the quotes of the line's notes, or the line itself when the user wrote or edited it), the model's statement and the `home` category, any of them; the reading itself is always from the user's words. A line B3 read keeps its live reading regardless.
- **A line removed since a run** ("Not this") loses its rows on the next run; between runs its rows stay, and the query above shows it with `status = 'retracted'`.
- **Readings use the dataset deployed with the gateway** (`places-2026.10`); a later dataset would need a new run at its version.

## Evidence so far (local only; production not run)

The real screens, the local Supabase stack (the B2 and B3 migrations; B6 adds none) and the gateway served from the branch (`e2e/blackbox/b6.blackbox.tsx`, 4/4 after the review pass of 17 Oct, brief §25):

- An account's first pass asks once; `semantic_runs` gets one row for that account; later notes and syncs never ask again.
- "Susan lives in California", "Susan lives in Alameda", "Susan is staying in Denver this week": the report rows are exactly California and Alameda as `eligible`, `candidates`, `would_compose` (one group, Alameda then California) and Denver as `not_residence`; the gateway's reply says 3 examined, 2 eligible, 2 already read (B3's live readings), and contains none of the words. **Every row of memory_items, memory_item_sources, memory_item_facets, captures, people, related_people, reasons, contact_events and capture_reviews is byte for byte what it was before the run.**
- Then "Susan moved to Colorado": both earlier lines closed as a change: 2 history-eligible, 0 unknown, 0 suspects, 0 contradictions, no composition; the rows replaced in full; a second run writes the same rows and leaves one run row; asked without `again`, the server answers `already_reported` and reads nothing.
- Another account's token asking with this account's id in the body gets its own (empty) report; this account's rows are untouched; the app's own client cannot read the report tables (`42501`).
- A line removed after a run ("Not this") has no rows after the next run; the account's tables are byte for byte as they were.
- **Around every run, the row count of every table of the local database is taken before and after: only `residence_backfill_report` and `semantic_runs` may differ.** A write anywhere else, by the gateway or by a trigger, fails the suite. Every table that holds the account's rows (20 of them, `memory_item_history` and `ai_usage` included) is also compared byte for byte.

The deterministic cases (brief §14's buckets, each of the §6 test cases in the B6 task) run in `report.test.ts` (15) and `handler.test.ts` (7 for B6) on every CI run.

## The production run: NOT RUN

Production has neither the B6 gateway nor a build that asks for the report. The sequence, each step on the founder's explicit go:

1. Merge the B6 PR (a merge commit). No migration.
2. Deploy ai-gateway from `main`. (Until a build asks, nothing runs: the action exists and is idle.)
3. A build; the founder's phone asks once at its first sync. The founder's own account alone is reported (each account reports itself, only when it launches that build).
4. The founder reads the queries above for their account id. **Stop.** Nothing applies facets; B9's gate is separate, and B7 → B8 → B9 keeps its order.

## Recommendation (to be written from the production report)

To fill in after step 4, bucket by bucket: which `eligible` lines look safe to read (resolved and candidates with no contradiction), which stay unresolved (`unknown_place`, candidates the composer keeps apart), which historical states need a case-by-case look (`false_supersession_suspect`, with their closers), and which lines should stay without a reading (`not_residence`, and anything the founder recognises as wrong). The decision whether applying facets to existing lines is safe, and what stays excluded, is the founder's; B9's apply step comes only after it.
