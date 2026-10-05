// One tracker per server-issued feed. Retries reuse exactly the same payload.
export function createRecommendationTracker(api, snapshot) {
  let active = true;
  const entries = new Map();
  const receivedAt = Date.now();
  const generatedAt = Date.parse(snapshot.generatedAt);
  function send(book, type) {
    if (!active) return Promise.reject(new Error("Collection is off."));
    const key = `${book._id}:${type}`;
    let entry = entries.get(key);
    if (!entry) {
      entry = {
        body: {
          eventId: crypto.randomUUID(), eventType: type, listingId: book._id,
          requestId: snapshot.requestId, rank: book.rank,
          occurredAt: new Date(generatedAt + Date.now() - receivedAt).toISOString(),
        },
      };
      entries.set(key, entry);
    }
    if (!entry.pending) {
      entry.pending = api.post("/api/v1/events", entry.body).catch(error => {
        entry.pending = null;
        throw error;
      });
    }
    return entry.pending;
  }
  return {
    stop() { active = false; },
    impression(book) { return send(book, "impression"); },
    async action(book, type) {
      await send(book, "impression");
      return send(book, type);
    },
  };
}
