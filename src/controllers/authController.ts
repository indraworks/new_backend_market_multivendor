// src/controllers/authController.ts
import { Request, Response } from "express";
import pool from "../db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import crypto from "crypto";
import { envelope } from "../utils/responseEnvelope"; // asumsi ada
import { sendMail } from "../utils//mailer";
import { passwordResetEmailTemplate } from "../utils/emailTemplates";
dotenv.config();

const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET || "change_me";
const RESET_JWT_SECRET: jwt.Secret =
  process.env.RESET_JWT_SECRET || "change_me";

const parseExpires = (v?: string): jwt.SignOptions["expiresIn"] => {
  if (!v) return "1d";
  const n = Number(v);
  //return isNaN(n) ? v : n;
  if (!Number.isNaN(n)) return n; // seconds
  // allow ms/s/m/h/d units
  if (!/^(\d+)(ms|s|m|h|d)$/.test(v)) {
    throw new Error("Invalid JWT_EXPIRES_IN. Use seconds or e.g. 15m, 1h, 7d.");
  }
  return v as unknown as jwt.SignOptions["expiresIn"];
};

const JWT_EXPIRES_IN = parseExpires(process.env.JWT_EXPIRES_IN); // e.g. "1d" or 3600
const RESET_JWT_EXPIRES_IN = parseExpires(process.env.RESET_JWT_EXPIRES_IN); // e.g. "1h" or 3600
// const JWT_EXPIRES_IN =
//   process.env.JWT_EXPIRES_IN && !isNaN(Number(process.env.JWT_EXPIRES_IN))
//     ? /*

// The issue is that JWT_EXPIRES_IN is being passed as string | number, but jwt.sign expects expiresIn to be either a number or a specific string value.
// To fix this, ensure JWT_EXPIRES_IN is explicitly typed as string or number and matches the expected values.

// */
//       parseInt(process.env.JWT_EXPIRES_IN, 10)
//     : "7d";

//ganti yang baru

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

    // const token = jwt.sign({ id, email, role: account_type }, JWT_SECRET, {
    //   expiresIn: JWT_EXPIRES_IN,
    // });

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
