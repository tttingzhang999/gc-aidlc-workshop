export type UserRole = "admin" | "customer";

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  image_url: string | null;
  created_at?: string;
}

export interface ProductInput {
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string;
}

export type OrderStatus =
  "pending" | "processing" | "shipped" | "delivered" | "cancelled";

export const ORDER_STATUSES: readonly OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export interface Order {
  id: number;
  user_id: number;
  subtotal: number;
  gst: number;
  total: number;
  status: OrderStatus;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  product_name: string;
}

export interface OrderDetail extends Order {
  items: OrderItem[];
}

export interface CreatedOrder {
  id: number;
  subtotal: number;
  gst: number;
  total: number;
  status: OrderStatus;
}

export interface DashboardData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    totalProducts: number;
    lowStockItems: number;
  };
  recentOrders: {
    id: number;
    total: number;
    status: OrderStatus;
    created_at: string;
    user_name: string;
  }[];
  topProducts: {
    name: string;
    total_sold: number;
    revenue: number;
  }[];
  ordersByStatus: {
    status: OrderStatus;
    count: number;
  }[];
}

export type InventoryStatus = "out_of_stock" | "low_stock" | "in_stock";

export interface InventoryItem {
  id: number;
  name: string;
  stock: number;
  price: number;
  status: InventoryStatus;
}

export interface CartItem {
  product_id: number;
  name: string;
  /** Unit price as charged (already 10x for penalty items). */
  price: number;
  stock: number;
  image_url: string | null;
  quantity: number;
  /** Claimed after losing the Gomoku game. */
  penalty: boolean;
}
export type GomokuCell = "black" | "white" | null;
export type GomokuStatus = "playing" | "won" | "lost" | "draw";
/** The game (rules, computer moves, results) lives on the server. */
export interface GomokuGame {
  id: number;
  board: GomokuCell[][];
  /** Product id shown on each cell, row-major. */
  layout: number[];
  status: GomokuStatus;
  claimed: boolean;
  winLine?: [number, number][];
  lastMove?: [number, number];
}
