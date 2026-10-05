# Recommendation lesson 1: learning from exposure

Run from the repository root:

```sh
npm --prefix server run learn:recommendations
```

`lesson-01.json` contains four fictional listings and 19 event records from ten
fictional guest sessions. The reader identifiers are made up. Nothing is imported
into MongoDB, and the script does not load credentials or collect browser activity.
The listing records are a teaching subset, not a marketplace import format.

Read one `impression` and the following `click` together: the actor, listing,
request, position, surface, algorithm and experiment match. They describe an
exposure and a later action on that exposure. `eventId` identifies the action;
`requestId` groups actions belonging to one recommendation response.

Expected observations:

- The Lantern Library: 10 impressions, 3 clicked exposures, 30% click-through rate.
- A Garden on Mars: 2 impressions, 1 clicked exposure, 50% click-through rate.
- Letters from the Coast: no exposure; reader interest is unknown.
- The Last Tea Shop: zero stock; it must not enter the next recommendation feed.
- The final event repeats the first impression exactly. Deduplication leaves 18
  events, so retrying delivery does not manufacture extra exposure.

The rate calculation counts at most one click per displayed listing per request.
It illustrates why raw click totals alone are insufficient. Two exposures are far
too few to conclude that the second book is better; position also differs in this
example and may influence clicks. A save and a dismiss remain separate signals;
we have not assigned them ranking weights.

Try changing the second listing's `stock` to zero and rerun. Its historical
engagement stays the same, but it should no longer be recommended for purchase.
This is the distinction between relevance and current eligibility.

## Lesson 2: candidates and ranking

The same command now also runs a guest baseline:

1. Select active sale listings with stock greater than zero (candidate selection).
2. Sort by creation date, newest first; break date ties by listing ID (ranking).
3. Return up to three suggestions, with the truthful reason "Recently listed".

The original fixture yields Letters from the Coast, A Garden on Mars, then The
Lantern Library. The Last Tea Shop is excluded despite being the newest listing,
because its stock is zero. Letters from the Coast gets exposure even though it
has no historical clicks. Every guest receives the same result: this is a
baseline, not personalized ranking. No learning or training occurs here.

A live implementation must additionally verify seller approval, exclude the
reader's own listings, respect preferences and apply diversity rules. This small
lesson only demonstrates stock/status filtering and recency ranking in memory.

These synthetic events are for learning and deterministic fixtures only. They
are not evidence of real preferences, model quality or sales. The production
ingestion endpoint still needs consent, identity verification, request attribution,
rate limits and database deduplication. This script validates event shape and
fixture attribution in memory; it does not verify MongoDB indexes or TTL cleanup.

## Lesson 3: content-based similarity

```sh
npm --prefix server run learn:content
```

This lesson combines the original four listings with five additional fictional
records in `lesson-03.json`. It explicitly selects The Lantern Library as the
source book; this choice is not inferred from the sample reader events.

First exclude the source listing, inactive or sold-out listings, and other
languages. Same-language filtering is an explicit constraint for this exercise,
not a claim that readers only understand one language. Then assign 3 points for
matching category and 2 for matching author. Ignore zero-score matches, break
ties by listing ID and return up to three books.

Expected output:

| Book | Score | Reason |
| --- | --- | --- |
| The Moonlit Archive | 5 | Same category and author |
| The Glass Dragon | 3 | Same category |
| A Writer's Notebook | 2 | Same author |

The Hidden Kingdom would match both attributes but is sold out. The Tamil edition
is outside this exercise's language filter. The scores are chosen teaching
weights, not learned values or probabilities. Metadata similarity works without
interaction history; deciding which source books represent a reader's interests
is a separate step.

Try changing The Glass Dragon's author to Mira Sen and rerun: it gets 5 points.
Then set its stock to 0: it disappears regardless of score. Restore the fixture
after experimenting if you want the original expected output.

This remains an offline lesson. Production recommendations also require live
seller and inventory checks, edition deduplication, diversity, consent and user
controls. No database writes or new interaction events occur when it runs.

## Lesson 4: a reader profile from multiple saved books

```sh
npm --prefix server run learn:profile
```

`lesson-04.json` explicitly supplies a fictional reader's saved listing IDs,
preferred languages and dismissed listing IDs. It adds two science-fiction books
to the preceding catalogue. These inputs are independent of lesson 1's events.

The reader has saved The Lantern Library and A Garden on Mars. One of two saved
books is Fantasy and one is Science Fiction, so each category has a 0.5 share.
Mira Sen and Dev Arun each have a 0.5 author share. These fractions describe the
saved collection; they do not establish the reader's true interests with certainty.

Score each candidate as `3 * categoryShare + 2 * authorShare`. The Moonlit Archive
and The Orbit Orchard each score 2.5. The Glass Dragon and Signals from Europa
each score 1.5. A Writer's Notebook scores 1. Already-saved, dismissed, unavailable
and other-language listings are excluded. Listing IDs break score ties.

Remove A Garden on Mars (`000000000000000000000002`) from `savedListingIds` and
rerun. Fantasy becomes 100% of the remaining saved collection, and the science
fiction candidates no longer match. This is rule-based adaptation: inputs change,
the profile is recomputed and rankings change, without training a model.

Repeated saved IDs count once. Dismissal overrides a saved ID for profile building.
Unknown saved IDs are ignored. Empty profiles return no personalized matches;
connecting a guest fallback remains application work. An empty language list
means no language restriction. These examples use listing IDs; edition-based
deduplication remains necessary before production use.

The exercise assumes an explicitly chosen fictional profile. It does not implement
real consent, user identity, reset/opt-out endpoints, seller checks or a live feed.
The same production boundaries described above still apply.

## Lesson 5: cold start and fallback

```sh
npm --prefix server run learn:cold-start
```

A cold reader has no usable saved-book history. The wrapper first tries lesson
4's personalized ranking. If it returns no matches, it switches to a newest-first
feed of available listings. It also falls back when saved books exist but none
have available similar candidates. A short, nonempty personalized result is kept
as-is; mixing in extra exploration candidates is outside this lesson.

Fallback still respects the language selection and excludes saved and dismissed
listings. If nothing qualifies, return an honest empty result rather than relax
these constraints. No popularity or reading preferences are invented.

The script demonstrates a new reader, the lesson 4 reader, a reader with no
available similar titles, and a reader whose selected language has no inventory.
For the new English-language reader, the first three suggestions are Letters from
the Coast, A Garden on Mars and The Lantern Library.

Earlier extra fixtures lack creation dates. Those records sort after dated ones,
with a reason that explicitly says the date is unknown. Equal dates are resolved
by listing ID. Real Book records use timestamps; this lesson does not fabricate
missing dates. Fallback items have no similarity score because recency and
personalized similarity scores are different measurements.

Run `npm test` to verify cold start, personalized routing, exclusions, empty
inventory and deterministic ordering. These tests run in memory. Seller checks,
edition diversity, consent handling and live API integration remain future work.

## Lesson 6: evaluate recommendations

```sh
npm --prefix server run learn:evaluate
```

`lesson-06.json` defines four fictional relevance cases separately from the
ranking code. The labels are manually authored for teaching, not observed reader
preferences or independent held-out evidence. The ranking functions never receive
the relevance labels. Unlisted books earn zero credit only in this exercise;
missing real-world interactions must not be treated as proof of dislike.

Recall@3 is the number of relevant books in the first three suggestions divided
by the number of relevant books in the judged set. NDCG@3 gives higher credit to
relevant books at earlier positions, normalized by the ideal ranking. Both range
from 0 to 1 for cases with relevance labels. Cases with no labels have undefined
metrics, not zero. We use 3 because the catalogue is tiny; the blueprint calls
for evaluation at 10 once a suitable dataset exists.

Both approaches exclude saved books and respect the same language and dismissal
filters. The personalized approach includes its cold-start fallback. The report
shows each reader separately, including a new reader and a reader whose current
interests differ from their saved history. That last case exposes a limitation
instead of assuming personalization always wins.

Some fixture dates are missing, which affects the newest-first baseline. These
results are illustrations of metric calculation, not evidence of improvement in
production. No model is trained, no release gate is met and no popularity
baseline is evaluated here. Later evaluation needs genuine consented data,
time-based splits, independently judged relevance and broader availability,
diversity and exposure checks as described in the blueprint.

## Lesson 7: make room for discovery

```sh
npm --prefix server run learn:explore
```

Keep up to two personalized matches, then fill the three-card list with recent
available books not already selected. This is a simple exploration heuristic:
some space is allocated without requiring a match to saved-book history. It does
not guarantee a different category, an item never previously seen, or a relevant
result. With no personalized matches, retain lesson 5's recent fallback.

For the fantasy reader the output is The Moonlit Archive, The Glass Dragon and
Letters from the Coast. The first two have saved-book reasons; the last has a
recency reason and no similarity score. All candidates still obey the example's
language, dismissal, saved-book, stock and status restrictions.

The report compares both approaches against the unchanged lesson 6 judgments.
In the original fixtures the relevance metrics do not improve: the changed-interest
reader wants science fiction, while the discovery slot contains a fiction book.
That is an intentional limitation to observe, not a reason to change the labels.
Exploration can also displace relevant matches and lower immediate relevance.

The two-plus-one allocation is an illustrative design choice, not an optimized
ratio. This deterministic implementation repeats results until inputs change.
Exposure-aware rotation, interaction updates, time decay, experimentation and
production eligibility/diversity controls are not implemented in this lesson.

## Lesson 8: close the feedback loop

```sh
npm --prefix server run learn:feedback
```

This lesson creates a fresh fictional English-language reader and keeps all state
in memory. It shows a feed, explicitly simulates displayed impressions, saves
A Garden on Mars and recomputes recommendations. The Orbit Orchard and Signals
from Europa now match the saved book's science-fiction category. It then dismisses
The Orbit Orchard and shows the next feed without that listing.

The existing InteractionEvent schema validates every event. Request snapshots
check actor, surface, rank, listing, algorithm and experiment attribution. Actions
require a preceding impression. Returning a feed alone does not create impressions.
An exact retry is ignored; reusing an event ID with different content fails.
Saves add a positive profile input; dismissals remove that listing from saved
inputs and exclude it. Dismissal does not imply disliking its whole genre. Clicks
are recorded but do not change the saved-book profile in this exercise.

The lesson rejects out-of-order save/dismiss events and allows a later explicit
save to reverse dismissal when attributed to an existing displayed request. This
is a synchronous teaching policy, not a complete distributed ingestion design.
Deduplication and snapshots disappear when the script exits. No event is persisted,
no live account changes, and no model is trained. The simulated actor is explicitly
chosen; real consent/authentication, rate limiting, durable attribution and event
ordering remain required before connecting a live API.
