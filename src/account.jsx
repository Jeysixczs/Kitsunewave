import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  accountsEnabled,
  googleEnabled,
  inList,
  openAuth,
  removeHistory,
  removeProgress,
  resetPassword,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
  toggleList,
  useLibrary,
} from "./library.js";

// Profile picture: the chosen emoji, or the first letter of the name / email
export const isPhotoAvatar = (value) => /^https?:\/\//i.test(value || "");

export function Avatar({ user, className = "" }) {
  const label = (user.name || user.email || "?").trim().charAt(0).toUpperCase();
  return (
    <span className={`avatar ${className}`.trim()}>
      {isPhotoAvatar(user.avatar) ? <img src={user.avatar} alt="" referrerPolicy="no-referrer" /> : user.avatar || label}
    </span>
  );
}

export const watchHref = (item) =>
  `/watch.html?id=${encodeURIComponent(item.id)}` +
  (item.episodeId ? `&ep=${encodeURIComponent(item.episodeId)}&lang=${item.language || "sub"}` : "");

export function timeAgo(at) {
  const minutes = Math.round((Date.now() - at) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ---------------------------------------------------------------- sign in / sign up

function AuthModal({ onClose }) {
  const { user } = useLibrary();
  const [mode, setMode] = useState("signin"); // signin | signup | reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.classList.add("menu-open");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("menu-open");
    };
  }, [onClose]);

  useEffect(() => {
    if (user) onClose();
  }, [user, onClose]);

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setInfo("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setInfo("");
    if (mode !== "reset" && password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    setBusy(true);
    const result =
      mode === "reset"
        ? await resetPassword(email.trim())
        : mode === "signup"
          ? await signUp(email.trim(), password)
          : await signIn(email.trim(), password);
    setBusy(false);
    if (result.error) setError(result.error);
    if (result.info) setInfo(result.info);
  };

  const title = mode === "signup" ? "Create your account" : mode === "reset" ? "Reset password" : "Welcome back";
  const action = mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in";

  return createPortal(
    <div className="auth-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="auth-backdrop" onClick={onClose} />
      <form className="auth-card" onSubmit={submit}>
        <button type="button" className="menu-close auth-close" aria-label="Close" onClick={onClose}>×</button>
        <h2>{title}</h2>
        <p className="auth-sub">
          Save your watch list, bookmarks, watched anime and where you left off — on every device.
        </p>
        {mode !== "reset" && (
          <div className="auth-tabs" role="tablist">
            <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => switchMode("signin")}>Sign in</button>
            <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => switchMode("signup")}>Sign up</button>
          </div>
        )}
        <label>
          <span>Email</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {mode !== "reset" && (
          <label>
            <span>Password</span>
            <input
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        {error && <p className="auth-message error" role="alert">{error}</p>}
        {info && <p className="auth-message">{info}</p>}
        <button className="button auth-submit" type="submit" disabled={busy}>
          {busy ? "Please wait…" : action}
        </button>
        {googleEnabled && mode !== "reset" && (
          <button
            type="button"
            className="button secondary auth-google"
            onClick={async () => {
              const result = await signInWithGoogle();
              if (result.error) setError(result.error);
            }}
          >
            Continue with Google
          </button>
        )}
        {mode === "signin" && (
          <button type="button" className="auth-link" onClick={() => switchMode("reset")}>Forgot your password?</button>
        )}
        {mode === "reset" && (
          <button type="button" className="auth-link" onClick={() => switchMode("signin")}>← Back to sign in</button>
        )}
      </form>
    </div>,
    document.body,
  );
}

// Header control: "Sign in" when logged out, an avatar menu when logged in.
// Renders nothing when accounts are not configured (the library still works as a guest).
export function AccountButton() {
  const { user, authOpen, ready } = useLibrary();
  const [menu, setMenu] = useState(false);
  const wrap = useRef(null);

  useEffect(() => {
    if (!menu) return undefined;
    const close = (event) => !wrap.current?.contains(event.target) && setMenu(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menu]);

  if (!accountsEnabled) return null;
  return (
    <div className="account-slot" ref={wrap}>
      {user ? (
        <>
          <button
            type="button"
            className="account-avatar"
            aria-label="Account menu"
            aria-expanded={menu}
            onClick={() => setMenu((open) => !open)}
          >
            <Avatar user={user} />
          </button>
          {menu && (
            <div className="account-menu" role="menu">
              <small>{user.name ? `${user.name} · ${user.email}` : user.email}</small>
              <a href="/profile.html" role="menuitem">Profile</a>
              <a href="/library.html" role="menuitem">My library</a>
              <button type="button" role="menuitem" onClick={() => { setMenu(false); signOut(); }}>Sign out</button>
            </div>
          )}
        </>
      ) : (
        <button type="button" className="account-signin" disabled={!ready} onClick={() => openAuth(true)}>
          Sign in
        </button>
      )}
      {authOpen && <AuthModal onClose={() => openAuth(false)} />}
    </div>
  );
}

// ---------------------------------------------------------------- list buttons

// Watch list / Bookmark / Watched toggles for one anime ({ id, title, poster, type })
export function LibraryActions({ anime }) {
  const library = useLibrary();
  const buttons = [
    ["watchlist", "＋ Watch list", "✓ In watch list"],
    ["bookmark", "☆ Bookmark", "★ Bookmarked"],
    ["watched", "○ Mark watched", "✓ Watched"],
  ];
  return (
    <div className="lib-actions">
      {buttons.map(([list, off, on]) => {
        const active = inList(library, list, anime.id);
        return (
          <button
            key={list}
            type="button"
            className={`lib-btn${active ? " active" : ""}`}
            aria-pressed={active}
            onClick={() => toggleList(list, anime)}
          >
            {active ? on : off}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- cards

// A poster card for the library. `sub` is the line under the title; `onRemove` shows a ×.
export function LibCard({ item, href, sub, onRemove }) {
  return (
    <div className="lib-item">
      <a className="card" href={href}>
        <div className="poster">
          {item.poster && <img loading="lazy" src={item.poster} alt={item.title || "Anime"} />}
        </div>
        <h3>{item.title || "Untitled"}</h3>
        <p>{sub}</p>
      </a>
      {onRemove && (
        <button type="button" className="lib-remove" aria-label={`Remove ${item.title || "anime"}`} onClick={onRemove}>
          ×
        </button>
      )}
    </div>
  );
}

// Home page rail: pick up where you left off
export function ContinueRail() {
  const { data } = useLibrary();
  const items = data.progress.slice(0, 12);
  if (!items.length) return null;
  return (
    <section>
      <div className="section-heading">
        <h2>Continue watching</h2>
        <a className="section-link" href="/library.html">
          My library <span aria-hidden="true">→</span>
        </a>
      </div>
      <div className="rail rail-fixed">
        {items.map((item) => (
          <LibCard
            key={item.id}
            item={item}
            href={watchHref(item)}
            sub={`Episode ${item.episodeNumber} · ${(item.language || "sub").toUpperCase()}`}
            onRemove={() => removeProgress(item.id)}
          />
        ))}
      </div>
    </section>
  );
}

export { removeHistory, removeProgress };
