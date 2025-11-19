import cron from "node-cron";
import db from "../db";

export function registerPasswordResetCleanupJob() {
  // Schedule the job to run every day at midnight
  // Cron job: hapus token expired setiap 1 jam
  cron.schedule("0 * * * *", async () => {
    try {
      //delete expired password reset tokens
      const [result] = await db.query(
        "DELETE FROM password_resets where expires_at < NOW()"
      );
      const affected = (result as any).affectedRows ?? 0;
      if (affected > 0) {
        console.log(`[CRON] cleaned ${affected} expired password reset tokens`);
      }
    } catch (err) {
      console.log("[CRON] Error Cleaning expired tokens :", err);
    }
  });
  console.log("[CRON] Password reset cleanup job registered (runs every hour)");
}
