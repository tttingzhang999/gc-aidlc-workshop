// Server-side Gomoku engine: win detection and the computer player (alpha-beta minimax).
export type Player = 'black' | 'white';
export type Cell = Player | null;

export const BOARD_SIZE = 15;
const WIN_LENGTH = 5;
const DIRECTIONS: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];

const inBounds = (size: number, r: number, c: number) => r >= 0 && c >= 0 && r < size && c < size;

// Returns the winning line cells if `player` has WIN_LENGTH in a row through (r, c).
export function findWinLine(board: Cell[][], r: number, c: number): [number, number][] | null {
  const size = board.length;
  const player = board[r][c];
  if (!player) return null;
  for (const [dr, dc] of DIRECTIONS) {
    const line: [number, number][] = [[r, c]];
    for (const sign of [1, -1]) {
      let nr = r + dr * sign;
      let nc = c + dc * sign;
      while (inBounds(size, nr, nc) && board[nr][nc] === player) {
        line.push([nr, nc]);
        nr += dr * sign;
        nc += dc * sign;
      }
    }
    if (line.length >= WIN_LENGTH) return line;
  }
  return null;
}

// Score of placing `player` at (r, c) based on the line it would form.
function scoreMove(board: Cell[][], r: number, c: number, player: Player): number {
  const size = board.length;
  let total = 0;
  for (const [dr, dc] of DIRECTIONS) {
    let count = 1;
    let open = 0;
    for (const sign of [1, -1]) {
      let nr = r + dr * sign;
      let nc = c + dc * sign;
      while (inBounds(size, nr, nc) && board[nr][nc] === player) {
        count++;
        nr += dr * sign;
        nc += dc * sign;
      }
      if (inBounds(size, nr, nc) && board[nr][nc] === null) open++;
    }
    if (count >= WIN_LENGTH) total += 100000;
    else total += Math.pow(10, count) * (open + 1);
  }
  return total;
}

// ---- Computer player: alpha-beta minimax with pattern evaluation ----

const SEARCH_DEPTH = 4;      // plies (AI, human, AI, human)
const ROOT_WIDTH = 14;       // candidate moves examined at the root
const INNER_WIDTH = 9;       // candidate moves examined deeper in the tree
const WIN_SCORE = 10_000_000;

// Value of a run of `count` stones with `open` open ends (0-2).
function runValue(count: number, open: number): number {
  if (count >= WIN_LENGTH) return 1_000_000;
  if (open === 0) return 0;
  switch (count) {
    case 4: return open === 2 ? 100_000 : 10_000;
    case 3: return open === 2 ? 5_000 : 500;
    case 2: return open === 2 ? 300 : 30;
    default: return open === 2 ? 20 : 3;
  }
}

// Static evaluation of every run of `player`'s stones on the board.
function evaluatePlayer(board: Cell[][], player: Player): number {
  const size = board.length;
  let total = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] !== player) continue;
      for (const [dr, dc] of DIRECTIONS) {
        const pr = r - dr, pc = c - dc;
        if (inBounds(size, pr, pc) && board[pr][pc] === player) continue; // not the start of a run
        let count = 0;
        let nr = r, nc = c;
        while (inBounds(size, nr, nc) && board[nr][nc] === player) {
          count++;
          nr += dr;
          nc += dc;
        }
        let open = 0;
        if (inBounds(size, pr, pc) && board[pr][pc] === null) open++;
        if (inBounds(size, nr, nc) && board[nr][nc] === null) open++;
        total += runValue(count, open);

        // Split pattern such as XX_XX: one gap joining two runs.
        if (open > 0 && inBounds(size, nr, nc) && board[nr][nc] === null) {
          let count2 = 0;
          let gr = nr + dr, gc = nc + dc;
          while (inBounds(size, gr, gc) && board[gr][gc] === player) {
            count2++;
            gr += dr;
            gc += dc;
          }
          if (count2 > 0 && count + count2 >= 3) {
            total += runValue(Math.min(count + count2, 4), 1) * 0.8;
          }
        }
      }
    }
  }
  return total;
}

function evaluate(board: Cell[][], ai: Player): number {
  const human: Player = ai === 'black' ? 'white' : 'black';
  return evaluatePlayer(board, ai) - evaluatePlayer(board, human) * 1.15;
}

// Empty cells within 2 squares of an existing stone, best local moves first.
function candidateMoves(board: Cell[][], me: Player, limit: number): [number, number][] {
  const size = board.length;
  const other: Player = me === 'black' ? 'white' : 'black';
  const scored: { r: number; c: number; s: number }[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c]) continue;
      let near = false;
      for (let dr = -2; dr <= 2 && !near; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const nr = r + dr, nc = c + dc;
          if (inBounds(size, nr, nc) && board[nr][nc]) { near = true; break; }
        }
      }
      if (!near) continue;
      scored.push({ r, c, s: scoreMove(board, r, c, me) * 1.1 + scoreMove(board, r, c, other) });
    }
  }
  scored.sort((x, y) => y.s - x.s);
  return scored.slice(0, limit).map(m => [m.r, m.c]);
}

function search(
  board: Cell[][],
  depth: number,
  alpha: number,
  beta: number,
  turn: Player,
  ai: Player
): number {
  const human: Player = ai === 'black' ? 'white' : 'black';
  if (depth === 0) return evaluate(board, ai);
  const moves = candidateMoves(board, turn, INNER_WIDTH);
  if (moves.length === 0) return 0;
  const maximizing = turn === ai;
  let best = maximizing ? -Infinity : Infinity;
  for (const [r, c] of moves) {
    board[r][c] = turn;
    const won = findWinLine(board, r, c) !== null;
    const value = won
      ? (maximizing ? WIN_SCORE + depth : -WIN_SCORE - depth)
      : search(board, depth - 1, alpha, beta, turn === ai ? human : ai, ai);
    board[r][c] = null;
    if (maximizing) {
      best = Math.max(best, value);
      alpha = Math.max(alpha, value);
    } else {
      best = Math.min(best, value);
      beta = Math.min(beta, value);
    }
    if (beta <= alpha) break;
  }
  return best;
}

export function pickAiMove(original: Cell[][], ai: Player): [number, number] {
  const size = original.length;
  const human: Player = ai === 'black' ? 'white' : 'black';
  const board = original.map(row => [...row]);
  const mid = Math.floor(size / 2);

  const stones = board.flat().filter(Boolean).length;
  if (stones === 0) return [mid, mid];

  const moves = candidateMoves(board, ai, ROOT_WIDTH);
  if (moves.length === 0) return [mid, mid];

  // 1. Win immediately if possible.
  for (const [r, c] of moves) {
    board[r][c] = ai;
    const won = findWinLine(board, r, c) !== null;
    board[r][c] = null;
    if (won) return [r, c];
  }
  // 2. Block the opponent's immediate win.
  for (const [r, c] of candidateMoves(board, human, ROOT_WIDTH)) {
    board[r][c] = human;
    const won = findWinLine(board, r, c) !== null;
    board[r][c] = null;
    if (won) return [r, c];
  }

  // 3. Alpha-beta search.
  let best = moves[0];
  let bestValue = -Infinity;
  let alpha = -Infinity;
  for (const [r, c] of moves) {
    board[r][c] = ai;
    const value = search(board, SEARCH_DEPTH - 1, alpha, Infinity, human, ai);
    board[r][c] = null;
    if (value > bestValue) {
      bestValue = value;
      best = [r, c];
    }
    alpha = Math.max(alpha, value);
  }
  return best;
}

export const emptyBoard = (size: number = BOARD_SIZE): Cell[][] =>
  Array.from({ length: size }, () => Array<Cell>(size).fill(null));
