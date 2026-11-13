import { getDb, type Queryable } from '../db/index.js';

// Add `count` units to an owner's cart line, capping the line at the product's current stock.
// Returns the new line quantity, or null when the product is gone or out of stock.
export async function addToCart(
  tx: Queryable,
  owner: string,
  productId: number,
  count: number,
  penalty: number,
): Promise<number | null> {
  const [product] = await tx.query<{ stock: number }>(
    'SELECT stock FROM products WHERE id = $1::int',
    [productId],
  );
  if (!product || product.stock <= 0) return null;
  const [existing] = await tx.query<{ quantity: number }>(
    'SELECT quantity FROM cart_items WHERE owner = $1::text AND product_id = $2::int AND penalty = $3::int',
    [owner, productId, penalty],
  );
  const quantity = Math.min((existing?.quantity ?? 0) + count, product.stock);
  await tx.query(
    `INSERT INTO cart_items (owner, product_id, quantity, penalty) VALUES ($1::text, $2::int, $3::int, $4::int)
     ON CONFLICT (owner, product_id, penalty) DO UPDATE SET quantity = EXCLUDED.quantity`,
    [owner, productId, quantity, penalty],
  );
  return quantity;
}

// Move a guest's cart lines into a signed-in user's cart (quantities add up, capped at stock).
export async function mergeGuestCart(
  guestOwner: string,
  userOwner: string,
): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const lines = await tx.query<{
      product_id: number;
      quantity: number;
      penalty: number;
    }>(
      'SELECT product_id, quantity, penalty FROM cart_items WHERE owner = $1::text',
      [guestOwner],
    );
    if (lines.length === 0) return;
    for (const line of lines) {
      await addToCart(tx, userOwner, line.product_id, line.quantity, line.penalty);
    }
    await tx.query('DELETE FROM cart_items WHERE owner = $1::text', [
      guestOwner,
    ]);
  });
}
