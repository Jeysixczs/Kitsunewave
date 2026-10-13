// Library + account store.
//
// Everything (watch list, bookmarks, watched, continue watching, history) lives in one
// document per person. Guests keep it in localStorage. When Supabase is configured and
// someone signs in, the document is synced to the `user_library` table (see
// supabase/schema.sql) and merged with whatever the guest had saved on this device.
import { useSyncExternalStore } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const accountsEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);
export const googleEnabled = import.meta.env.VITE_AUTH_GOOGLE === "true";

const PREFIX = "kw:library:v1:";
const HISTORY_CAP = 300;
const LIST_CAP = 1000;
const SAVE_DELAY = 800;

const emptyData = () => ({ watchlist: [], bookmark: [], watched: [], progress: [], history: [], updatedAt: 0 });

function normalize(raw) {
  const base = emptyData();
  if (!raw || typeof raw !== "object") return base;
  Object.keys(base).forEach((key) => {
    if (key === "updatedAt") base.updatedAt = Number(raw.updatedAt) || 0;
    else if (Array.isArray(raw[key])) base[key] = raw[key].filter((item) => item && item.id);
  });
  return base;
}

function readLocal(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? normalize(JSON.parse(raw)) : emptyData();
  } catch {
    return emptyData();
  }
}

function writeLocal(key, data) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(data));
  } catch {
    /* storage full or blocked: the in-memory copy still works */
  }
}

const hasContent = (data) =>
  ["watchlist", "bookmark", "watched", "progress", "history"].some((key) => data[key].length);

function mergeBy(a, b, keyOf, cap) {
  const map = new Map();
  [...a, ...b].forEach((item) => {
    const key = keyOf(item);
    const current = map.get(key);
    if (!current || (item.at || 0) > (current.at || 0)) map.set(key, item);
  });
  return [...map.values()].sort((x, y) => (y.at || 0) - (x.at || 0)).slice(0, cap);
}

function mergeData(a, b) {
  return {
    watchlist: mergeBy(a.watchlist, b.watchlist, (x) => x.id, LIST_CAP),
    bookmark: mergeBy(a.bookmark, b.bookmark, (x) => x.id, LIST_CAP),
    watched: mergeBy(a.watched, b.watched, (x) => x.id, LIST_CAP),
    progress: mergeBy(a.progress, b.progress, (x) => x.id, LIST_CAP),
    history: mergeBy(a.history, b.history, (x) => `${x.id}|${x.episodeId}`, HISTORY_CAP),
    updatedAt: Math.max(a.updatedAt, b.updatedAt, Date.now()),
  };
}

// ---------------------------------------------------------------- state

let state = {
  user: null, // { id, email }
  ready: !accountsEnabled, // false until the saved session has been checked
  data: readLocal("guest"),
  authOpen: false,
  syncError: "",
};
const listeners = new Set();

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

const storageKey = () => (state.user ? state.user.id : "guest");

export function getState() {
  return state;
}

export function useLibrary() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

export const inList = (library, list, id) => library.data[list].some((item) => item.id === String(id));

export function openAuth(open = true) {
  setState({ authOpen: open });
}

// ---------------------------------------------------------------- cloud

let clientPromise = null;
function getClient() {
  if (!accountsEnabled) return Promise.resolve(null);
  if (!clientPromise) {
    // Loaded on demand so builds without Supabase configured never download it
    clientPromise = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      }),
    );
  }
  return clientPromise;
}

async function pullCloud(userId) {
  const sb = await getClient();
  const { data, error } = await sb.from("user_library").select("data").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data ? normalize(data.data) : null;
}

let saveTimer = null;

async function flushSave() {
  saveTimer = null;
  const user = state.user;
  if (!user) return;
  try {
    const sb = await getClient();
    const { error } = await sb
      .from("user_library")
      .upsert({ user_id: user.id, data: state.data, updated_at: new Date().toISOString() });
    if (error) throw error;
    if (state.syncError) setState({ syncError: "" });
  } catch (err) {
    setState({ syncError: err.message || "Could not sync your library" });
  }
}

function scheduleSave() {
  if (!state.user) return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(flushSave, SAVE_DELAY);
}

// What the app keeps about the signed-in person (name + avatar live in the auth user metadata)
const toAccount = (user) => ({
  id: user.id,
  email: user.email || "",
  name: user.user_metadata?.display_name || "",
  avatar: user.user_metadata?.avatar || "",
  createdAt: user.created_at || "",
});

async function handleSignedIn(user) {
  const account = toAccount(user);
  const local = readLocal(account.id);
  const guest = readLocal("guest");
  let cloud = null;
  let syncError = "";
  try {
    cloud = await pullCloud(account.id);
  } catch (err) {
    syncError = err.message || "Could not load your library";
  }
  // Last write wins between this device's copy and the cloud copy...
  let data = cloud && cloud.updatedAt >= local.updatedAt ? cloud : local;
  let needsSave = !cloud || local.updatedAt > cloud.updatedAt;
  // ...then whatever was saved as a guest on this device is folded in
  if (hasContent(guest)) {
    data = mergeData(data, guest);
    writeLocal("guest", emptyData());
    needsSave = true;
  }
  writeLocal(account.id, data);
  setState({ user: account, data, ready: true, syncError, authOpen: false });
  if (needsSave && !syncError) scheduleSave();
}

function handleSignedOut() {
  window.clearTimeout(saveTimer);
  saveTimer = null;
  setState({ user: null, data: readLocal("guest"), ready: true, syncError: "" });
}

async function refreshFromCloud() {
  if (!state.user || saveTimer) return;
  try {
    const cloud = await pullCloud(state.user.id);
    if (cloud && cloud.updatedAt > state.data.updatedAt && !saveTimer) {
      writeLocal(state.user.id, cloud);
      setState({ data: cloud });
    }
  } catch {
    /* stay on the local copy */
  }
}

if (accountsEnabled && typeof window !== "undefined") {
  getClient()
    .then(async (sb) => {
      sb.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT") handleSignedOut();
        else if (event === "USER_UPDATED" && session?.user && session.user.id === state.user?.id)
          setState({ user: toAccount(session.user) });
        else if (session?.user && session.user.id !== state.user?.id) handleSignedIn(session.user);
      });
      const { data } = await sb.auth.getSession();
      if (data.session?.user) {
        if (data.session.user.id !== state.user?.id) await handleSignedIn(data.session.user);
      } else {
        setState({ ready: true });
      }
    })
    .catch(() => setState({ ready: true }));
  window.addEventListener("focus", refreshFromCloud);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshFromCloud();
    else if (saveTimer) {
      window.clearTimeout(saveTimer);
      flushSave();
    }
  });
}

// ---------------------------------------------------------------- account actions

export async function signIn(email, password) {
  const sb = await getClient();
  if (!sb) return { error: "Accounts are not set up." };
  const { error } = await sb.auth.signInWithPassword({ email, password });
  return error ? { error: error.message } : {};
}

export async function signUp(email, password) {
  const sb = await getClient();
  if (!sb) return { error: "Accounts are not set up." };
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) return { error: error.message };
  if (!data.session) return { info: "Check your email to confirm your account, then sign in." };
  return {};
}

export async function signInWithGoogle() {
  const sb = await getClient();
  if (!sb) return { error: "Accounts are not set up." };
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.href },
  });
  return error ? { error: error.message } : {};
}

export async function resetPassword(email) {
  const sb = await getClient();
  if (!sb) return { error: "Accounts are not set up." };
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  return error ? { error: error.message } : { info: "If that email has an account, a reset link is on its way." };
}

// Display name + avatar (a preset emoji) are stored in the Supabase user metadata
export async function updateProfile({ name, avatar }) {
  const sb = await getClient();
  if (!sb || !state.user) return { error: "Sign in to edit your profile." };
  const { data, error } = await sb.auth.updateUser({ data: { display_name: name, avatar } });
  if (error) return { error: error.message };
  if (data?.user) setState({ user: toAccount(data.user) });
  return { info: "Profile saved." };
}

export async function changePassword(password) {
  const sb = await getClient();
  if (!sb || !state.user) return { error: "Sign in to change your password." };
  const { error } = await sb.auth.updateUser({ password });
  return error ? { error: error.message } : { info: "Password updated." };
}

export async function signOut() {
  if (saveTimer) {
    window.clearTimeout(saveTimer);
    await flushSave();
  }
  const sb = await getClient();
  if (sb) await sb.auth.signOut();
  handleSignedOut();
}

// ---------------------------------------------------------------- library actions

function commit(mutate) {
  const next = mutate(structuredClone(state.data));
  next.updatedAt = Date.now();
  writeLocal(storageKey(), next);
  setState({ data: next });
  scheduleSave();
}

const brief = (anime) => ({
  id: String(anime.id),
  title: anime.title || "Untitled",
  poster: anime.poster || "",
  type: anime.type || "",
});

const without = (list, id) => list.filter((item) => item.id !== id);

// Add or remove an anime from "watchlist" | "bookmark" | "watched"
export function toggleList(list, anime) {
  const id = String(anime.id);
  commit((data) => {
    if (data[list].some((item) => item.id === id)) {
      data[list] = without(data[list], id);
    } else {
      data[list] = [{ ...brief(anime), at: Date.now() }, ...data[list]].slice(0, LIST_CAP);
      if (list === "watched") {
        // Finished it: no longer "plan to watch" or "continue watching"
        data.watchlist = without(data.watchlist, id);
        data.progress = without(data.progress, id);
      }
    }
    return data;
  });
}

// Called when an episode is opened: updates "continue watching" and the history
export function recordWatch(anime, episode, language = "sub") {
  if (!anime?.id || !episode?.id) return;
  const id = String(anime.id);
  const episodeId = String(episode.id);
  const at = Date.now();
  commit((data) => {
    const entry = {
      ...brief(anime),
      episodeId,
      episodeNumber: episode.episodeNumber ?? "",
      language,
      at,
    };
    data.progress = [entry, ...without(data.progress, id)].slice(0, LIST_CAP);
    data.history = [
      entry,
      ...data.history.filter((item) => !(item.id === id && item.episodeId === episodeId)),
    ].slice(0, HISTORY_CAP);
    return data;
  });
}

export function removeProgress(id) {
  commit((data) => {
    data.progress = without(data.progress, String(id));
    return data;
  });
}

export function removeHistory(id, episodeId) {
  commit((data) => {
    data.history = data.history.filter((item) => !(item.id === String(id) && item.episodeId === String(episodeId)));
    return data;
  });
}

export function clearHistory() {
  commit((data) => {
    data.history = [];
    return data;
  });
}
