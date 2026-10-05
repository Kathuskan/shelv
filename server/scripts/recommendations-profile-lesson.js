const baseline = require("../data/recommendations/lesson-01.json");
const content = require("../data/recommendations/lesson-03.json");
const fixture = require("../data/recommendations/lesson-04.json");
const normalize = (value) => String(value || "").trim().toLowerCase();

function personalizedBooks(listings, reader) {
  const savedIds = new Set(reader.savedListingIds);
  const dismissedIds = new Set(reader.dismissedListingIds);
  const languages = new Set(reader.languages.map(normalize));
  // A dismissed book cannot contribute a positive signal in this lesson.
  const saved = listings.filter((book) => savedIds.has(book._id) && !dismissedIds.has(book._id));
  const categories = new Map();
  const authors = new Map();
  for (const book of saved) {
    for (const [counts, value] of [[categories, book.category], [authors, book.author]]) {
      const key = normalize(value);
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  // Fractions describe this saved collection, not certainty about the reader.
  const profile = {
    savedCount: saved.length,
    categories: Object.fromEntries([...categories].map(([key, count]) => [key, count / saved.length])),
    authors: Object.fromEntries([...authors].map(([key, count]) => [key, count / saved.length])),
  };
  if (!saved.length) return { profile, suggestions: [] };

  const suggestions = listings
    .filter((book) => book.listingType === "Sale" && book.status === "active" && book.stock > 0
      && !savedIds.has(book._id) && !dismissedIds.has(book._id)
      && (!languages.size || languages.has(normalize(book.language))))
    .map((book) => {
      const categoryShare = profile.categories[normalize(book.category)] || 0;
      const authorShare = profile.authors[normalize(book.author)] || 0;
      const reasons = [];
      if (categoryShare) reasons.push(`Category in your saved books: ${book.category}`);
      if (authorShare) reasons.push(`Author in your saved books: ${book.author}`);
      return {
        listingId: book._id, title: book.title,
        score: 3 * categoryShare + 2 * authorShare,
        reason: reasons.join("; "),
      };
    })
    .filter((book) => book.score > 0)
    .sort((a, b) => b.score - a.score || a.listingId.localeCompare(b.listingId))
    .slice(0, 5);
  return { profile, suggestions };
}

if (require.main === module) {
  const listings = [...baseline.listings, ...content.additionalListings, ...fixture.additionalListings];
  const { profile, suggestions } = personalizedBooks(listings, fixture.reader);
  console.log("Lesson 4: a reader profile from explicitly saved books");
  console.log(`Profile uses ${profile.savedCount} saved books.`);
  console.table(Object.entries(profile.categories).map(([category, share]) => ({
    category, "share of saved books": `${Math.round(share * 100)}%`,
  })));
  console.log("Score = 3 × category share + 2 × author share (teaching weights).");
  if (suggestions.length) console.table(suggestions.map(({ listingId, ...book }, index) => ({ rank: index + 1, ...book })));
  else console.log("No personalized matches. The app will need a separate guest/baseline fallback.");
  console.log("Changing saved books changes this profile on the next run. No model is trained.");
}

module.exports = personalizedBooks;
