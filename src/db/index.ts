import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: +(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "app_user",
  password: process.env.DB_PASS || "Andrich3v_2025",
  database: process.env.DB_NAME || "new_emarket_multivendor",
  connectionLimit: 10,
  decimalNumbers: true,
});

export default pool;
