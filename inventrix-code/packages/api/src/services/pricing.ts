// Products claimed after losing the Gomoku game cost this many times the list price.
export const PENALTY_MULTIPLIER = 10;

export const unitPrice = (price: number, penalty: boolean | number) =>
  penalty ? price * PENALTY_MULTIPLIER : price;
