import type { NextFunction, Request, Response } from 'express';

// Express 4 does not catch rejected promises from handlers; forward them to the error middleware.
export const asyncRoute =
  <Req extends Request>(
    handler: (req: Req, res: Response) => Promise<unknown>,
  ) =>
  (req: Req, res: Response, next: NextFunction): void => {
    handler(req, res).catch(next);
  };

export function parseId(value: string): number | null {
  return /^\d+$/.test(value) ? Number(value) : null;
}
