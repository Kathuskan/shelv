const baseline = require("../data/recommendations/lesson-01.json");
const fixture = require("../data/recommendations/lesson-03.json");

const normalize = (value) => String(value || "").trim().toLowerCase();
const matches = (left, right) => Boolean(normalize(left)) && normalize(left) === normalize(right);

function similarBooks(listings, source) {
  return listings
    // This lesson explicitly asks for the same language as the source book.
    .filter((book) => book._id !== source._id
      && book.listingType === "Sale"
      && book.status === "active"
      && book.stock > 0
      && matches(book.language, source.language))
    .map((book) => {
      const sameCategory = matches(book.category, source.category);
      const sameAuthor = matches(book.author, source.author);
      // Teaching weights chosen by us, not learned probabilities or confidence.
      const score = (sameCategory ? 3 : 0) + (sameAuthor ? 2 : 0);
      const reasons = [];
      if (sameCategory) reasons.push(`Same category: ${book.category}`);
      if (sameAuthor) reasons.push(`Same author: ${book.author}`);
      return { listingId: book._id, title: book.title, score, reason: reasons.join("; ") };
    })
    .filter((book) => book.score > 0)
    .sort((a, b) => b.score - a.score || a.listingId.localeCompare(b.listingId))
    .slice(0, 3);
}

if (require.main === module) {
  const listings = [...baseline.listings, ...fixture.additionalListings];
  const source = listings.find((book) => book._id === fixture.sourceListingId);
  if (!source) throw new Error("The example source listing is missing.");
  console.log(`Lesson 3: books similar to "${source.title}"`);
  console.log(`Source: ${source.category} / ${source.author} / ${source.language}`);
  console.log("Keep the same language. Score = 3 for matching category + 2 for matching author.");
  const suggestions = similarBooks(listings, source);
  if (suggestions.length) console.table(suggestions.map(({ listingId, ...book }, index) => ({ rank: index + 1, ...book })));
  else console.log("No available matching books in this sample.");
  console.log("Scores express our rule, not the probability of liking a book.");
  console.log("This offline lesson does not infer preferences or train a model.");
}

module.exports = similarBooks;
