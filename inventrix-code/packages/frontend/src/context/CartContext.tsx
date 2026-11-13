import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { apiFetch } from "../lib/api";
import type { CartItem } from "../lib/types";
import { useAuth } from "./AuthContext";

export const PENALTY_MULTIPLIER = 10;

interface CartContextType {
  items: CartItem[];
  count: number;
  refresh: () => Promise<void>;
  removeItem: (productId: number, penalty: boolean) => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * The cart lives on the server and mirrors for the signed-in user or the
 * anonymous guest. Logging in re-fetches, which also merges the guest cart.
 */
export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);

  const refresh = useCallback(async () => {
    try {
      setItems(await apiFetch<CartItem[]>("/api/cart"));
    } catch {
      setItems([]);
    }
  }, []);

  // `token` is the trigger: refetch whenever the session changes.
  useEffect(() => {
    void refresh();
  }, [refresh, token]);

  const removeItem = useCallback(
    async (productId: number, penalty: boolean) => {
      await apiFetch<null>(
        `/api/cart/${productId}?penalty=${penalty ? 1 : 0}`,
        { method: "DELETE" },
      );
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      items,
      count: items.reduce((sum, i) => sum + i.quantity, 0),
      refresh,
      removeItem,
    }),
    [items, refresh, removeItem],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
