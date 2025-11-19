// src/controllers/authController.ts
import { Request, Response } from "express";
import pool from "../db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import crypto from "crypto";
import { envelope } from "../utils/responseEnvelope"; // asumsi ada
import { sendMail } from "../utils/mailer";
import { passwordResetEmailTemplate } from "../utils/emailTemplates";
import db from "../db";
dotenv.config();

const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET || "change_me";
const RESET_JWT_SECRET: jwt.Secret =
  process.env.RESET_JWT_SECRET || "change_me";

const parseExpires = (v?: string): jwt.SignOptions["expiresIn"] => {
  // Default to 1 day
  if (!v) return "1d";
  const n = Number(v);
  // numeric seconds
  if (!Number.isNaN(n)) return n;
  // allow ms/s/m/h/d units (e.g., 15m, 1h, 7d)
  if (/^(\d+)(ms|s|m|h|d)$/.test(v)) {
    return v as unknown as jwt.SignOptions["expiresIn"];
  }
  // Graceful fallback to avoid throwing during module load
  console.warn(
    `Invalid JWT_EXPIRES_IN value "${v}". Falling back to "1d". Use seconds or e.g. 15m, 1h, 7d.`
  );
  return "1d";
};

const JWT_EXPIRES_IN = parseExpires(process.env.JWT_EXPIRES_IN); // e.g. "1d" or 3600
const RESET_JWT_EXPIRES_IN = parseExpires(process.env.RESET_JWT_EXPIRES_IN); // e.g. "1h" or 3600
const PASSWORD_RESET_TOKEN_TTL_MINUTES = Number(
  process.env.RESET_TOKEN_TTL_MINUTES || "60"
);

// const JWT_EXPIRES_IN =
//   process.env.JWT_EXPIRES_IN && !isNaN(Number(process.env.JWT_EXPIRES_IN))
//     ? /*

// The issue is that JWT_EXPIRES_IN is being passed as string | number, but jwt.sign expects expiresIn to be either a number or a specific string value.
// To fix this, ensure JWT_EXPIRES_IN is explicitly typed as string or number and matches the expected values.

// */
//       parseInt(process.env.JWT_EXPIRES_IN, 10)
//     : "7d";

//ganti yang baru

// export async function register(req: Request, res: Response) {
//   const { email, password, account_type = "user" } = req.body;
//   if (!email || !password)
//     return res
//       .status(400)
//       .json(envelope("error", null, "Email and password required"));

//   const conn = await pool.getConnection();
//   // mapping: jika frontend mengirim 'user' atau 'buyer' undefined, kita pastikan enum valid

//   try {
//     const [existing] = await conn.query(
//       "SELECT id FROM accounts WHERE email = ? LIMIT 1",
//       [email]
//     );
//     if ((existing as any[]).length > 0)
//       return res.json(envelope("error", null, "Email already registered"));

//     const hashed = await bcrypt.hash(password, 10);
//     const [result]: any = await conn.query(
//       "INSERT INTO accounts (email, password, account_type) VALUES (?, ?, ?)",
//       [email, hashed, account_type]
//     );
//     const id = result.insertId;

//     // optional: insert into user_profile/vendor_profile based on account_type
//     // ...

//     // const token = jwt.sign({ id, email, role: account_type }, JWT_SECRET, {
//     //   expiresIn: JWT_EXPIRES_IN,
//     // });

//     const token = jwt.sign({ id, email, role: account_type }, JWT_SECRET, {
//       expiresIn: JWT_EXPIRES_IN,
//     });
//     return res.json(
//       envelope(
//         "success",
//         { token, user: { id, email, role: account_type } },
//         "OK"
//       )
//     );
//   } catch (err: any) {
//     console.error(err);
//     return res.status(500).json(envelope("error", null, err.message));
//   } finally {
//     conn.release();
//   }
// }

// export async function login(req: Request, res: Response) {
//   const { email, password } = req.body;
//   if (!email || !password)
//     return res
//       .status(400)
//       .json(envelope("error", null, "Email and password required"));

//   const conn = await pool.getConnection();
//   try {
//     const [rows]: any = await conn.query(
//       "SELECT id, email, password, account_type FROM accounts WHERE email = ? LIMIT 1",
//       [email]
//     );
//     if (!rows || rows.length === 0)
//       return res
//         .status(401)
//         .json(envelope("error", null, "Invalid credentials"));

//     const user = rows[0];
//     const match = await bcrypt.compare(password, user.password);
//     if (!match)
//       return res
//         .status(401)
//         .json(envelope("error", null, "Invalid credentials"));

//     const token = jwt.sign(
//       { id: user.id, email: user.email, role: user.account_type },
//       JWT_SECRET,
//       { expiresIn: JWT_EXPIRES_IN }
//     );

//     // optionally fetch profile data
//     const profile = { id: user.id, email: user.email, role: user.account_type };

//     return res.json(envelope("success", { token, user: profile }, "OK"));
//   } catch (err: any) {
//     console.error(err);
//     return res.status(500).json(envelope("error", null, err.message));
//   } finally {
//     conn.release();
//   }
// }

///tambahan function reset password
// export async function requestPasswordReset(req: Request, res: Response) {
//   const { email } = req.body;
//   if (!email)
//     return res.status(400).json(envelope("error", null, "Email required"));

//   const conn = await pool.getConnection();
//   try {
//     const [rows]: any = await conn.query(
//       "SELECT id FROM accounts WHERE email = ? LIMIT 1",
//       [email]
//     );
//     if (!rows || rows.length === 0) {
//       // For privacy: we still respond success
//       return res.json(
//         envelope(
//           "success",
//           null,
//           "If the email exists, a reset link will be sent"
//         )
//       );
//     }
//     const account = rows[0];
//     const token = crypto.randomBytes(32).toString("hex");
//     const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

//     await conn.query(
//       "INSERT INTO password_resets (account_id, token, expires_at) VALUES (?, ?, ?)",
//       [account.id, token, expiresAt]
//     );

//     const resetLink = `${
//       process.env.API_BASE || "http://localhost:4000"
//     }/resetlink.html?token=${token}`;
//     const html = passwordResetEmailTemplate(resetLink, email);

//     // send email (Mailtrap or Mailgun)
//     await sendMail(email, "Password Reset Request", html);

//     // DEV: we used to return token for testing. In prod do NOT return token.
//     return res.json(envelope("success", null, "Password reset link sent"));
//   } catch (err: any) {
//     console.error("requestPasswordReset error", err);
//     return res.status(500).json(envelope("error", null, err.message));
//   } finally {
//     conn.release();
//   }
// }

//reset password
// export async function resetPassword(req: Request, res: Response) {
//   const { token, password } = req.body;
//   if (!token || !password)
//     return res
//       .status(400)
//       .json(envelope("error", null, "Token and password required"));

//   const conn = await pool.getConnection();
//   try {
//     const [rows]: any = await conn.query(
//       "SELECT pr.id AS pr_id, pr.account_id, pr.expires_at FROM password_resets pr WHERE pr.token = ? LIMIT 1",
//       [token]
//     );
//     if (!rows || rows.length === 0) {
//       return res
//         .status(400)
//         .json(envelope("error", null, "Invalid or expired token"));
//     }
//     const pr = rows[0];
//     if (new Date(pr.expires_at).getTime() < Date.now()) {
//       await conn.query("DELETE FROM password_resets WHERE id = ?", [pr.pr_id]);
//       return res.status(400).json(envelope("error", null, "Token expired"));
//     }

//     const hashed = await bcrypt.hash(password, 10);
//     await conn.query("UPDATE accounts SET password = ? WHERE id = ?", [
//       hashed,
//       pr.account_id,
//     ]);

//     // Invalidate all tokens for that account
//     await conn.query("DELETE FROM password_resets WHERE account_id = ?", [
//       pr.account_id,
//     ]);

//     return res.json(envelope("success", null, "Password successfully reset"));
//   } catch (err: any) {
//     console.error("resetPassword error", err);
//     return res.status(500).json(envelope("error", null, err.message));
//   } finally {
//     conn.release();
//   }
// }

///NEW CODE !
// valid enum values in DB
const VALID_ACCOUNT_TYPES = ["buyer", "vendor", "admin", "staff"];

function mapAccountType(input?: string): string {
  if (!input) return "buyer"; // default
  const t = input.toLowerCase();
  if (VALID_ACCOUNT_TYPES.includes(t)) return t;
  if (t === "user") return "buyer"; // legacy mapping
  // fallback default or throw
  return "buyer";
}

function makeToken(len = 48) {
  return crypto.randomBytes(len).toString("hex");
}

export async function register(req: Request, res: Response) {
  try {
    const { email, password, account_type, role } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ state: "error", message: "Email and password required" });
    }

    // normalize / map account_type to valid enum
    const acctType = mapAccountType(account_type ?? role);

    // check if email already exists
    const [existsRows] = await db.query(
      "SELECT id FROM accounts WHERE email = ? LIMIT 1",
      [email]
    );
    if ((existsRows as any).length > 0) {
      return res
        .status(409)
        .json({ state: "error", message: "Email already registered" });
    }

    // hash password
    const hashed = await bcrypt.hash(password, 10);

    // insert into accounts
    const insertSql =
      "INSERT INTO accounts (email, password, account_type) VALUES (?, ?, ?)";
    const [insertResult] = await db.query(insertSql, [email, hashed, acctType]);
    const accountId = (insertResult as any).insertId;

    // If you use roles table and account_has_roles, insert role mapping
    // Prefer role name from body (role) or derive from account_type
    let roleName = (req.body.role || acctType) as string;
    roleName = roleName.toLowerCase();

    // find role id
    const [roleRows] = await db.query(
      "SELECT id FROM roles WHERE name = ? LIMIT 1",
      [roleName]
    );
    if ((roleRows as any).length > 0) {
      const roleId = (roleRows as any)[0].id;
      await db.query(
        "INSERT INTO account_has_roles (account_id, role_id) VALUES (?, ?)",
        [accountId, roleId]
      );
    } else {
      // optionally insert default role mapping by name (skip if roles not present)
      // console.warn('role not found:', roleName);
    }

    return res.json({
      state: "success",
      message: "Account created",
      id: accountId,
    });
  } catch (err) {
    console.error("register error", err);
    return res.status(500).json({ state: "error", message: "Server error" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ state: "error", message: "Email and password required" });

    const [rows] = await db.query(
      "SELECT id, email, password, account_type FROM accounts WHERE email = ? LIMIT 1",
      [email]
    );
    if ((rows as any).length === 0) {
      return res
        .status(401)
        .json({ state: "error", message: "Invalid credentials" });
    }
    const user = (rows as any)[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res
        .status(401)
        .json({ state: "error", message: "Invalid credentials" });
    }

    const payload = {
      id: user.id,
      email: user.email,
      account_type: user.account_type,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.json({
      state: "success",
      message: "Login success",
      token,
      user: payload,
    });
  } catch (err) {
    console.error("login error", err);
    return res.status(500).json({ state: "error", message: "Server error" });
  }
}

export async function requestReset(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email)
      return res
        .status(400)
        .json({ state: "error", message: "Email required" });

    // find account
    const [rows] = await db.query(
      "SELECT id FROM accounts WHERE email = ? LIMIT 1",
      [email]
    );
    if ((rows as any).length === 0) {
      // do not reveal whether email exists? For dev we can report not found
      return res
        .status(404)
        .json({ state: "error", message: "Account not found" });
    }
    const accountId = (rows as any)[0].id;

    // create token and expires_at
    const token = makeToken(24);
    const expiresAt = new Date(
      Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000
    ); // e.g., 60 minutes

    // insert token
    await db.query(
      "INSERT INTO password_resets (account_id, token, expires_at) VALUES (?, ?, ?)",
      [accountId, token, expiresAt]
    );

    // In dev: return token in response to ease testing. In prod: send email with token link.
    // You can build reset link: `${process.env.APP_URL}/reset-password?token=${token}`
    return res.json({
      state: "success",
      message: "Reset token created",
      token,
    });
  } catch (err) {
    console.error("requestReset error", err);
    return res.status(500).json({ state: "error", message: "Server error" });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res
        .status(400)
        .json({ state: "error", message: "Token and password required" });

    // find token
    const [rows] = await db.query(
      "SELECT pr.id, pr.account_id, pr.expires_at, a.email FROM password_resets pr JOIN accounts a ON a.id = pr.account_id WHERE pr.token = ? LIMIT 1",
      [token]
    );
    if ((rows as any).length === 0) {
      return res.status(400).json({ state: "error", message: "Invalid token" });
    }
    const rec = (rows as any)[0];
    const expiresAt = new Date(rec.expires_at);
    if (expiresAt.getTime() < Date.now()) {
      // optionally delete expired token
      await db.query("DELETE FROM password_resets WHERE id = ?", [rec.id]);
      return res.status(400).json({ state: "error", message: "Token expired" });
    }

    // hash new password and update account
    const hashed = await bcrypt.hash(password, 10);
    await db.query("UPDATE accounts SET password = ? WHERE id = ?", [
      hashed,
      rec.account_id,
    ]);

    // delete all tokens for this account (or just current)
    await db.query("DELETE FROM password_resets WHERE account_id = ?", [
      rec.account_id,
    ]);

    return res.json({ state: "success", message: "Password reset successful" });
  } catch (err) {
    console.error("resetPassword error", err);
    return res.status(500).json({ state: "error", message: "Server error" });
  }
}
