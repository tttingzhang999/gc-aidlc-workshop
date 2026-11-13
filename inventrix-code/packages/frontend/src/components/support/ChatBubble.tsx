import { Link } from "react-router-dom";
import { formatDate, formatPrice } from "../../lib/format";
import type {
  ChatMessage,
  SupportOrder,
  SupportProduct,
} from "../../lib/support";
import StatusPill from "../../ui/StatusPill";
import RichText from "./RichText";

interface ChatBubbleProps {
  message: ChatMessage;
  onRetry: (id: string) => void;
}

function ProductChip({ product }: { product: SupportProduct }) {
  const inStock = product.stock > 0;
  return (
    <Link
      to={`/products/${product.id}`}
      data-testid={`support-product-${product.id}`}
      className="group w-36 shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-void/70 transition-[border-color,box-shadow] duration-300 hover:border-neon-pink/70 hover:shadow-neon-pink"
    >
      <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-neon-violet/40 to-void-3">
        {product.image_url && (
          <img
            src={product.image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        )}
      </div>
      <div className="p-2.5">
        <p className="line-clamp-2 text-xs leading-snug font-bold">
          {product.name}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-1">
          <span className="font-display text-sm font-black text-gradient">
            {formatPrice(product.price)}
          </span>
          <span
            className={`text-[0.6rem] font-bold uppercase ${inStock ? "text-neon-lime" : "text-neon-red"}`}
          >
            {inStock ? `${product.stock} left` : "Sold out"}
          </span>
        </div>
      </div>
    </Link>
  );
}

function OrderChip({ order }: { order: SupportOrder }) {
  return (
    <Link
      to="/orders"
      data-testid={`support-order-${order.id}`}
      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-void/70 px-3 py-2.5 transition-[border-color,box-shadow] duration-300 hover:border-neon-cyan/70 hover:shadow-neon-cyan"
    >
      <div>
        <p className="font-display text-sm font-black">#{order.id}</p>
        <p className="text-[0.7rem] text-white/50">
          {formatDate(order.created_at)} · {formatPrice(order.total)}
        </p>
      </div>
      <StatusPill status={order.status} />
    </Link>
  );
}

export default function ChatBubble({ message, onRetry }: ChatBubbleProps) {
  const fromUser = message.role === "user";

  if (fromUser) {
    return (
      <div data-chat-message className="flex flex-col items-end">
        <div
          className={`max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-line text-white ${
            message.failed
              ? "border border-neon-red/70 bg-neon-red/10"
              : "bg-gradient-to-br from-neon-pink to-neon-violet shadow-[0_0_18px_#ff2bd655]"
          }`}
        >
          {message.text}
        </div>
        {message.failed && (
          <button
            type="button"
            onClick={() => onRetry(message.id)}
            data-testid="support-retry"
            className="mt-1.5 text-[0.65rem] font-bold tracking-widest text-neon-red uppercase hover:text-white"
          >
            Not sent · Retry ↻
          </button>
        )}
      </div>
    );
  }

  return (
    <div data-chat-message className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <span
          aria-hidden="true"
          className="mb-1 h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-neon-cyan to-neon-violet shadow-neon-cyan"
        />
        <div className="glass max-w-[85%] rounded-2xl rounded-bl-md border-neon-cyan/25 px-4 py-2.5 text-sm leading-relaxed break-words text-white/90">
          <RichText text={message.text} />
        </div>
      </div>
      {message.products && message.products.length > 0 && (
        <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 pl-9">
          {message.products.map((product) => (
            <ProductChip key={product.id} product={product} />
          ))}
        </div>
      )}
      {message.orders && message.orders.length > 0 && (
        <div className="flex flex-col gap-2 pl-8">
          {message.orders.map((order) => (
            <OrderChip key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
