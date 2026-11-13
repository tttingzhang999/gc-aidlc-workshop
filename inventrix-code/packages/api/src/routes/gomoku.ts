import { Router } from 'express';
import { getDb, type Queryable } from '../db/index.js';
import { asyncRoute, parseId } from '../http.js';
import { identify, AuthRequest } from '../middleware/auth.js';
import { gameRateLimit } from '../middleware/rateLimit.js';
import { addToCart } from '../services/cart.js';
import {
  BOARD_SIZE,
  Cell,
  emptyBoard,
  findWinLine,
  pickAiMove,
} from '../services/gomokuAI.js';

const router = Router();

router.use(gameRateLimit, identify);

interface GameRow {
  id: number;
  owner: string;
  board: string;
  layout: string;
  status: 'playing' | 'won' | 'lost' | 'draw';
  claimed: number;
}

const GAME_COLUMNS = 'id, owner, board, layout, status, claimed';

const serialize = (game: GameRow, extra: Record<string, unknown> = {}) => ({
  id: game.id,
  board: JSON.parse(game.board) as Cell[][],
  layout: JSON.parse(game.layout) as number[],
  status: game.status,
  claimed: !!game.claimed,
  ...extra,
});

const loadGame = async (
  db: Queryable,
  rawId: string,
  owner?: string,
): Promise<GameRow | undefined> => {
  const id = parseId(rawId);
  if (id === null) return undefined;
  const [game] = await db.query<GameRow>(
    `SELECT ${GAME_COLUMNS} FROM gomoku_games WHERE id = $1::int AND owner = $2::text`,
    [id, owner],
  );
  return game;
};

// Start a new game. Cell i of the board shows product layout[i].
router.post(
  '/games',
  asyncRoute(async (req: AuthRequest, res) => {
    const db = await getDb();
    const ids = (
      await db.query<{ id: number }>('SELECT id FROM products ORDER BY id')
    ).map((p) => p.id);
    if (ids.length === 0) {
      return res.status(400).json({ error: 'No products available' });
    }

    const layout = Array.from(
      { length: BOARD_SIZE * BOARD_SIZE },
      (_, i) => ids[i % ids.length],
    );
    const [game] = await db.query<GameRow>(
      `INSERT INTO gomoku_games (owner, board, layout, status)
       VALUES ($1::text, $2::text, $3::text, 'playing')
       RETURNING ${GAME_COLUMNS}`,
      [req.owner, JSON.stringify(emptyBoard()), JSON.stringify(layout)],
    );
    res.status(201).json(serialize(game));
  }),
);

// Resume the most recent unfinished game, if any.
router.get(
  '/games/current',
  asyncRoute(async (req: AuthRequest, res) => {
    const db = await getDb();
    const [game] = await db.query<GameRow>(
      `SELECT ${GAME_COLUMNS} FROM gomoku_games
       WHERE owner = $1::text AND status = 'playing'
       ORDER BY id DESC LIMIT 1`,
      [req.owner],
    );
    res.json(game ? serialize(game) : null);
  }),
);

// The player is black; the server validates the move and replies with the computer's (white) move.
router.post(
  '/games/:id/move',
  asyncRoute(async (req: AuthRequest, res) => {
    const db = await getDb();
    const game = await loadGame(db, req.params.id, req.owner);
    if (!game) return res.status(404).json({ error: 'Game not found' });
    if (game.status !== 'playing') {
      return res.status(400).json({ error: 'Game is already over' });
    }

    const { row, col } = req.body ?? {};
    if (
      !Number.isInteger(row) ||
      !Number.isInteger(col) ||
      row < 0 ||
      col < 0 ||
      row >= BOARD_SIZE ||
      col >= BOARD_SIZE
    ) {
      return res.status(400).json({ error: 'Invalid move' });
    }

    const board: Cell[][] = JSON.parse(game.board);
    if (board[row][col]) {
      return res.status(400).json({ error: 'Cell is already taken' });
    }

    let status: GameRow['status'] = 'playing';
    let winLine: [number, number][] | null = null;
    let lastMove: [number, number] = [row, col];

    board[row][col] = 'black';
    winLine = findWinLine(board, row, col);
    if (winLine) {
      status = 'won';
    } else if (board.every((r) => r.every((c) => c !== null))) {
      status = 'draw';
    } else {
      const [ar, ac] = pickAiMove(board, 'white');
      board[ar][ac] = 'white';
      lastMove = [ar, ac];
      winLine = findWinLine(board, ar, ac);
      if (winLine) status = 'lost';
      else if (board.every((r) => r.every((c) => c !== null))) status = 'draw';
    }

    // Only advance a game that is still in play, so two concurrent moves cannot both apply.
    const [updated] = await db.query<GameRow>(
      `UPDATE gomoku_games SET board = $1::text, status = $2::text
       WHERE id = $3::int AND status = 'playing'
       RETURNING ${GAME_COLUMNS}`,
      [JSON.stringify(board), status, game.id],
    );
    if (!updated) {
      return res.status(409).json({ error: 'Game was updated by another move' });
    }
    res.json(serialize(updated, { winLine: winLine ?? [], lastMove }));
  }),
);

// Add the products under the player's black stones to the server-side cart.
// Allowed once per finished game: after a win at list price, after a loss at the penalty price.
router.post(
  '/games/:id/claim',
  asyncRoute(async (req: AuthRequest, res) => {
    const db = await getDb();
    const game = await loadGame(db, req.params.id, req.owner);
    if (!game) return res.status(404).json({ error: 'Game not found' });
    if (game.status !== 'won' && game.status !== 'lost') {
      return res
        .status(400)
        .json({ error: 'Only finished games with a winner can be claimed' });
    }
    if (game.claimed) {
      return res.status(400).json({ error: 'Already added to cart' });
    }

    const board: Cell[][] = JSON.parse(game.board);
    const layout: number[] = JSON.parse(game.layout);
    const penalty = game.status === 'lost' ? 1 : 0;

    const counts = new Map<number, number>();
    board.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell !== 'black') return;
        const productId = layout[r * BOARD_SIZE + c];
        counts.set(productId, (counts.get(productId) ?? 0) + 1);
      }),
    );

    const added = await db.transaction(async (tx) => {
      // Mark the game claimed first; if another request already did, add nothing.
      const [marked] = await tx.query<{ id: number }>(
        'UPDATE gomoku_games SET claimed = 1 WHERE id = $1::int AND claimed = 0 RETURNING id',
        [game.id],
      );
      if (!marked) return null;

      const lines: { product_id: number; quantity: number }[] = [];
      for (const [productId, count] of counts) {
        const quantity = await addToCart(
          tx,
          game.owner,
          productId,
          count,
          penalty,
        );
        if (quantity !== null) lines.push({ product_id: productId, quantity });
      }
      return lines;
    });

    if (!added) {
      return res.status(400).json({ error: 'Already added to cart' });
    }
    res.json({ added, penalty: !!penalty });
  }),
);

export default router;
