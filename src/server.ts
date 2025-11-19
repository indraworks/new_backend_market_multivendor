import app from "./app";
import { registerPasswordResetCleanupJob } from "./cron/cleanupPasswordResets";

const port = 4000;

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
  registerPasswordResetCleanupJob(); //call the cleanup job registration function
});
// Register the cleanup job to run periodically
// This will delete expired password reset tokens every hour
// You can adjust the frequency in the cron job definition in cleanupPasswordResets.ts
// The job is registered when the server starts
// and will run in the background without blocking the server
// You can also add more cron jobs here if needed
// For example, you could add a job to clean up old user sessions or logs
// Just import the job registration function and call it here
