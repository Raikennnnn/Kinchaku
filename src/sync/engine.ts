import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  createUserWithEmailAndPassword,
  deleteUser,
  getRedirectResult,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  initializeFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  type Firestore,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { liveQuery } from "dexie";
import { authDomain, firebaseConfig } from "./config";
import { REDIRECT_FLAG } from "./client";
import { friendlyError } from "./errors";
import {
  advanceCursor,
  applyRemote,
  clearDevice,
  collectDirty,
  getCursor,
  getOwner,
  keyOf,
  markSynced,
  pendingCount,
  REMOTE_TABLES,
  setOwner,
  toRemote,
  type RemoteTable,
} from "./merge";
import { getSyncStatus, setSyncStatus, type SyncUser } from "./store";

// Records live at users/{uid}/{table}/{id} in Firestore, each stamped with
// the server time it arrived (syncedAt). A device reads everything that
// arrived since it last looked, and uploads whatever it has marked as changed.

let auth: Auth;
let fs: Firestore;
let started = false;
let session: { uid: string; stop: () => void } | null = null;

const BATCH = 400; // Firestore allows 500 writes per batch

export async function start() {
  if (started) return;
  started = true;
  const app = initializeApp({ ...firebaseConfig, authDomain: authDomain() });
  auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
  fs = initializeFirestore(app, { ignoreUndefinedProperties: true });

  // Back from Google's sign-in page: surface any problem it had.
  let returning = false;
  try {
    returning = sessionStorage.getItem(REDIRECT_FLAG) !== null;
    sessionStorage.removeItem(REDIRECT_FLAG);
  } catch {
    // Storage blocked.
  }
  if (returning) {
    getRedirectResult(auth).catch((e) => setSyncStatus({ error: friendlyError(e) || null }));
  }

  onAuthStateChanged(auth, (user) => {
    if (user) begin(user);
    else end();
  });
}

function toSyncUser(user: User): SyncUser {
  const google = user.providerData.some((p) => p.providerId === "google.com");
  return {
    uid: user.uid,
    email: user.email,
    name: user.displayName,
    photo: user.photoURL,
    provider: google ? "google" : "password",
    verified: user.emailVerified,
  };
}

/** Syncs this device with the signed-in account until sign-out. */
function begin(user: User) {
  if (session?.uid === user.uid) return;
  end();
  const uid = user.uid;
  const stops: (() => void)[] = [];
  let stopped = false;
  let pushing = false;
  let again = false;
  let ready = false; // uploads wait until the first download is in, on a device's first sign-in
  let pending = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  session = { uid, stop: () => ((stopped = true), stops.forEach((s) => s())) };
  setSyncStatus({ user: toSyncUser(user), phase: "starting", error: null });

  const settle = () => {
    if (stopped || getSyncStatus().phase === "error") return;
    if (!navigator.onLine) return setSyncStatus({ phase: "offline" });
    if (!ready) return setSyncStatus({ phase: "starting" });
    if (pending > 0 || pushing) return setSyncStatus({ phase: "syncing" });
    setSyncStatus({ phase: "synced", lastSynced: Date.now() });
  };
  const fail = (e: unknown) => {
    if (stopped) return;
    setSyncStatus({ phase: "error", error: friendlyError(e) || null });
    // Try again in a while; a new change or coming back online also retries.
    clearTimeout(timer);
    timer = setTimeout(() => {
      setSyncStatus({ phase: "syncing", error: null });
      void push();
    }, 30_000);
  };

  async function push() {
    if (stopped || !ready) return;
    if (pushing) {
      again = true;
      return;
    }
    pushing = true;
    settle();
    try {
      do {
        again = false;
        for (const table of REMOTE_TABLES) {
          const rows = await collectDirty(table);
          for (let i = 0; i < rows.length; i += BATCH) {
            const chunk = rows.slice(i, i + BATCH);
            const batch = writeBatch(fs);
            for (const row of chunk) {
              batch.set(doc(fs, "users", uid, table, keyOf(table, row)), { ...toRemote(row), syncedAt: serverTimestamp() });
            }
            // Offline, this waits until the connection is back.
            await batch.commit();
            if (stopped) return;
            await markSynced(table, chunk);
          }
        }
      } while (again && !stopped);
      pushing = false;
      if (getSyncStatus().phase === "error") setSyncStatus({ phase: "syncing", error: null });
      settle();
    } catch (e) {
      pushing = false;
      fail(e);
    }
  }

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void push(), 700);
  };

  // Download: listen to everything that arrives in the account after this
  // device's last look. The first answer from the server is the catch-up.
  void (async () => {
    const owner = await getOwner();
    if (owner && owner !== uid) {
      // Another account's data is still here (an interrupted sign-out): start clean.
      await clearDevice();
      location.reload();
      return;
    }
    const firstTime = !owner;
    await setOwner(uid);
    const caughtUp = new Set<RemoteTable>();
    const chains = new Map<RemoteTable, Promise<void>>();

    for (const table of REMOTE_TABLES) {
      const cursor = await getCursor(table);
      const q = query(collection(fs, "users", uid, table), where("syncedAt", ">", Timestamp.fromMillis(cursor)), orderBy("syncedAt"));
      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const docs = snap
            .docChanges()
            .filter((c) => c.type !== "removed" && !c.doc.metadata.hasPendingWrites)
            .map((c) => c.doc);
          const fromServer = !snap.metadata.fromCache;
          // One table's snapshots are applied in order.
          const next = (chains.get(table) ?? Promise.resolve())
            .then(() => take(table, docs, firstTime && table === "settings"))
            .then(() => {
              if (!fromServer || caughtUp.has(table)) return;
              caughtUp.add(table);
              if (caughtUp.size === REMOTE_TABLES.length) {
                ready = true;
                settle();
                void push();
              }
            })
            .catch(fail);
          chains.set(table, next);
        },
        fail,
      );
      stops.push(unsubscribe);
    }
    // A device that already belongs to this account can upload straight away.
    if (!firstTime) {
      ready = true;
      void push();
    }
  })().catch(fail);

  // Upload: whenever something on this device changes.
  const watch = liveQuery(pendingCount).subscribe({
    next: (n) => {
      pending = n;
      setSyncStatus({ pending: n });
      if (n > 0) schedule();
      settle();
    },
    error: fail,
  });
  stops.push(() => watch.unsubscribe());

  const onOnline = () => {
    settle();
    void push();
  };
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", settle);
  stops.push(() => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", settle);
    clearTimeout(timer);
  });
}

async function take(table: RemoteTable, docs: QueryDocumentSnapshot[], preferRemote: boolean) {
  if (docs.length === 0) return;
  let newest = 0;
  const rows = docs.map((d) => {
    const { syncedAt, ...data } = d.data();
    newest = Math.max(newest, (syncedAt as Timestamp | null)?.toMillis() ?? 0);
    return data;
  });
  await applyRemote(table, rows, preferRemote);
  await advanceCursor(table, newest);
}

function end() {
  session?.stop();
  session = null;
  setSyncStatus({ phase: "off", user: null, pending: 0, error: null });
}

/* ---------- Signing in and out ---------- */

export async function signUpWithEmail(email: string, password: string) {
  const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
  // Confirms the address is theirs; the account works meanwhile.
  sendEmailVerification(user).catch(() => {});
}

/** Sends the confirmation email again. */
export async function resendVerification() {
  if (auth.currentUser) await sendEmailVerification(auth.currentUser);
}

export async function signInWithEmail(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function sendReset(email: string) {
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Google sign-in. Phones and the installed app go to Google's page and come
 * back (a pop-up window is unreliable there); desktops use a pop-up.
 */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (standalone || matchMedia("(pointer: coarse)").matches) {
    try {
      sessionStorage.setItem(REDIRECT_FLAG, "1");
    } catch {
      // Storage blocked; the result is still picked up when auth restores.
    }
    await signInWithRedirect(auth, provider);
    return;
  }
  await signInWithPopup(auth, provider);
}

/**
 * Deletes the account and everything in it, then clears this device.
 * Firebase only allows it shortly after signing in, so an unattended
 * signed-in phone can't be used to wipe someone's account.
 */
export async function deleteAccount() {
  const user = auth.currentUser;
  if (!user) return;
  const signedInAt = Date.parse(user.metadata.lastSignInTime ?? "");
  if (!(Date.now() - signedInAt < 4 * 60_000)) throw Object.assign(new Error("recent login"), { code: "auth/requires-recent-login" });
  end(); // stop syncing so nothing is sent back up
  for (const table of REMOTE_TABLES) {
    const snap = await getDocs(collection(fs, "users", user.uid, table));
    for (let i = 0; i < snap.docs.length; i += BATCH) {
      const batch = writeBatch(fs);
      snap.docs.slice(i, i + BATCH).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
  await deleteUser(user);
  await clearDevice();
  location.reload();
}

/** Signs out and clears this device, so the next person starts fresh. The account keeps everything. */
export async function signOutAndClear() {
  end();
  await firebaseSignOut(auth);
  await clearDevice();
  location.reload();
}
