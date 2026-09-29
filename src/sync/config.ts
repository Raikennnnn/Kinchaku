/**
 * The Firebase project that holds accounts and synced data. These values are
 * public by design (every Firebase web app ships them); what protects the
 * data is the rules in firestore.rules, which only let people read and write
 * their own records.
 */
export const firebaseConfig = {
  apiKey: "AIzaSyCoycQPiMl_UiDpxWMc3vq_JcnSUrp1BOw",
  authDomain: "kinchaku-fc869.firebaseapp.com",
  projectId: "kinchaku-fc869",
  storageBucket: "kinchaku-fc869.firebasestorage.app",
  messagingSenderId: "749895910949",
  appId: "1:749895910949:web:05c52c75ff409f2dfca1cc",
};

/** False until the web app's keys are filled in above; the app then works without accounts. */
export const syncConfigured = firebaseConfig.apiKey !== "";

/**
 * Where Google sign-in pages are served from. On the deployed site they come
 * through the site's own address (vercel.json forwards /__/auth/ to Firebase),
 * because phones block sign-in pages that live on another address from
 * talking to the app, especially in the iPhone home-screen app. Local
 * development uses Firebase's address directly.
 */
export function authDomain(): string {
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  return local ? firebaseConfig.authDomain : location.host;
}
