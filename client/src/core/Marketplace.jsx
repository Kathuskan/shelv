import { useState } from "react";
import {
  Link,
  useParams,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import api, { money, message } from "./api";
import useResource from "./useResource";
import { SaveBook } from "./SavedBooks";
import { ErrorMessage, Field, Loading } from "./Common";
function Cover({ book }) {
  const src = book.images?.[0];
  return src ? (
    <img
      className="cover"
      src={
        src.includes("res.cloudinary.com")
          ? src.replace("/upload/", "/upload/w_600,q_auto,f_auto/")
          : src
      }
      alt={`${book.title} cover`}
      loading="lazy"
    />
  ) : (
    <div className="cover placeholder">
      {book.title}
      <small>{book.author}</small>
    </div>
  );
}
function BookTile({ book }) {
  return (
    <Link className="book-tile" to={`/book/${book._id}`}>
      <div className="cover-wrap">
        <Cover book={book} />
        <span className="badge cover-badge">{book.condition}</span>
      </div>
      <div className="book-copy">
        <p className="eyebrow">{book.category}</p>
        <h3>{book.title}</h3>
        <p className="muted">{book.author}</p>
        <div className="split">
          <strong>{money(book.price * 100)}</strong>
          <small>{book.stock} available</small>
        </div>
      </div>
    </Link>
  );
}
export function Home() {
  const [params, setParams] = useSearchParams(),
    q = params.get("q") || "",
    condition = params.get("condition") || "",
    page = Number(params.get("page") || 1);
  const { data, error, loading } = useResource(
    `/api/books?${params.toString()}`
  );
  function search(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setParams({
      q: form.get("q"),
      condition: form.get("condition"),
      page: "1",
    });
  }
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">NEW STORIES. SECOND CHANCES.</p>
          <h1>
            Find your next
            <br />
            <em>can’t-put-it-down.</em>
          </h1>
          <p>
            Shop new and pre-loved books from independent sellers.
            <br />
            Delivered to your door, ready for a new chapter.
          </p>
          <a className="button" href="#browse">
            Explore the shelves ↗
          </a>
        </div>
        <div className="book-art" aria-hidden="true">
          <div className="art-book one">
            a little
            <br />
            wonder<span>STORIES TO KEEP</span>
          </div>
          <div className="art-book two">
            THE
            <br />
            NEXT
            <br />
            CHAPTER<span>YOURS TO DISCOVER</span>
          </div>
          <div className="art-note">
            Good books.
            <br />
            New beginnings.
          </div>
        </div>
      </section>
      <section id="browse">
        <div className="page-heading">
          <div>
            <p className="eyebrow">THE MARKETPLACE</p>
            <h2>Fresh on the shelves</h2>
          </div>
          <span className="badge">{data?.total ?? "…"} books</span>
        </div>
        <form className="search-bar" onSubmit={search}>
          <Field
            title="Search books"
            name="q"
            defaultValue={q}
            placeholder="Search title or author…"
            maxLength={100}
          />
          <Field title="Condition">
            <select name="condition" defaultValue={condition}>
              <option value="">New & used</option>
              <option>New</option>
              <option>Used</option>
            </select>
          </Field>
          <button className="button">Find a book</button>
        </form>
        <ErrorMessage>{error}</ErrorMessage>
        {loading ? (
          <Loading />
        ) : data?.items.length ? (
          <div className="book-grid">
            {data.items.map((book) => (
              <BookTile key={book._id} book={book} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <h3>A little room on this shelf</h3>
            <p>No books match this search. Try another title or author.</p>
          </div>
        )}
        <div className="pagination">
          <button
            disabled={page <= 1}
            onClick={() => setParams({ q, condition, page: String(page - 1) })}
          >
            Previous
          </button>
          <span>
            Page {page} of {Math.max(1, data?.pages || 1)}
          </span>
          <button
            disabled={!data || page >= data.pages}
            onClick={() => setParams({ q, condition, page: String(page + 1) })}
          >
            Next
          </button>
        </div>
      </section>
    </>
  );
}
export function BookPage({ user }) {
  const { id } = useParams(),
    { data, error, loading } = useResource(`/api/books/${id}`);
  if (loading) return <Loading />;
  if (!data) return <ErrorMessage>{error}</ErrorMessage>;
  const { book, reviews } = data;
  return (
    <>
      <Link className="back" to="/">
        ← Back to books
      </Link>
      <ErrorMessage>{error}</ErrorMessage>
      <section className="detail-grid">
        <div className="detail-cover">
          <Cover book={book} />
          {book.images?.length > 1 && (
            <div className="thumbnails">
              {book.images.slice(1).map((src) => (
                <a key={src} href={src} target="_blank" rel="noreferrer">
                  <img src={src} alt={`${book.title} additional view`} />
                </a>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="eyebrow">
            {book.category} · {book.language}
          </p>
          <h1>{book.title}</h1>
          <p className="byline">by {book.author}</p>
          <span className="badge">{book.condition}</span>
          <p className="price">{money(book.price * 100)}</p>
          <p className="prose">{book.description}</p>
          <dl className="facts">
            <div>
              <dt>Seller</dt>
              <dd>{book.seller.name}</dd>
            </div>
            <div>
              <dt>Dispatches from</dt>
              <dd>{book.dispatchFrom || "Ask seller through your order"}</dd>
            </div>
            <div>
              <dt>Delivery per order</dt>
              <dd>{money(book.deliveryFee * 100)}</dd>
            </div>
            <div>
              <dt>Available copies</dt>
              <dd>{book.stock}</dd>
            </div>
            {book.isbn && (
              <div>
                <dt>ISBN</dt>
                <dd>{book.isbn}</dd>
              </div>
            )}
            {book.edition && (
              <div>
                <dt>Edition</dt>
                <dd>{book.edition}</dd>
              </div>
            )}
          </dl>
          {book.conditionNotes && (
            <p className="notice">Condition: {book.conditionNotes}</p>
          )}
          {String(user?.id) === String(book.seller._id) ? (
            <Link className="button" to={`/edit-book/${id}`}>
              Edit your listing
            </Link>
          ) : book.stock > 0 ? (
            <Link className="button" to={user ? `/checkout/${id}` : "/login"}>
              Buy this book →
            </Link>
          ) : (
            <p className="notice">This book is sold out.</p>
          )}
          {user && <SaveBook id={id} />}
          <p className="muted small-copy">
            Delivery details and payment method are confirmed at checkout.
          </p>
        </div>
      </section>
      <section className="panel">
        <h2>Readers’ reviews</h2>
        {reviews.length ? (
          reviews.map((review) => (
            <article className="review" key={review._id}>
              <strong>
                {review.name} · {review.rating}/5
              </strong>
              <span className="badge">Verified purchase</span>
              <p>{review.comment}</p>
            </article>
          ))
        ) : (
          <p className="muted">
            No reviews yet. Buyers can leave a review after delivery.
          </p>
        )}
      </section>
    </>
  );
}
export function Listings() {
  const { data, error, loading, reload } = useResource("/api/seller/books"),
    [actionError, setActionError] = useState(""),
    [busy, setBusy] = useState("");
  async function archive(id) {
    if (
      !window.confirm(
        "Archive this listing? Existing orders will stay available."
      )
    )
      return;
    setBusy(id);
    try {
      await api.delete(`/api/books/${id}`);
      reload();
    } catch (e) {
      setActionError(message(e));
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SELLER STUDIO</p>
          <h1>Your shelves</h1>
        </div>
        <Link className="button" to="/add-book">
          + List a book
        </Link>
      </div>
      <ErrorMessage>{error || actionError}</ErrorMessage>
      {loading ? (
        <Loading />
      ) : data?.length ? (
        <div className="panel">
          {data.map((book) => (
            <div className="list-row" key={book._id}>
              <div>
                <h3>{book.title}</h3>
                <p className="muted">
                  {money(book.price * 100)} · {book.stock} copies ·{" "}
                  {book.status}
                </p>
              </div>
              <div className="actions">
                <Link
                  className="button secondary small"
                  to={`/edit-book/${book._id}`}
                >
                  Edit
                </Link>
                {book.status !== "archived" && (
                  <button
                    disabled={busy === book._id}
                    onClick={() => archive(book._id)}
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <h2>Your first listing starts here</h2>
          <p>Add a book, set the delivery fee, and give it a new home.</p>
        </div>
      )}
    </>
  );
}
export function BookEditor() {
  const { id } = useParams();
  return id ? <ExistingEditor key={id} id={id} /> : <EditorForm />;
}
function ExistingEditor({ id }) {
  const { data, error, loading } = useResource(`/api/seller/books/${id}`);
  if (loading) return <Loading />;
  if (!data) return <ErrorMessage>{error}</ErrorMessage>;
  return <EditorForm book={data} />;
}
function EditorForm({ book }) {
  const navigate = useNavigate(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    data.set("listingType", "Sale");
    if (book) data.set("version", book.__v || 0);
    try {
      if (book) await api.put(`/api/books/${book._id}`, data);
      else await api.post("/api/books", data);
      navigate("/my-listings");
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="back" to="/my-listings">
        ← My listings
      </Link>
      <h1>{book ? "Edit your listing" : "Give a book its next chapter"}</h1>
      <form className="panel" onSubmit={submit}>
        <ErrorMessage>{error}</ErrorMessage>
        <div className="form-grid">
          {[
            ["title", "Book title", true],
            ["author", "Author", true],
            ["category", "Category", true],
            ["isbn", "ISBN (optional)", false],
            ["language", "Language", true],
            ["edition", "Edition (optional)", false],
            ["dispatchFrom", "Dispatch city or town", true],
          ].map(([name, title, required]) => (
            <Field
              key={name}
              name={name}
              title={title}
              defaultValue={
                book?.[name] || (name === "language" ? "English" : "")
              }
              required={required}
              maxLength={
                name === "title"
                  ? 200
                  : name === "author"
                  ? 160
                  : name === "isbn"
                  ? 30
                  : name === "language"
                  ? 50
                  : name === "dispatchFrom"
                  ? 100
                  : 80
              }
            />
          ))}
          <Field title="Condition">
            <select name="condition" defaultValue={book?.condition || "Used"}>
              <option>New</option>
              <option>Used</option>
            </select>
          </Field>
          <Field
            title="Price (LKR)"
            name="price"
            type="number"
            min="1"
            max="1000000"
            step="0.01"
            required
            defaultValue={book?.price}
          />
          <Field
            title="Available copies"
            name="stock"
            type="number"
            min="0"
            max="10000"
            step="1"
            required
            defaultValue={book?.stock ?? 1}
          />
          <Field
            title="Delivery fee per order (LKR)"
            name="deliveryFee"
            type="number"
            min="0"
            max="1000000"
            step="0.01"
            required
            defaultValue={book?.deliveryFee ?? 0}
          />
          {book && (
            <Field title="Listing status">
              <select name="status" defaultValue={book.status}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
          )}
        </div>
        <Field title="Description">
          <textarea
            name="description"
            required
            defaultValue={book?.description}
            maxLength={5000}
            rows={5}
          />
        </Field>
        <Field title="Condition notes (marks, damage, missing pages)">
          <textarea
            name="conditionNotes"
            defaultValue={book?.conditionNotes}
            maxLength={1000}
          />
        </Field>
        {book?.images?.length > 0 && (
          <div className="thumbnails">
            {book.images.map((src) => (
              <img key={src} src={src} alt="Current book image" />
            ))}
          </div>
        )}
        <Field
          title={book ? "Replace photos (optional)" : "Book photos"}
          name="images"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          required={!book}
        />
        <p className="muted">
          Up to 5 JPG, PNG or WebP photos, 5 MB each. Delivery fee covers all
          copies in this order.
        </p>
        <button className="button" disabled={busy}>
          {busy ? "Saving…" : "Save listing"}
        </button>
      </form>
    </>
  );
}
export function AdminPage() {
  const users = useResource("/api/admin/users"),
    books = useResource("/api/admin/books"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  async function moderate(id, action) {
    setBusy(id);
    try {
      await api.put(`/api/admin/users/${id}`, { action });
      users.reload();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy("");
    }
  }
  async function archive(id) {
    if (!window.confirm("Archive this listing?")) return;
    setBusy(id);
    try {
      await api.delete(`/api/admin/books/${id}`);
      books.reload();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <div className="page-heading">
        <h1>Marketplace administration</h1>
        <Link className="button" to="/admin/orders">
          Orders & delivery issues
        </Link>
      </div>
      <ErrorMessage>{error || users.error || books.error}</ErrorMessage>
      <section className="panel">
        <h2>Seller applications & accounts</h2>
        {users.loading ? (
          <Loading />
        ) : (
          users.data
            ?.filter((u) => u.sellerStatus !== "none")
            .map((u) => (
              <div className="list-row" key={u._id}>
                <div>
                  <strong>{u.name}</strong>
                  <p>
                    {u.email} · {u.sellerStatus}
                  </p>
                </div>
                <div className="actions">
                  {["pending", "restricted"].includes(u.sellerStatus) && (
                    <button
                      disabled={busy === u._id}
                      onClick={() => moderate(u._id, "approve")}
                    >
                      Approve
                    </button>
                  )}
                  {u.sellerStatus !== "restricted" && (
                    <button
                      disabled={busy === u._id}
                      onClick={() => moderate(u._id, "restrict")}
                    >
                      Restrict
                    </button>
                  )}
                </div>
              </div>
            ))
        )}
      </section>
      <section className="panel">
        <h2>Listings</h2>
        {books.data?.map((b) => (
          <div className="list-row" key={b._id}>
            <span>
              {b.title} · {b.seller?.name} · {b.status}
            </span>
            {b.status !== "archived" && (
              <button disabled={busy === b._id} onClick={() => archive(b._id)}>
                Archive
              </button>
            )}
          </div>
        ))}
      </section>
    </>
  );
}
