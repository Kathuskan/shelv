import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { message, saveSession } from "./api";
import useResource from "./useResource";
import { SavedBooks, ProfilePhoto } from "./SavedBooks";
import { AddressFields, Field, ErrorMessage } from "./Common";
export function AuthPage({ register = false }) {
  const { data: config } = useResource("/api/config");
  const [params] = useSearchParams();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const response = await api.post(
        `/api/auth/${register ? "register" : "login"}`,
        data
      );
      saveSession(response.data);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  async function forgot(e) {
    const form = e.currentTarget.closest("form");
    const email = form.elements.email.value;
    if (!email) {
      setError("Enter your email address first.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/api/auth/forgot-password", { email });
      setNotice(data.message);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel narrow">
      <p className="eyebrow">YOUR NEXT CHAPTER</p>
      <h1>{register ? "Welcome to Shelv" : "Good to see you again"}</h1>
      <p className="muted">Discover books. Make room for new stories.</p>
      <form onSubmit={submit}>
        <ErrorMessage>
          {error ||
            (params.get("error") === "google"
              ? "Google sign-in could not be completed. If you already registered with email, use your password or reset it."
              : "")}
        </ErrorMessage>
        {notice && (
          <p role="status" className="notice">
            {notice}
          </p>
        )}
        {register && (
          <Field
            title="Your name"
            name="name"
            autoComplete="name"
            required
            maxLength={100}
          />
        )}
        <Field
          title="Email address"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <Field
          title="Password"
          name="password"
          type="password"
          required
          minLength={register ? 10 : 1}
          maxLength={128}
          autoComplete={register ? "new-password" : "current-password"}
        />
        <button className="button" disabled={busy}>
          {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
        </button>
        {!register && (
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={forgot}
          >
            Forgot password?
          </button>
        )}
      </form>
      {config?.googleLogin && (
        <a
          className="button secondary full google-signin"
          href={`${api.defaults.baseURL}/api/auth/google`}
        >
          Continue with Google
        </a>
      )}
      <p className="muted">
        {register ? "Already have an account?" : "New here?"}{" "}
        <Link to={register ? "/login" : "/register"}>
          {register ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </section>
  );
}
export function ResetPassword() {
  const [params] = useSearchParams(),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/api/auth/reset-password", {
        token: params.get("token"),
        password: e.currentTarget.elements.password.value,
      });
      setNotice(data.message);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel narrow">
      <h1>Reset your password</h1>
      <ErrorMessage>{error}</ErrorMessage>
      {notice ? (
        <p>
          {notice} <Link to="/login">Sign in</Link>
        </p>
      ) : (
        <form onSubmit={submit}>
          <Field
            title="New password"
            name="password"
            type="password"
            required
            minLength={10}
            maxLength={128}
          />
          <button className="button" disabled={busy}>
            Save password
          </button>
        </form>
      )}
    </section>
  );
}
export function ProfilePage({ user, config }) {
  const [address, setAddress] = useState(user.deliveryAddress || {}),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.put("/api/user/profile", {
        name: e.currentTarget.elements.name.value,
        deliveryAddress: address,
      });
      localStorage.setItem("user", JSON.stringify(data));
      setNotice("Your details have been saved.");
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR SHELV</p>
          <h1>Account & delivery</h1>
          <p className="muted">{user.email}</p>
        </div>
        <Link className="button secondary" to="/apply-seller">
          Seller account: {user.sellerStatus}
        </Link>
      </div>
      <form className="panel" onSubmit={submit}>
        <ErrorMessage>{error}</ErrorMessage>
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        <Field
          title="Your name"
          name="name"
          defaultValue={user.name}
          required
          maxLength={100}
        />
        <h2>Default delivery address</h2>
        <p className="muted">
          Each order keeps its own address. Changes here apply to future
          checkouts.
        </p>
        <AddressFields
          value={address}
          setValue={setAddress}
          districts={config?.districts}
        />
        <button className="button" disabled={busy}>
          {busy ? "Saving…" : "Save details"}
        </button>
      </form>
      <ProfilePhoto user={user} />
      <SavedBooks />
    </>
  );
}
export function SellerApplication({ user }) {
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(user.sellerStatus);
  async function send() {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/api/auth/send-otp");
      setNotice(data.message);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(
        "/api/auth/verify-otp",
        Object.fromEntries(new FormData(e.currentTarget))
      );
      setStatus(data.sellerStatus);
      setNotice("Application submitted. An administrator will review it.");
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel narrow">
      <p className="eyebrow">PASS ON A GREAT READ</p>
      <h1>Become a seller</h1>
      <ErrorMessage>{error}</ErrorMessage>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {user.role === "admin" || status === "approved" ? (
        <Link className="button" to="/my-listings">
          Manage your listings
        </Link>
      ) : status === "pending" ? (
        <p>
          Your application is awaiting approval. Check back here for the
          decision.
        </p>
      ) : status === "restricted" ? (
        <p>
          Your seller account is restricted. Existing orders remain available in
          Seller orders; contact the marketplace administrator about restoring
          listings.
        </p>
      ) : (
        <>
          <p>Verify {user.email}, then submit your application for review.</p>
          <button className="button secondary" disabled={busy} onClick={send}>
            Send verification code
          </button>
          <form onSubmit={submit}>
            <Field
              title="Six-digit email code"
              name="code"
              pattern="[0-9]{6}"
              required
              autoComplete="one-time-code"
            />
            <Field
              title="Seller phone"
              name="phone"
              type="tel"
              required
              placeholder="0771234567"
            />
            <button className="button" disabled={busy}>
              Submit application
            </button>
          </form>
        </>
      )}
    </section>
  );
}
