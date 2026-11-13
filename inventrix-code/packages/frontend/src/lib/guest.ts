/**
 * Anonymous visitors get a random id so their Gomoku games and cart persist
 * without logging in. apiFetch sends it as X-Guest-Id on every request, and
 * the server merges the guest cart into the user's cart after login.
 */
const GUEST_KEY = "guestId";

/** 128 random bits as hex (works in non-secure contexts, unlike randomUUID). */
function randomId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getGuestId(): string {
  try {
    let id = localStorage.getItem(GUEST_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(GUEST_KEY, id);
    }
    return id;
  } catch {
    // Storage unavailable: use a per-page-load id.
    return randomId();
  }
}
