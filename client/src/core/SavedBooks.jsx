import { useState } from "react";
import { Link } from "react-router-dom";
import api, { message, money } from "./api";
import useResource from "./useResource";
import { ErrorMessage, Loading } from "./Common";
export function SaveBook({ id }) {
  const [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await api.put(`/api/user/saved-books/${id}`);
      setNotice("Saved to your account.");
    } catch (e) {
      setNotice(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button className="text-button" disabled={busy} onClick={save}>
        ♡ Save for later
      </button>
      {notice && <small role="status">{notice}</small>}
    </div>
  );
}
export function SavedBooks() {
  const { data, error, loading, reload } = useResource("/api/user/saved-books"),
    [actionError, setActionError] = useState("");
  async function remove(id) {
    try {
      await api.delete(`/api/user/saved-books/${id}`);
      reload();
    } catch (e) {
      setActionError(message(e));
    }
  }
  return (
    <section className="panel">
      <h2>Your saved books</h2>
      <ErrorMessage>{error || actionError}</ErrorMessage>
      {loading ? (
        <Loading />
      ) : data?.length ? (
        data.map((b) => (
          <div className="list-row" key={b._id}>
            <Link to={`/book/${b._id}`}>
              <strong>{b.title}</strong>
              <p>
                {b.author} · {money(b.price * 100)}
              </p>
            </Link>
            <button onClick={() => remove(b._id)}>Remove</button>
          </div>
        ))
      ) : (
        <p className="muted">
          Save books while you browse to find them here later.
        </p>
      )}
    </section>
  );
}
export function ProfilePhoto({ user }) {
  const [photo, setPhoto] = useState(user.profilePicture),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function upload(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post(
        "/api/user/profile-photo",
        new FormData(e.currentTarget)
      );
      setPhoto(data.profilePicture);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel" onSubmit={upload}>
      <h2>Profile photo</h2>
      {photo && (
        <img
          src={photo}
          alt="Your profile"
          width="80"
          height="80"
          style={{ borderRadius: "50%", marginBottom: 15 }}
        />
      )}
      <ErrorMessage>{error}</ErrorMessage>
      <label className="field">
        <span>Choose photo (up to 5 MB)</span>
        <input
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
        />
      </label>
      <button className="button secondary" disabled={busy}>
        Update photo
      </button>
    </form>
  );
}
