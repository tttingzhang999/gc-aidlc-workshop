import { useRef } from "react";
import { Link } from "react-router-dom";
import { useTilt } from "../fx/useTilt";
import { formatPrice } from "../lib/format";
import type { Product } from "../lib/types";

interface ProductCardProps {
  product: Product;
  index: number;
}

/** Storefront card: 3D tilt, moving glare, zooming image and a neon "VIEW →" tag. */
export default function ProductCard({ product, index }: ProductCardProps) {
  const tiltRef = useRef<HTMLAnchorElement>(null);
  useTilt(tiltRef);
  const inStock = product.stock > 0;
  const accent = [
    "from-neon-pink",
    "from-neon-cyan",
    "from-neon-lime",
    "from-neon-violet",
  ][index % 4];

  return (
    <Link
      ref={tiltRef}
      to={`/products/${product.id}`}
      data-card
      data-testid={`product-card-${product.id}`}
      className="group relative block overflow-hidden rounded-[var(--radius-blob)] border border-white/10 bg-void-2/70 backdrop-blur-xl transition-[border-color,box-shadow] duration-300 hover:border-neon-pink/70 hover:shadow-neon-pink"
    >
      <div
        className={`relative aspect-[4/3] overflow-hidden bg-gradient-to-br ${accent} to-void-3`}
      >
        {product.image_url && (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-125 group-hover:rotate-2"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-transparent" />
        <span className="absolute top-4 right-4 translate-y-[-150%] rotate-12 rounded-full bg-neon-lime px-4 py-2 font-display text-xs font-black text-void shadow-neon-lime transition-transform duration-500 ease-[cubic-bezier(.34,1.56,.64,1)] group-hover:translate-y-0 group-hover:rotate-0">
          VIEW →
        </span>
        <span className="absolute bottom-3 left-4 font-display text-6xl leading-none font-black text-white/10">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <div className="relative p-5">
        <h3 className="font-display text-lg leading-tight font-bold">
          {product.name}
        </h3>
        {product.description && (
          <p className="mt-2 line-clamp-2 text-sm text-white/55">
            {product.description}
          </p>
        )}
        <div className="mt-5 flex items-center justify-between">
          <span className="font-display text-2xl font-black text-gradient">
            {formatPrice(product.price)}
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold ${
              inStock
                ? "border-neon-lime/60 text-neon-lime"
                : "border-neon-red/60 text-neon-red"
            }`}
          >
            {inStock ? `${product.stock} in stock` : "Sold out"}
          </span>
        </div>
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(circle at var(--glare-x, 50%) var(--glare-y, 50%), rgba(255,255,255,0.28), transparent 45%)",
        }}
      />
    </Link>
  );
}
