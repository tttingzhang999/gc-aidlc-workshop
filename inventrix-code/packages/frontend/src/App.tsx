import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import AmbientBackground from "./fx/AmbientBackground";
import CustomCursor from "./fx/CustomCursor";
import PageTransition from "./fx/PageTransition";
import { ToastProvider } from "./ui/Toast";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Storefront from "./pages/Storefront";
import ProductDetail from "./pages/ProductDetail";
import Orders from "./pages/Orders";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProducts from "./pages/AdminProducts";
import AdminOrders from "./pages/AdminOrders";
import AdminInventory from "./pages/AdminInventory";
import Cart from "./pages/Cart";
import Gomoku from "./pages/Gomoku";
import Architecture from "./pages/Architecture";
import Role from "./pages/Role";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import type { RedirectState } from "./lib/redirect";

const ProtectedRoute = ({
  children,
  adminOnly = false,
}: {
  children: JSX.Element;
  adminOnly?: boolean;
}) => {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    const state: RedirectState = {
      from: `${location.pathname}${location.search}`,
    };
    return <Navigate to="/login" replace state={state} />;
  }
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <CartProvider>
      <BrowserRouter>
        <ToastProvider>
          <AmbientBackground />
          <CustomCursor />
          <PageTransition />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Storefront />} />
              <Route path="products/:id" element={<ProductDetail />} />
              <Route path="gomoku" element={<Gomoku />} />
              <Route path="architecture" element={<Architecture />} />
              <Route path="cart" element={<Cart />} />
              <Route path="role" element={<Role />} />
              <Route
                path="orders"
                element={
                  <ProtectedRoute>
                    <Orders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/products"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminProducts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/orders"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminOrders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/inventory"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminInventory />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </ToastProvider>
      </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
