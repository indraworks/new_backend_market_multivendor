import request from "supertest";
import app from "../app";
import pool from "../db";

// jest.mock mysql2 pool if you want to run without actual DB;
// Here we assume you run tests against a test MySQL with the seeder loaded.

describe("Auth API", () => {
  it("register -> login flow", async () => {
    const email = `test${Date.now()}@example.com`;
    const password = "Password123!";
    // register
    const r = await request(app).post("/api/v1/auth/register").send({
      email,
      password,
      account_type: "buyer",
    });
    expect(r.status).toBe(200);
    expect(r.body.state).toBe("success");
    // login
    const l = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password });
    expect(l.status).toBe(200);
    expect(l.body.state).toBe("success");
    expect(l.body.data.token).toBeTruthy();
  });

  afterAll(async () => {
    // optionally cleanup created account using DB pool
    // await pool.query('DELETE FROM accounts WHERE email LIKE ?', [`test%@example.com`]);
    await pool.end();
  });
});
