const recommend = require("./recommendations-cold-start-lesson");
const metrics = require("./recommendations-evaluation-lesson");
const baseline = require("../data/recommendations/lesson-01.json");
const content = require("../data/recommendations/lesson-03.json");
const profile = require("../data/recommendations/lesson-04.json");
const evaluation = require("../data/recommendations/lesson-06.json");

function mixedRecommendations(listings, reader = {}) {
  const existing = recommend(listings, reader);
  if (existing.mode !== "personalized") {
    return { ...existing, suggestions: existing.suggestions.slice(0, 3)
      .map((book) => ({ ...book, source: "recent fallback" })) };
  }

  // Keep two strong matches; use the remaining space for recency-based discovery.
  const suggestions = existing.suggestions.slice(0, 2)
    .map((book) => ({ ...book, source: "saved-book match" }));
  const excluded = new Set([
    ...(reader.savedListingIds || []), ...suggestions.map((book) => book.listingId),
  ]);
  // Empty the profile only after excluding saves. Preserve language/dismissals.
  const recent = recommend(listings.filter((book) => !excluded.has(book._id)),
    { ...reader, savedListingIds: [] });
  suggestions.push(...recent.suggestions.slice(0, 3 - suggestions.length)
    .map((book) => ({ ...book, source: "recent discovery" })));
  return { mode: "mixed", fallbackReason: null, suggestions };
}

if (require.main === module) {
  const listings = [...baseline.listings, ...content.additionalListings, ...profile.additionalListings];
  console.log("Lesson 7: two personalized matches plus one recent discovery");
  const example = evaluation.cases[0];
  console.log(`Example: ${example.name}`);
  console.table(mixedRecommendations(listings, example.reader).suggestions
    .map(({ listingId, ...book }, index) => ({ rank: index + 1, ...book })));

  const rows = evaluation.cases.map((item) => {
    const before = recommend(listings, item.reader).suggestions;
    const after = mixedRecommendations(listings, item.reader).suggestions;
    const beforeMetrics = metrics(before.map((book) => book.listingId), item.relevantListingIds);
    const afterMetrics = metrics(after.map((book) => book.listingId), item.relevantListingIds);
    return {
      reader: item.name,
      "previous Recall@3": beforeMetrics.recall.toFixed(3),
      "mixed Recall@3": afterMetrics.recall.toFixed(3),
      "previous NDCG@3": beforeMetrics.ndcg.toFixed(3),
      "mixed NDCG@3": afterMetrics.ndcg.toFixed(3),
    };
  });
  console.table(rows);
  console.log("Discovery creates an opportunity to collect feedback; it does not guarantee a relevant result.");
  console.log("The changed-interest case still fails: the newest discovery is Fiction, not Science Fiction.");
  console.log("This deterministic rule can repeat the same book. Exposure-aware rotation is not implemented.");
}

module.exports = mixedRecommendations;
