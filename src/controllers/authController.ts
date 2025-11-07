// src/controllers/authController.ts
import { Request, Response } from "express";
import pool from "../db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { envelope } from "../utils/responseEnvelope"; // asumsi ada
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "change_me";
const JWT_EXPIRES_IN =
  process.env.JWT_EXPIRES_IN && !isNaN(Number(process.env.JWT_EXPIRES_IN))
    ? /*

The issue is that JWT_EXPIRES_IN is being passed as string | number, but jwt.sign expects expiresIn to be either a number or a specific string value.
To fix this, ensure JWT_EXPIRES_IN is explicitly typed as string or number and matches the expected values.


*/
      parseInt(process.env.JWT_EXPIRES_IN, 10)
    : "7d";

export async function register(req: Request, res: Response) {
  const { email, password, account_type = "user" } = req.body;
  if (!email || !password)
    return res
      .status(400)
      .json(envelope("error", null, "Email and password required"));

  const conn = await pool.getConnection();
  try {
    const [existing] = await conn.query(
      "SELECT id FROM accounts WHERE email = ? LIMIT 1",
      [email]
    );
    if ((existing as any[]).length > 0)
      return res.json(envelope("error", null, "Email already registered"));

    const hashed = await bcrypt.hash(password, 10);
    const [result]: any = await conn.query(
      "INSERT INTO accounts (email, password, account_type) VALUES (?, ?, ?)",
      [email, hashed, account_type]
    );
    const id = result.insertId;

    // optional: insert into user_profile/vendor_profile based on account_type
    // ...

    const token = jwt.sign({ id, email, role: account_type }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
    return res.json(
      envelope(
        "success",
        { token, user: { id, email, role: account_type } },
        "OK"
      )
    );
  } catch (err: any) {
    console.error(err);
    return res.status(500).json(envelope("error", null, err.message));
  } finally {
    conn.release();
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password)
    return res
      .status(400)
      .json(envelope("error", null, "Email and password required"));

  const conn = await pool.getConnection();
  try {
    const [rows]: any = await conn.query(
      "SELECT id, email, password, account_type FROM accounts WHERE email = ? LIMIT 1",
      [email]
    );
    if (!rows || rows.length === 0)
      return res
        .status(401)
        .json(envelope("error", null, "Invalid credentials"));

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res
        .status(401)
        .json(envelope("error", null, "Invalid credentials"));

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.account_type },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // optionally fetch profile data
    const profile = { id: user.id, email: user.email, role: user.account_type };

    return res.json(envelope("success", { token, user: profile }, "OK"));
  } catch (err: any) {
    console.error(err);
    return res.status(500).json(envelope("error", null, err.message));
  } finally {
    conn.release();
  }
}
