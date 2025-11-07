import { Request, Response, NextFunction } from "express";
import { envelope } from "../utils/responseEnvelope";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err);
  res
    .status(500)
    .json(envelope("error", null, err.message || "Internal Server Error"));
}
