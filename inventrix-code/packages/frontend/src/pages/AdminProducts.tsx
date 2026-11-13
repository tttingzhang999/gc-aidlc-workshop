import { useMemo, useRef, useState } from "react";
import PageHeading from "../components/PageHeading";
import ProductForm from "../components/ProductForm";
import { burstFromElement } from "../fx/burst";
import { gsap } from "../fx/gsap";
import { flash } from "../fx/shake";
import { apiFetch, toApiError } from "../lib/api";
import { formatPrice } from "../lib/format";
import type { Product } from "../lib/types";
import { useApi } from "../lib/useApi";
import Button from "../ui/Button";
import Card from "../ui/Card";
import ConfirmDialog from "../ui/ConfirmDialog";
import EmptyState from "../ui/EmptyState";
import ErrorState from "../ui/ErrorState";
import Input from "../ui/Input";
import LinkButton from "../ui/LinkButton";
import Skeleton from "../ui/Skeleton";
import { useToast } from "../ui/Toast";

function Thumb({ product }: { product: Product }) {
  return (
    <span className="block h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-neon-violet to-void-3">
      {product.image_url && (
        <img
          src={product.image_url}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      )}
    </span>
  );
}

/** Explode every rendering of a product row (table row and mobile card), then resolve. */
function explodeRows(container: HTMLElement | null, id: number): Promise<void> {
  const rows = container
    ? Array.from(container.querySelectorAll(`[data-product-row="${id}"]`))
    : [];
  const visible = rows.filter(
    (row) => (row as HTMLElement).offsetParent !== null,
  );
  if (visible.length === 0) return Promise.resolve();
  visible.forEach((row) => burstFromElement(row, { count: 30 }));
  return new Promise((resolve) => {
    gsap.to(visible, {
      scaleY: 0,
      opacity: 0,
      x: 200,
      skewX: -30,
      duration: 0.45,
      ease: "back.in(2)",
      onComplete: () => resolve(),
    });
  });
}

export default function AdminProducts() {
  const toast = useToast();
  const {
    data: products,
    error,
    loading,
    reload,
    setData,
  } = useApi<Product[]>("/api/products");
  const [editing, setEditing] = useState<Product | null>(null);
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products ?? [];
    return q ? list.filter((p) => p.name.toLowerCase().includes(q)) : list;
  }, [products, query]);

  const startEdit = (product: Product) => {
    setEditing(product);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => flash(formRef.current), 350);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setDeleting(true);
    try {
      await apiFetch<null>(`/api/products/${target.id}`, { method: "DELETE" });
      setPendingDelete(null);
      await explodeRows(listRef.current, target.id);
      setData((current) => (current ?? []).filter((p) => p.id !== target.id));
      if (editing?.id === target.id) setEditing(null);
      toast.success("Product deleted", `${target.name} was vaporised.`);
    } catch (err: unknown) {
      toast.error("Delete failed", toApiError(err).message);
    } finally {
      setDeleting(false);
    }
  };

  const rowActions = (product: Product) => (
    <span className="flex gap-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => startEdit(product)}
        data-testid={`product-edit-${product.id}`}
      >
        Edit
      </Button>
      <Button
        size="sm"
        variant="danger"
        onClick={() => setPendingDelete(product)}
        data-testid={`product-delete-${product.id}`}
      >
        Delete
      </Button>
    </span>
  );

  return (
    <div className="flex flex-col gap-10">
      <PageHeading
        kicker="Admin // catalogue"
        title="PRODUCTS"
        actions={
          <LinkButton to="/admin" testId="back-to-dashboard">
            ← Dashboard
          </LinkButton>
        }
      />

      <ProductForm
        ref={formRef}
        editing={editing}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
        onCancelEdit={() => setEditing(null)}
      />

      <Card>
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="font-display text-2xl font-black">
            Catalogue {products ? `(${products.length})` : ""}
          </h2>
          <Input
            label="Search products"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="md:w-80"
            data-testid="admin-product-search"
          />
        </div>

        {loading && !products && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}
        {error && <ErrorState message={error.message} onRetry={reload} />}
        {products && !error && visible.length === 0 && (
          <EmptyState
            title={products.length === 0 ? "EMPTY CATALOGUE" : "NO MATCHES"}
            message="Add a product above to get started."
          />
        )}

        {products && !error && visible.length > 0 && (
          <div ref={listRef}>
            <table className="hidden w-full border-separate border-spacing-y-2 md:table">
              <thead>
                <tr className="text-left text-xs tracking-[0.2em] text-white/40 uppercase">
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Price</th>
                  <th className="px-3 py-2 font-medium">Stock</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((product) => (
                  <tr
                    key={product.id}
                    data-product-row={product.id}
                    className="bg-white/5 transition-colors hover:bg-white/10"
                  >
                    <td className="rounded-l-2xl px-3 py-2">
                      <span className="flex items-center gap-3">
                        <Thumb product={product} />
                        <span className="font-bold">{product.name}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 font-display">
                      {formatPrice(product.price)}
                    </td>
                    <td
                      className={`px-3 py-2 font-display font-bold ${product.stock === 0 ? "text-neon-red" : ""}`}
                    >
                      {product.stock}
                    </td>
                    <td className="rounded-r-2xl px-3 py-2">
                      <span className="flex justify-end">
                        {rowActions(product)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="flex flex-col gap-3 md:hidden">
              {visible.map((product) => (
                <li
                  key={product.id}
                  data-product-row={product.id}
                  className="flex flex-col gap-3 rounded-2xl bg-white/5 p-4"
                >
                  <span className="flex items-center gap-3">
                    <Thumb product={product} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">
                        {product.name}
                      </span>
                      <span className="text-sm text-white/50">
                        {formatPrice(product.price)} · {product.stock} in stock
                      </span>
                    </span>
                  </span>
                  {rowActions(product)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete product?"
        message={
          pendingDelete
            ? `“${pendingDelete.name}” will be permanently removed from the catalogue.`
            : ""
        }
        confirmLabel="Vaporise"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
