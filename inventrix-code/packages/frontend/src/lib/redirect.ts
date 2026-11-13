/** Router state carried to /login so the user lands back where they started. */
export interface RedirectState {
  from?: string;
}

/** Only same-app relative paths are honoured, so the state cannot redirect off-site. */
export function readRedirect(state: unknown, fallback = "/"): string {
  if (state && typeof state === "object" && "from" in state) {
    const from = (state as RedirectState).from;
    if (
      typeof from === "string" &&
      from.startsWith("/") &&
      !from.startsWith("//") &&
      from !== "/login"
    ) {
      return from;
    }
  }
  return fallback;
}
