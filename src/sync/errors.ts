// Firebase error codes as plain sentences.
const MESSAGES: Record<string, string> = {
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/missing-email": "Enter your email address.",
  "auth/missing-password": "Enter your password.",
  "auth/invalid-credential": "Wrong email or password.",
  "auth/wrong-password": "Wrong email or password.",
  "auth/user-not-found": "Wrong email or password.",
  "auth/invalid-login-credentials": "Wrong email or password.",
  "auth/email-already-in-use": "There's already an account with this email. Try signing in instead.",
  "auth/weak-password": "Use at least 8 characters for your password.",
  "auth/too-many-requests": "Too many tries. Wait a few minutes, then try again.",
  "auth/network-request-failed": "You seem to be offline. Connect to the internet and try again.",
  "auth/popup-blocked": "Your browser blocked the Google window. Allow pop-ups for this site and try again.",
  "auth/popup-closed-by-user": "",
  "auth/cancelled-popup-request": "",
  "auth/redirect-cancelled-by-user": "",
  "auth/unauthorized-domain": "Sign-in isn't set up for this address yet.",
  "auth/operation-not-allowed": "This sign-in method isn't switched on yet.",
  "auth/user-disabled": "This account has been turned off.",
  "auth/account-exists-with-different-credential": "This email already signs in another way. Try email and password.",
  "permission-denied": "The account refused the data. The database rules may not be set up yet.",
  unavailable: "Can't reach the account right now. Your changes are safe here and will sync later.",
};

/** A sentence for the user, or "" for errors that don't need one (like closing the Google window). */
export function friendlyError(e: unknown): string {
  const code = (e as { code?: string } | null)?.code ?? "";
  if (code in MESSAGES) return MESSAGES[code]!;
  return "Something went wrong. Try again in a moment.";
}
