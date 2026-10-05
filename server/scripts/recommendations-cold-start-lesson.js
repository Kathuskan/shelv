const personalizedBooks = require("./recommendations-profile-lesson");
const baseline = require("../data/recommendations/lesson-01.json");
const content = require("../data/recommendations/lesson-03.json");
const profileFixture = require("../data/recommendations/lesson-04.json");
const normalize = (value) => String(value || "").trim().toLowerCase();
const listingDate = (book) => {
  const timestamp = Date.parse(book.createdAt);
  return Number.isFinite(timestamp) ? timestamp : -Infinity;
};

function recommend(listings, reader = {}) {
  const context = {
    savedListingIds: reader.savedListingIds || [],
    dismissedListingIds: reader.dismissedListingIds || [],
    languages: reader.languages || [],
  };
  const personal = personalizedBooks(listings, context);
  if (personal.suggestions.length) {
    return { mode: "personalized", fallbackReason: null, suggestions: personal.suggestions };
  }

  // Falling back changes the ranking method, not the reader's restrictions.
  const excluded = new Set([...context.savedListingIds, ...context.dismissedListingIds]);
  const languages = new Set(context.languages.map(normalize));
  const suggestions = listings
    .filter((book) => book.listingType === "Sale" && book.status === "active" && book.stock > 0
      && !excluded.has(book._id)
      && (!languages.size || languages.has(normalize(book.language))))
    .sort((a, b) => {
      const aDate = listingDate(a), bDate = listingDate(b);
      if (aDate !== bDate) return aDate > bDate ? -1 : 1;
      return a._id.localeCompare(b._id);
    })
    .slice(0, 5)
    .map((book) => ({
      listingId: book._id, title: book.title,
      // Some earlier teaching fixtures have no date. Do not invent one.
      reason: Number.isFinite(listingDate(book)) ? "Recently listed" : "Available book (listing date unknown)",
    }));
  return {
    mode: suggestions.length ? "recent" : "empty",
    fallbackReason: personal.profile.savedCount ? "no_available_matches" : "no_saved_history",
    suggestions,
  };
}

if (require.main === module) {
  const listings = [...baseline.listings, ...content.additionalListings, ...profileFixture.additionalListings];
  console.log("Lesson 5: cold start and fallback — fictional offline data");
  for (const [label, reader] of [
    ["New reader", { languages: ["English"] }],
    ["Reader with saved books", profileFixture.reader],
    ["Saved book with no similar available titles", { savedListingIds: ["000000000000000000000003"], languages: ["English"] }],
    ["No inventory in the selected language", { languages: ["Sinhala"] }],
  ]) {
    const result = recommend(listings, reader);
    console.log(`\n${label}: ${result.mode} (${result.fallbackReason || "matches found"})`);
    if (result.suggestions.length) {
      console.table(result.suggestions.map(({ listingId, ...book }, index) => ({ rank: index + 1, ...book })));
    } else console.log("No available books match your settings.");
  }
  console.log("Unknown listing dates sort last. Saved and dismissed listings stay excluded during fallback.");
  console.log("This is a teaching example, not the live marketplace feed.");
}

module.exports = recommend;
