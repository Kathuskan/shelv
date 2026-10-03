import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { message, saveSession } from "./core/api";
export default function SocialSuccess() {
  const [token] = useState(() =>
      new URLSearchParams(window.location.hash.slice(1)).get("token")
    ),
    [error, setError] = useState("");
  useEffect(() => {
    window.history.replaceState(null, "", "/social-success");
    if (!token) return;
    api
      .get("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
        skipAuth: true,
      })
      .then(({ data }) => saveSession({ token, user: data }))
      .catch((e) => setError(message(e)));
  }, [token]);
  return (
    <section className="panel narrow">
      <h1>Signing you in</h1>
      {error || !token ? (
        <p>
          {error || "The sign-in link is invalid."}{" "}
          <Link to="/login">Return to sign in</Link>
        </p>
      ) : (
        <p>Please wait…</p>
      )}
    </section>
  );
}
