const assert = require("node:assert/strict");
const recommend = require("./recommendations-cold-start-lesson");
const baseline = require("../data/recommendations/lesson-01.json");
const content = require("../data/recommendations/lesson-03.json");
const profile = require("../data/recommendations/lesson-04.json");
const fixture = require("../data/recommendations/lesson-06.json");

function metrics(rankedIds, relevantIds, k = 3) {
  assert.ok(Number.isSafeInteger(k) && k > 0);
  const relevant = new Set(relevantIds);
  // Missing judgments are not evidence that a system failed.
  if (!relevant.size) return { recall: null, ndcg: null };
  assert.equal(new Set(rankedIds).size, rankedIds.length, "Duplicate recommendations invalidate this evaluation");
  const hits = rankedIds.slice(0, k).map((id) => relevant.has(id) ? 1 : 0);
  const dcg = hits.reduce((sum, hit, index) => sum + hit / Math.log2(index + 2), 0);
  const ideal = Array.from({ length: Math.min(k, relevant.size) }, (_, index) => 1 / Math.log2(index + 2))
    .reduce((sum, gain) => sum + gain, 0);
  return { recall: hits.reduce((sum, hit) => sum + hit, 0) / relevant.size, ndcg: dcg / ideal };
}

if (require.main === module) {
  const listings = [...baseline.listings, ...content.additionalListings, ...profile.additionalListings];
  const rows = [];
  for (const example of fixture.cases) {
    const { reader } = example;
    for (const id of example.relevantListingIds) {
      const book = listings.find((item) => item._id === id);
      assert.ok(book && book.stock > 0 && book.status === "active" && book.listingType === "Sale",
        `${example.name}: relevance label must refer to an available sale`);
      assert.ok(reader.languages.includes(book.language));
      assert.ok(!reader.savedListingIds.includes(id) && !reader.dismissedListingIds.includes(id));
    }
    // Remove saved listings from baseline candidates too, for a fair comparison.
    // With no saved profile, the existing wrapper takes its recency path.
    const recent = recommend(listings.filter((book) => !reader.savedListingIds.includes(book._id)),
      { ...reader, savedListingIds: [] });
    const personal = recommend(listings, reader);
    for (const [method, result] of [["Newest first", recent], ["Personalized + fallback", personal]]) {
      const rankedIds = result.suggestions.slice(0, 3).map((book) => book.listingId);
      const score = metrics(rankedIds, example.relevantListingIds);
      rows.push({
        reader: example.name, method, mode: result.mode,
        "Recall@3": score.recall.toFixed(3), "NDCG@3": score.ndcg.toFixed(3),
      });
    }
  }
  console.log("Lesson 6: evaluate the top 3 suggestions against fictional relevance judgments");
  console.table(rows);
  console.log("Recall@3: fraction of the relevant set found in the first three suggestions.");
  console.log("NDCG@3: rewards relevant books nearer the top; 1 means the best possible ordering at this cutoff.");
  console.log("The changed-interest case intentionally demonstrates that saved-book matching can fail.");
  console.log("These curated examples test understanding, not real-world performance or readiness to launch.");
}

module.exports = metrics;
