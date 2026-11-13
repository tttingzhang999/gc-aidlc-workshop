import { useRef } from "react";
import type { MouseEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { gsap, useGSAP } from "../fx/gsap";
import { formatPrice } from "../lib/format";
import type { Product } from "../lib/types";
import { useApi } from "../lib/useApi";
import LinkButton from "../ui/LinkButton";
import ErrorState from "../ui/ErrorState";
import Skeleton from "../ui/Skeleton";
import NotFound from "./NotFound";


function DetailSkeleton() {
  return (
    <div className="grid gap-10 md:grid-cols-2">
      <Skeleton className="aspect-square w-full" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-14 w-1/2" />
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { id = "" } = useParams();
  const {
    data: product,
    error,
    loading,
    reload,
  } = useApi<Product>(`/api/products/${encodeURIComponent(id)}`);
  const rootRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!product) return;
      gsap.from("[data-image-frame]", {
        clipPath: "inset(50% 50% 50% 50%)",
        rotation: -6,
        duration: 1.2,
        ease: "expo.out",
      });
      gsap.from("[data-fly]", {
        x: 120,
        opacity: 0,
        skewX: -12,
        stagger: 0.09,
        duration: 0.9,
        delay: 0.2,
        ease: "back.out(1.7)",
      });
    },
    { scope: rootRef, dependencies: [product?.id] },
  );

  const handleParallax = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(imageRef.current, {
      x: px * -50,
      y: py * -50,
      rotationY: px * 12,
      rotationX: -py * 12,
      duration: 0.6,
      ease: "power2.out",
    });
  };

  const resetParallax = () => {
    gsap.to(imageRef.current, {
      x: 0,
      y: 0,
      rotationX: 0,
      rotationY: 0,
      duration: 1,
      ease: "elastic.out(1, 0.4)",
    });
  };

  if (loading && !product) return <DetailSkeleton />;
  if (error?.status === 404) {
    return (
      <NotFound
        title="PRODUCT NOT FOUND"
        message="This product has left the catalogue or never existed."
      />
    );
  }
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (!product) return null;

  const inStock = product.stock > 0;

  return (
    <div ref={rootRef} className="flex flex-col gap-8">
      <Link
        to="/"
        data-testid="back-to-store"
        className="group inline-flex w-fit items-center gap-2 font-display text-xs font-bold tracking-widest text-white/60 uppercase hover:text-neon-cyan"
      >
        <span className="transition-transform group-hover:-translate-x-2">
          ←
        </span>{" "}
        Back to the store
      </Link>

      <div className="grid items-start gap-10 md:grid-cols-2">
        <div
          data-image-frame
          onMouseMove={handleParallax}
          onMouseLeave={resetParallax}
          className="relative aspect-square overflow-hidden rounded-[var(--radius-blob)] border-2 border-neon-cyan/50 bg-gradient-to-br from-neon-violet/40 to-void-3 shadow-neon-cyan [perspective:900px]"
        >
          <div ref={imageRef} className="absolute -inset-10">
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void/70 via-transparent to-transparent" />
          <span className="absolute bottom-5 left-5 font-display text-7xl leading-none font-black text-white/15">
            #{String(product.id).padStart(3, "0")}
          </span>
        </div>

        <div
          className="glass flex flex-col gap-6 rounded-[var(--radius-blob)] p-6 md:p-10"
        >
          <span
            data-fly
            className="w-fit rounded-full border border-neon-lime/60 px-3 py-1 text-xs font-bold tracking-widest text-neon-lime uppercase"
          >
            {inStock ? `${product.stock} units in stock` : "Sold out"}
          </span>
          <h1
            data-fly
            className="font-display text-4xl leading-none font-black tracking-tighter md:text-6xl"
          >
            {product.name}
          </h1>
          {product.description && (
            <p data-fly className="text-lg text-white/65">
              {product.description}
            </p>
          )}
          <p
            data-fly
            className="font-display text-5xl font-black text-gradient md:text-6xl"
          >
            {formatPrice(product.price)}
          </p>

          {inStock ? (
            <div
              data-fly
              data-testid="gomoku-hint"
              className="flex flex-col gap-4 rounded-2xl border border-neon-violet/50 bg-neon-violet/10 p-5"
            >
              <p className="text-white/75">
                🎮 Products are checked out through the cart. Win a game of
                Gomoku to claim the products under your stones (lose and it
                costs 10x).
              </p>
              <LinkButton
                to="/gomoku"
                variant="primary"
                size="lg"
                testId="play-gomoku"
                className="w-full"
              >
                Play Gomoku →
              </LinkButton>
            </div>
          ) : (
            <p
              data-fly
              className="rounded-2xl border-2 border-neon-red/60 p-4 text-center font-display font-bold text-neon-red"
            >
              Out of stock. Check back after the next supply drop.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
