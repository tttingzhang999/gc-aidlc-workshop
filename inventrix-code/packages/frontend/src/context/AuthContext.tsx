import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { apiFetch, TOKEN_KEY, UNAUTHORIZED_EVENT, USER_KEY } from "../lib/api";
import type { AuthResponse, User } from "../lib/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isUser(value: unknown): value is User {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "number" &&
    typeof candidate.email === "string" &&
    typeof candidate.name === "string" &&
    (candidate.role === "admin" || candidate.role === "customer")
  );
}

/**
 * Read the session synchronously so the very first render already knows who
 * is logged in (a refresh on a protected page no longer bounces to /login).
 */
function readStoredSession(): { user: User | null; token: string | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    const parsed: unknown = rawUser ? JSON.parse(rawUser) : null;
    if (token && isUser(parsed)) return { user: parsed, token };
  } catch {
    // Corrupt storage falls through to a signed-out session.
  }
  return { user: null, token: null };
}

function persistSession(data: AuthResponse): void {
  try {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  } catch {
    // Storage unavailable: the session still lives in memory for this tab.
  }
}

function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // Nothing to clear.
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState(readStoredSession);

  const applyAuth = useCallback((data: AuthResponse): User => {
    persistSession(data);
    setSession({ user: data.user, token: data.token });
    return data.user;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      return applyAuth(data);
    },
    [applyAuth],
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const data = await apiFetch<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: { email, password, name },
        auth: false,
      });
      return applyAuth(data);
    },
    [applyAuth],
  );

  const logout = useCallback(() => {
    clearSession();
    setSession({ user: null, token: null });
  }, []);

  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout);
  }, [logout]);

  const value = useMemo(
    () => ({
      user: session.user,
      token: session.token,
      login,
      register,
      logout,
    }),
    [session, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
