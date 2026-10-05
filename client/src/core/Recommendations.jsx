import { useEffect, useMemo, useRef, useState } from "react";
import api, { message } from "./api";
import { ErrorMessage, Loading } from "./Common";
import { createRecommendationTracker } from "./recommendationEvents";

function Suggestion({ book, tracker, Card: card, onRemove }) {
  const Card = card;
  const element = useRef(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const target = element.current;
    let visible = false, delivered = false;
    function recordVisible() {
      if (!visible || delivered || document.visibilityState !== "visible") return;
      delivered = true;
      tracker.impression(book).catch(() => { delivered = false; });
    }
    // Returning a feed is not an impression: at least half the card must be visible.
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
      recordVisible();
    }, { threshold: [0, 0.5] });
    observer.observe(target);
    document.addEventListener("visibilitychange", recordVisible);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", recordVisible);
    };
  }, [book, tracker]);

  async function act(type) {
    setBusy(true);
    setNotice("");
    let saved = false;
    try {
      if (type === "save") {
        await api.put(`/api/user/saved-books/${book._id}`);
        saved = true;
      }
      await tracker.action(book, type);
      onRemove(book._id, type === "save" ? "Book saved to your account." : "Suggestion dismissed.");
    } catch (error) {
      setNotice(saved ? "Book saved, but suggestions could not be updated. Try again or refresh suggestions." : message(error));
    } finally {
      setBusy(false);
    }
  }
  function clicked() {
    // Navigation remains available even if analytics fails.
    tracker.action(book, "click").catch(() => {});
  }
  return (
    <article className="recommendation-card" ref={element}>
      <Card book={book} onClick={clicked} />
      <div className="recommendation-actions">
        <small className="muted">Recently listed</small>
        <div className="recommendation-buttons">
          <button className="text-button" disabled={busy} onClick={() => act("save")} aria-label={`Save ${book.title}`}>♡ Save</button>
          <button className="text-button" disabled={busy} onClick={() => act("dismiss")} aria-label={`Dismiss ${book.title}`}>Dismiss</button>
        </div>
        {notice && <small role="status">{notice}</small>}
      </div>
    </article>
  );
}

export default function Recommendations({ Card }) {
  const [preferences, setPreferences] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hidden, setHidden] = useState([]);
  const [notice, setNotice] = useState("");
  const tracker = useMemo(() => snapshot ? createRecommendationTracker(api, snapshot) : null, [snapshot]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data } = await api.get("/api/v1/recommendation-preferences");
        if (!active) return;
        setPreferences(data);
        if (data.enabled) {
          const feed = await api.get("/api/v1/recommendations?surface=home&limit=6");
          if (active) setSnapshot(feed.data);
        }
      } catch (failure) {
        if (active) setError(message(failure));
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  async function refresh() {
    setLoading(true);
    setError("");
    tracker?.stop();
    setSnapshot(null);
    try {
      const prefs = await api.get("/api/v1/recommendation-preferences");
      setPreferences(prefs.data);
      if (prefs.data.enabled) {
        const { data } = await api.get("/api/v1/recommendations?surface=home&limit=6");
        setHidden([]);
        setSnapshot(data);
      }
    } catch (failure) { setError(message(failure)); }
    finally { setLoading(false); }
  }

  async function configure(enabled) {
    setBusy(true);
    setError("");
    setNotice("");
    tracker?.stop();
    setSnapshot(null);
    try {
      const { data } = enabled
        ? await api.put("/api/v1/recommendation-preferences", { enabled: true })
        : await api.delete("/api/v1/recommendation-preferences");
      setPreferences(data);
      setHidden([]);
      if (data.enabled) {
        const feed = await api.get("/api/v1/recommendations?surface=home&limit=6");
        setSnapshot(feed.data);
      } else setNotice("Collection is off and your suggestion history is cleared. Your saved books are kept.");
    } catch (failure) { setError(message(failure)); }
    finally { setBusy(false); }
  }

  const items = snapshot?.items.filter(book => !hidden.includes(book._id)) || [];
  return (
    <section className="recommendations" aria-labelledby="recommendations-title">
      <div className="page-heading">
        <div><p className="eyebrow">DISCOVER SOMETHING NEW</p><h2 id="recommendations-title">Book suggestions</h2></div>
        {preferences?.enabled && <div className="recommendation-buttons">
          <button disabled={busy || loading} onClick={refresh}>Refresh suggestions</button>
          <button className="text-button" disabled={busy || loading} onClick={() => configure(false)}>Turn off & clear history</button>
        </div>}
      </div>
      {loading ? <Loading /> : preferences?.enabled ? (
        <p className="muted">Recent available books. Saved and dismissed suggestions are left out. Suggestion activity collection is on.</p>
      ) : preferences && (
        <div className="panel">
          <p>Allow Shelv to record which suggestions you see, open, save or dismiss. You can turn collection off and clear this history at any time.</p>
          <p className="muted">Suggestions currently show recent available books.</p>
          <button className="button secondary" disabled={busy} onClick={() => configure(true)}>Enable book suggestions</button>
        </div>
      )}
      {error && <><ErrorMessage>{error}</ErrorMessage><p className="muted">You can still browse all books below.</p>
        <button disabled={busy || loading} onClick={refresh}>Retry suggestions</button></>}
      <p role="status" className="muted">{notice}</p>
      {snapshot && tracker && <div className="book-grid">
        {items.map(book => <Suggestion key={`${snapshot.requestId}:${book._id}`} book={book} tracker={tracker} Card={Card}
          onRemove={(id, text) => { setHidden(previous => [...previous, id]); setNotice(text); }} />)}
      </div>}
      {snapshot && !items.length && <p className="muted">No suggestions are available right now. Explore all books below.</p>}
    </section>
  );
}
