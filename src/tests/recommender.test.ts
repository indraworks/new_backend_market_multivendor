import request from "supertest";
import app from "../app";
import pool from "../db";

describe("Recommender API", () => {
  // These tests assume DB seeded with realistic data.
  it("GET /top-products returns list", async () => {
    const res = await request(app).get(
      "/api/v1/recommender/top-products?limit=5"
    );
    expect(res.status).toBe(200);
    expect(["success", "noData"]).toContain(res.body.state);
    if (res.body.state === "success") {
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
      expect(res.body.data[0]).toHaveProperty("product_id");
    }
  });

  it("GET /top-by-category returns grouped", async () => {
    const res = await request(app).get(
      "/api/v1/recommender/top-by-category?limit=3"
    );
    expect(res.status).toBe(200);
    expect(["success", "noData"]).toContain(res.body.state);
    if (res.body.state === "success") {
      expect(Array.isArray(res.body.data)).toBe(true);
      // each element should contain category and products array
      const first = res.body.data[0];
      expect(first).toHaveProperty("category_id");
      expect(first).toHaveProperty("products");
    }
  });

  afterAll(async () => {
    await pool.end();
  });
});
