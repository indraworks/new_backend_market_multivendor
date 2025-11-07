// src/controllers/recommenderController.ts
import { Request, Response } from "express";
import * as Rec from "../services/recommenderService";
import { envelope } from "../utils/responseEnvelope";

export async function userInsights(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    const months = parseInt(req.query.months as string) || 12;
    const data = await Rec.getUserInsights(userId, months);
    return res.json(envelope("success", data));
  } catch (err: any) {
    return res.status(400).json(envelope("error", null, err.message));
  }
}

export async function vendorInsights(req: Request, res: Response) {
  try {
    const vendorId = parseInt(req.params.vendorId);
    const months = parseInt(req.query.months as string) || 12;
    const data = await Rec.getVendorInsights(vendorId, months);
    return res.json(envelope("success", data));
  } catch (err: any) {
    return res.status(400).json(envelope("error", null, err.message));
  }
}

////NEW TO MERGE

function parseIntOrUndef(v?: string) {
  if (!v) return undefined;
  const n = parseInt(v);
  return isNaN(n) ? undefined : n;
}

export async function topProducts(req: Request, res: Response) {
  try {
    const limit = parseIntOrUndef(req.query.limit as string) ?? 20;
    const q = req.query.q as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const categoryId = parseIntOrUndef(req.query.categoryId as string);
    const vendorId = parseIntOrUndef(req.query.vendorId as string);
    const rows = await Rec.getTopProducts(limit, {
      q,
      from,
      to,
      categoryId,
      vendorId,
    });
    if (!rows || (Array.isArray(rows) && rows.length === 0))
      return res.json(envelope("noData", null, "No data found"));
    return res.json(envelope("success", rows));
  } catch (err: any) {
    return res.status(500).json(envelope("error", null, err.message));
  }
}

export async function topByCategory(req: Request, res: Response) {
  try {
    const limit = parseIntOrUndef(req.query.limit as string) ?? 10;
    const q = req.query.q as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const data = await Rec.getTopProductsByCategory(limit, { q, from, to });
    if (!data || (Array.isArray(data) && data.length === 0))
      return res.json(envelope("noData", null, "No data"));
    return res.json(envelope("success", data));
  } catch (err: any) {
    return res.status(500).json(envelope("error", null, err.message));
  }
}

export async function trending7(req: Request, res: Response) {
  try {
    const limit = parseIntOrUndef(req.query.limit as string) ?? 20;
    const q = req.query.q as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const vendorId = parseIntOrUndef(req.query.vendorId as string);
    const data = await Rec.getTrending7Days(limit, { q, from, to, vendorId });
    if (!data || (Array.isArray(data) && data.length === 0))
      return res.json(envelope("noData", null, "No trending data"));
    return res.json(envelope("success", data));
  } catch (err: any) {
    return res.status(500).json(envelope("error", null, err.message));
  }
}

export async function monthlyTop(req: Request, res: Response) {
  try {
    const limit = parseIntOrUndef(req.query.limit as string) ?? 20;
    const q = req.query.q as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const data = await Rec.getMonthlyTop(limit, { q, from, to });
    if (!data || (Array.isArray(data) && data.length === 0))
      return res.json(envelope("noData", null, "No data"));
    return res.json(envelope("success", data));
  } catch (err: any) {
    return res.status(500).json(envelope("error", null, err.message));
  }
}

export async function topVendors(req: Request, res: Response) {
  try {
    const limit = parseIntOrUndef(req.query.limit as string) ?? 20;
    const q = req.query.q as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const data = await Rec.getTopVendors(limit, { q, from, to });
    if (!data || (Array.isArray(data) && data.length === 0))
      return res.json(envelope("noData", null, "No data"));
    return res.json(envelope("success", data));
  } catch (err: any) {
    return res.status(500).json(envelope("error", null, err.message));
  }
}

export async function custom(req: Request, res: Response) {
  try {
    const { categoryId, vendorId, from, to, limit, q } = req.body;
    const rows = await Rec.getCustomRecommendation({
      categoryId,
      vendorId,
      from,
      to,
      limit,
      q,
    });
    if (!rows || (Array.isArray(rows) && rows.length === 0))
      return res.json(envelope("noData", null, "No results"));
    return res.json(envelope("success", rows));
  } catch (err: any) {
    return res.status(500).json(envelope("error", null, err.message));
  }
}
