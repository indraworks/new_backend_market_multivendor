import pool from "../db";
import { hashPassword, comparePassword } from "../utils/hash";
import jwt, { SignOptions, Secret } from "jsonwebtoken";
import { uploadImageBase64 } from "../utils/cloudinary";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET: Secret = process.env.JWT_SECRET ?? "secret";
const JWT_EXPIRES: SignOptions["expiresIn"] = (process.env.JWT_EXPIRES ??
  "7d") as SignOptions["expiresIn"];
const RESET_EXPIRES: SignOptions["expiresIn"] = (process.env.RESET_EXPIRES ??
  "1h") as SignOptions["expiresIn"];

export async function registerAccount({
  email,
  password,
  account_type,
  phone,
  avatar_base64,
}: {
  email: string;
  password: string;
  account_type: "buyer" | "vendor" | "admin" | "staff";
  phone?: string;
  avatar_base64?: string;
}) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existRows] = await conn.query(
      "SELECT id FROM accounts WHERE email = ?",
      [email]
    );
    if ((existRows as any[]).length)
      throw new Error("Email already registered");

    const hashed = await hashPassword(password);
    const [res] = await conn.query(
      `INSERT INTO accounts (email, password, account_type, phone, avatar_url, status) VALUES (?, ?, ?, ?, ?, 'active')`,
      [email, hashed, account_type, phone ?? null, null]
    );
    const insertId = (res as any).insertId;

    // upload avatar if provided
    let avatarUrl = null;
    if (avatar_base64) {
      avatarUrl = await uploadImageBase64(avatar_base64, `avatars/${insertId}`);
      await conn.query("UPDATE accounts SET avatar_url = ? WHERE id = ?", [
        avatarUrl,
        insertId,
      ]);
    }

    // create profile entry depending on account_type
    if (account_type === "buyer") {
      await conn.query(
        "INSERT INTO user_profiles (account_id, created_at) VALUES (?, NOW())",
        [insertId]
      );
      // assign buyer role in account_has_roles if roles table used; optional
    } else if (account_type === "vendor") {
      await conn.query(
        "INSERT INTO vendor_profiles (account_id, store_name) VALUES (?, ?)",
        [insertId, `Store-${insertId}`]
      );
    }

    await conn.commit();
    return { id: insertId, email, avatarUrl };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function login(email: string, password: string) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      "SELECT id, password, account_type, status FROM accounts WHERE email = ?",
      [email]
    );
    if ((rows as any[]).length === 0) throw new Error("Invalid credentials");
    const row = (rows as any)[0];
    if (row.status !== "active") throw new Error("Account not active");

    const match = await comparePassword(password, row.password);
    if (!match) throw new Error("Invalid credentials");

    const token = jwt.sign(
      { sub: row.id, type: row.account_type },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    // update last_login
    await conn.query("UPDATE accounts SET last_login = NOW() WHERE id = ?", [
      row.id,
    ]);

    return { token, accountId: row.id, accountType: row.account_type };
  } finally {
    conn.release();
  }
}

export function generateResetToken(email: string) {
  // do not store token in DB — token contains email and expiry and signed with secret
  return jwt.sign({ email }, JWT_SECRET, { expiresIn: RESET_EXPIRES });
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
) {
  const payload: any = jwt.verify(token, JWT_SECRET);
  const email = payload.email;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query("SELECT id FROM accounts WHERE email = ?", [
      email,
    ]);
    if ((rows as any[]).length === 0) throw new Error("Account not found");
    const id = (rows as any)[0].id;
    const hashed = await hashPassword(newPassword);
    await conn.query("UPDATE accounts SET password = ? WHERE id = ?", [
      hashed,
      id,
    ]);
    return { id, email };
  } finally {
    conn.release();
  }
}
