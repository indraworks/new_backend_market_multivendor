// src/services/recommenderService.ts
//ganti semua 0.price  menjadi o.unit_price sesuai db baru
import pool from "../db";
import { RowDataPacket } from "mysql2";

type DateRange = { from?: string; to?: string };

function defaultDateRangeLastMonths(months = 12) {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - months);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}
//////////function Helper di atas//////////

// helper to build where clauses and params
function buildDateRange(from?: string, to?: string) {
  if (from && to)
    return { clause: "DATE(o.placed_at) BETWEEN ? AND ?", params: [from, to] };
  if (from) return { clause: "DATE(o.placed_at) >= ?", params: [from] };
  if (to) return { clause: "DATE(o.placed_at) <= ?", params: [to] };
  return { clause: "", params: [] };
}

function buildSearchClause(q?: string) {
  if (!q) return { clause: "", params: [] };
  // match product name or vendor store name
  return {
    clause: `(p.name LIKE ? OR vp.store_name LIKE ?)`,
    params: [`%${q}%`, `%${q}%`],
  };
}

function buildCategoryClause(categoryId?: number) {
  if (!categoryId) return { clause: "", params: [] };
  return { clause: "p.category_id = ?", params: [categoryId] };
}

function buildVendorClause(vendorId?: number) {
  if (!vendorId) return { clause: "", params: [] };
  return { clause: "oi.vendor_account_id = ?", params: [vendorId] };
}

/**
 * Generic function used by many endpoints to append optional filters.
 */

function appendFilters(
  baseWhere: string[],
  baseParams: any[],
  opts: {
    q?: string;
    from?: string;
    to?: string;
    categoryId?: number;
    vendorId?: number;
  }
) {
  const qC = buildSearchClause(opts.q);
  if (qC.clause) {
    baseWhere.push(qC.clause);
    baseParams.push(...qC.params);
  }

  const dateC = buildDateRange(opts.from, opts.to);
  if (dateC.clause) {
    baseWhere.push(dateC.clause);
    baseParams.push(...dateC.params);
  }

  const catC = buildCategoryClause(opts.categoryId);
  if (catC.clause) {
    baseWhere.push(catC.clause);
    baseParams.push(...catC.params);
  }

  const venC = buildVendorClause(opts.vendorId);
  if (venC.clause) {
    baseWhere.push(venC.clause);
    baseParams.push(...venC.params);
  }

  return {
    where: baseWhere.length ? " AND " + baseWhere.join(" AND ") : "",
    params: baseParams,
  };
}

////// end Helper //////

/** old function
 * Top N products by quantity sold in date range
 */
// export async function getTopProducts(limit = 20, range?: DateRange) {
//   const { from, to } = range ?? defaultDateRangeLastMonths(12);
//   const conn = await pool.getConnection();
//   try {
//     const sql = `
//       SELECT p.id AS product_id, p.name AS product_name, p.sku, p.category_id, SUM(oi.quantity) AS total_qty, SUM(oi.quantity * oi.unit_price) AS total_revenue
//       FROM order_items oi
//       JOIN orders o ON o.id = oi.order_id
//       JOIN products p ON p.id = oi.product_id
//       WHERE o.status IN ('paid', 'completed') AND DATE(o.placed_at) BETWEEN ? AND ?
//       GROUP BY p.id
//       ORDER BY total_qty DESC
//       LIMIT ?
//     `;
//     const [rows] = await conn.query<RowDataPacket[]>(sql, [from, to, limit]);
//     return rows;
//   } finally {
//     conn.release();
//   }
// }

// new Top N products by quantity sold in date range with filter !

export async function getTopProducts(
  limit = 20,
  opts?: {
    q?: string;
    from?: string;
    to?: string;
    categoryId?: number;
    vendorId?: number;
  }
) {
  const conn = await pool.getConnection();
  try {
    const baseWhere = ["o.status IN ('paid','completed')"];
    const baseParams: any[] = [];
    const built = appendFilters(baseWhere, baseParams, opts ?? {});
    const sql = `
      SELECT p.id AS product_id, p.name AS product_name, p.sku, p.category_id,
             SUM(oi.quantity) AS total_qty, SUM(oi.quantity * oi.unit_price) AS total_revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      LEFT JOIN vendor_profiles vp ON vp.account_id = oi.vendor_account_id
      WHERE ${
        built.where ? built.where.slice(5) : "o.status IN ('paid','completed')"
      } ${built.where ? "" : ""}
      GROUP BY p.id
      ORDER BY total_qty DESC
      LIMIT ?
    `;
    const params = [...built.params, limit];
    const [rows] = await conn.query(sql, params);
    return rows;
  } finally {
    conn.release();
  }
}

/**
 *  OLD Top N products grouped by category
 */
// export async function getTopProductsByCategory(
//   limitPerCategory = 10,
//   range?: DateRange
// ) {
//   const { from, to } = range ?? defaultDateRangeLastMonths(12);
//   const conn = await pool.getConnection();
//   try {
//     // We'll use a query that returns top N per category via user variables or by running per-category.
//     // Simpler: fetch aggregated then group in JS picking top N per category.
//     const sql = `
//       SELECT p.id AS product_id, p.name AS product_name, p.category_id, c.name AS category_name,
//              SUM(oi.quantity) AS total_qty, SUM(oi.quantity * oi.unit_price) AS total_revenue
//       FROM order_items oi
//       JOIN orders o ON o.id = oi.order_id
//       JOIN products p ON p.id = oi.product_id
//       LEFT JOIN categories c ON c.id = p.category_id
//       WHERE o.status IN ('paid', 'completed') AND DATE(o.placed_at) BETWEEN ? AND ?
//       GROUP BY p.id
//       ORDER BY p.category_id, total_qty DESC
//     `;
//     const [rows] = await conn.query<RowDataPacket[]>(sql, [from, to]);
//     // now group and pick top N per category
//     const grouped: Record<string, any[]> = {};
//     for (const r of rows) {
//       const cat = r.category_id ?? "uncategorized";
//       grouped[cat] = grouped[cat] ?? [];
//       grouped[cat].push(r);
//     }
//     const result: any[] = [];
//     for (const cat of Object.keys(grouped)) {
//       const arr = grouped[cat].slice(0, limitPerCategory);
//       result.push({ category_id: cat, products: arr });
//     }
//     return result;
//   } finally {
//     conn.release();
//   }
// }

/// New Top N products grouped by category with filter !
/**
 * Top products by category (top N per category). Accepts filters; categoryId optional to limit to one category.
 */
export async function getTopProductsByCategory(
  limitPerCategory = 10,
  opts?: { q?: string; from?: string; to?: string }
) {
  const conn = await pool.getConnection();
  try {
    // Aggregate globally then group in JS to pick top per category
    const baseWhere = ["o.status IN ('paid','completed')"];
    const built = appendFilters(baseWhere, [], opts ?? {});
    const sql = `
      SELECT p.id AS product_id, p.name AS product_name, p.category_id, c.name AS category_name,
             SUM(oi.quantity) AS total_qty, SUM(oi.quantity * oi.unit_price) AS total_revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN vendor_profiles vp ON vp.account_id = oi.vendor_account_id
      WHERE ${
        built.where ? built.where.slice(5) : "o.status IN ('paid','completed')"
      }
      GROUP BY p.id
      ORDER BY p.category_id, total_qty DESC
    `;
    const params = [...built.params];
    const [rows] = await conn.query(sql, params);
    // group and pick top
    const grouped: Record<string, any[]> = {};
    for (const r of rows as any[]) {
      const cat = r.category_id ?? "uncategorized";
      grouped[cat] = grouped[cat] ?? [];
      grouped[cat].push(r);
    }
    const result: any[] = [];
    for (const cat of Object.keys(grouped)) {
      result.push({
        category_id: cat,
        products: grouped[cat].slice(0, limitPerCategory),
      });
    }
    return result;
  } finally {
    conn.release();
  }
}

/** Insight exist functions
 *   User insights: monthly sales, avg order value, repeat purchase rate
 */
export async function getUserInsights(userId: number, months = 12) {
  const conn = await pool.getConnection();
  try {
    // monthly sales (sum of order total per month)
    const sqlMonthly = `
      SELECT DATE_FORMAT(o.placed_at, '%Y-%m') AS ym,
             SUM(oi.quantity * oi.unit_price) AS month_revenue,
             SUM(oi.quantity) AS month_qty
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.user_id = ? AND o.status IN ('paid','completed') AND o.placed_at > DATE_SUB(NOW(), INTERVAL ? MONTH)
      GROUP BY ym
      ORDER BY ym ASC
    `;
    const [monthlyRows] = await conn.query<RowDataPacket[]>(sqlMonthly, [
      userId,
      months,
    ]);

    // avg order value
    const sqlAvg = `
      SELECT AVG(sub.total) AS avg_order_value
      FROM (
        SELECT o.id, SUM(oi.quantity * oi.unit_price) as total
        FROM orders o JOIN order_items oi ON oi.order_id = o.id
        WHERE o.user_id = ? AND o.status IN ('paid','completed') AND o.placed_at > DATE_SUB(NOW(), INTERVAL ? MONTH)
        GROUP BY o.id
      ) sub
    `;
    const [avgRows] = await conn.query<RowDataPacket[]>(sqlAvg, [
      userId,
      months,
    ]);

    // repeat purchase rate = users with more than 1 order / total orders? For single user: percent of repeat purchases = (orders_count - unique_products_ordered_again?)
    // For simplicity: repeat rate = number of orders with same product purchased more than once / total orders. Simpler: compute order_count and repeat_order_count where order_count >1 per product.
    const sqlRepeat = `
      SELECT
        COUNT(DISTINCT o.id) AS total_orders,
        SUM(CASE WHEN sub.cnt > 1 THEN 1 ELSE 0 END) AS orders_having_repeated_products
      FROM orders o
      JOIN (
        SELECT o.id, COUNT(DISTINCT oi.product_id) as cnt
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.user_id = ? AND o.status IN ('paid','completed') AND o.placed_at > DATE_SUB(NOW(), INTERVAL ? MONTH)
        GROUP BY o.id
      ) sub ON sub.id = o.id
      WHERE o.user_id = ? AND o.status IN ('paid','completed') AND o.placed_at > DATE_SUB(NOW(), INTERVAL ? MONTH)
    `;
    const [repeatRows] = await conn.query<RowDataPacket[]>(sqlRepeat, [
      userId,
      months,
      userId,
      months,
    ]);

    return {
      monthly: monthlyRows,
      avgOrderValue: avgRows[0]?.avg_order_value ?? 0,
      repeat: repeatRows[0] ?? {
        total_orders: 0,
        orders_having_repeated_products: 0,
      },
    };
  } finally {
    conn.release();
  }
}

/**
 *  exist function Vendor insights: total sales, top products for vendor
 */
export async function getVendorInsights(
  vendorId: number,
  months = 12,
  topN = 10
) {
  const conn = await pool.getConnection();
  try {
    const sqlVendorSales = `
      SELECT DATE_FORMAT(o.placed_at, '%Y-%m') AS ym, SUM(oi.quantity * oi.unit_price) AS revenue
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE oi.vendor_id = ? AND o.status IN ('paid','completed') AND o.placed_at > DATE_SUB(NOW(), INTERVAL ? MONTH)
      GROUP BY ym
      ORDER BY ym ASC
    `;
    const [salesRows] = await conn.query<RowDataPacket[]>(sqlVendorSales, [
      vendorId,
      months,
    ]);

    const sqlTopProducts = `
      SELECT p.id AS product_id, p.name AS product_name, SUM(oi.quantity) AS total_qty, SUM(oi.quantity*oi.unit_price) AS total_revenue
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.vendor_id = ? AND o.status IN ('paid','completed') AND o.placed_at > DATE_SUB(NOW(), INTERVAL ? MONTH)
      GROUP BY p.id
      ORDER BY total_qty DESC
      LIMIT ?
    `;
    const [topRows] = await conn.query<RowDataPacket[]>(sqlTopProducts, [
      vendorId,
      months,
      topN,
    ]);

    return { sales: salesRows, topProducts: topRows };
  } finally {
    conn.release();
  }
}

/**
 *  OLD Custom query by filters (category, vendor, date range)
 */
// export async function getCustomRecommendation(filters: {
//   categoryId?: number;
//   vendorId?: number;
//   from?: string;
//   to?: string;
//   limit?: number;
// }) {
//   const conn = await pool.getConnection();
//   try {
//     const from =
//       filters.from ??
//       new Date(Date.now() - 1000 * 60 * 60 * 24 * 365)
//         .toISOString()
//         .slice(0, 10);
//     const to = filters.to ?? new Date().toISOString().slice(0, 10);
//     const limit = filters.limit ?? 50;

//     const whereParts: string[] = [
//       "o.status IN ('paid','completed')",
//       "DATE(o.placed_at) BETWEEN ? AND ?",
//     ];
//     const params: any[] = [from, to];

//     if (filters.categoryId) {
//       whereParts.push("p.category_id = ?");
//       params.push(filters.categoryId);
//     }
//     if (filters.vendorId) {
//       whereParts.push("oi.vendor_id = ?");
//       params.push(filters.vendorId);
//     }

//     const sql = `
//       SELECT p.id AS product_id, p.name AS product_name, p.category_id, SUM(oi.quantity) AS total_qty, SUM(oi.quantity*oi.unit_price) AS total_revenue
//       FROM order_items oi
//       JOIN orders o ON o.id = oi.order_id
//       JOIN products p ON p.id = oi.product_id
//       WHERE ${whereParts.join(" AND ")}
//       GROUP BY p.id
//       ORDER BY total_qty DESC
//       LIMIT ?
//     `;
//     params.push(limit);
//     const [rows] = await conn.query<RowDataPacket[]>(sql, params);
//     return rows;
//   } finally {
//     conn.release();
//   }
// }

// --- tambahan di src/services/recommenderService.ts ---

/**
 *  OLD :Trending products in last 7 days by growth (delta) or recent sales.
 * We'll compute total qty in last 7 days and order by qty desc.
 */

// NEW Trending 7 days (accepts optional from/to overrides and search)

export async function getTrending7Days(
  limit = 20,
  opts?: { q?: string; from?: string; to?: string; vendorId?: number }
) {
  const conn = await pool.getConnection();
  try {
    // If from/to supplied but not 7-day, still allow; otherwise default last 7 days
    const defaultFrom = opts?.from
      ? undefined
      : new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const baseWhere = ["o.status IN ('paid','completed')"];
    if (!opts?.from && !opts?.to) {
      baseWhere.push("DATE(o.placed_at) BETWEEN ? AND ?");
    }
    const built = appendFilters(baseWhere, [], {
      ...opts,
      from: opts?.from ?? defaultFrom,
      to: opts?.to ?? new Date().toISOString().slice(0, 10),
    });
    const sql = `
      SELECT p.id AS product_id, p.name AS product_name,
             SUM(oi.quantity) AS total_qty_7d,
             SUM(oi.quantity * oi.unit_price) AS total_revenue_7d
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      LEFT JOIN vendor_profiles vp ON vp.account_id = oi.vendor_account_id
      WHERE ${
        built.where ? built.where.slice(5) : "o.status IN ('paid','completed')"
      }
      GROUP BY p.id
      ORDER BY total_qty_7d DESC
      LIMIT ?
    `;
    const params = [...built.params, limit];
    const [rows] = await conn.query(sql, params);
    return rows;
  } finally {
    conn.release();
  }
}

/**
 *  OLD : Monthly top (aggregate for last 30 days)
 */
// export async function getMonthlyTop(limit = 20) {
//   const conn = await pool.getConnection();
//   try {
//     const sql = `
//       SELECT p.id AS product_id, p.name AS product_name,
//              SUM(oi.quantity) AS total_qty_30d,
//              SUM(oi.quantity * oi.unit_price) AS total_revenue_30d
//       FROM order_items oi
//       JOIN orders o ON o.id = oi.order_id
//       JOIN products p ON p.id = oi.product_id
//       WHERE o.status IN ('paid','completed') AND o.placed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
//       GROUP BY p.id
//       ORDER BY total_qty_30d DESC
//       LIMIT ?
//     `;
//     const [rows] = await conn.query(sql, [limit]);
//     return rows;
//   } finally {
//     conn.release();
//   }
// }
export async function getMonthlyTop(
  limit = 20,
  opts?: { q?: string; from?: string; to?: string; categoryId?: number }
) {
  const conn = await pool.getConnection();
  try {
    const defaultFrom = opts?.from
      ? undefined
      : new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const baseWhere = ["o.status IN ('paid','completed')"];
    const built = appendFilters(baseWhere, [], {
      ...opts,
      from: opts?.from ?? defaultFrom,
      to: opts?.to ?? new Date().toISOString().slice(0, 10),
    });
    const sql = `
      SELECT p.id AS product_id, p.name AS product_name,
             SUM(oi.quantity) AS total_qty_30d,
             SUM(oi.quantity * oi.unit_price) AS total_revenue_30d
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      LEFT JOIN vendor_profiles vp ON vp.account_id = oi.vendor_account_id
      WHERE ${
        built.where ? built.where.slice(5) : "o.status IN ('paid','completed')"
      }
      GROUP BY p.id
      ORDER BY total_qty_30d DESC
      LIMIT ?
    `;
    const params = [...built.params, limit];
    const [rows] = await conn.query(sql, params);
    return rows;
  } finally {
    conn.release();
  }
}

/**
 * OLD :Top vendors by total revenue in given range (default last 12 months)
 */
// export async function getTopVendors(
//   limit = 20,
//   range?: { from?: string; to?: string }
// ) {
//   const { from, to } = range ?? {
//     from: new Date(Date.now() - 365 * 24 * 3600 * 1000)
//       .toISOString()
//       .slice(0, 10),
//     to: new Date().toISOString().slice(0, 10),
//   };
//   const conn = await pool.getConnection();
//   try {
//     const sql = `
//       SELECT v.id AS vendor_account_id, vp.store_name,
//              SUM(oi.quantity * oi.unit_price) AS total_revenue,
//              SUM(oi.quantity) AS total_qty
//       FROM order_items oi
//       JOIN orders o ON o.id = oi.order_id
//       JOIN vendor_profiles vp ON vp.account_id = oi.vendor_account_id
//       JOIN accounts v ON v.id = oi.vendor_account_id
//       WHERE o.status IN ('paid','completed') AND DATE(o.placed_at) BETWEEN ? AND ?
//       GROUP BY oi.vendor_account_id
//       ORDER BY total_revenue DESC
//       LIMIT ?
//     `;
//     const [rows] = await conn.query(sql, [from, to, limit]);
//     return rows;
//   } finally {
//     conn.release();
//   }
// }

/* Top vendors with filters and optional date range
 */
export async function getTopVendors(
  limit = 20,
  opts?: { q?: string; from?: string; to?: string }
) {
  const conn = await pool.getConnection();
  try {
    const baseWhere = ["o.status IN ('paid','completed')"];
    const built = appendFilters(baseWhere, [], opts ?? {});
    const sql = `
      SELECT oi.vendor_account_id AS vendor_account_id, vp.store_name,
             SUM(oi.quantity * oi.unit_price) AS total_revenue,
             SUM(oi.quantity) AS total_qty
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN vendor_profiles vp ON vp.account_id = oi.vendor_account_id
      WHERE ${
        built.where ? built.where.slice(5) : "o.status IN ('paid','completed')"
      }
      GROUP BY oi.vendor_account_id
      ORDER BY total_revenue DESC
      LIMIT ?
    `;
    const params = [...built.params, limit];
    const [rows] = await conn.query(sql, params);
    return rows;
  } finally {
    conn.release();
  }
}

/**
 * Custom recommendation query preserved (also support filters)
 */
export async function getCustomRecommendation(filters: {
  categoryId?: number;
  vendorId?: number;
  from?: string;
  to?: string;
  limit?: number;
  q?: string;
}) {
  return getTopProducts(filters.limit ?? 50, {
    q: filters.q,
    from: filters.from,
    to: filters.to,
    categoryId: filters.categoryId,
    vendorId: filters.vendorId,
  });
}
