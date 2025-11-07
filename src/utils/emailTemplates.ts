export function passwordResetEmailTemplate(
  resetLink: string,
  userEmail: string
) {
  return `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Password Reset</title>
    <style>
      body { font-family: Arial, sans-serif; background:#f6f8fb; padding:20px; }
      .card { max-width:560px; margin:30px auto; background:#fff; padding:24px; border-radius:8px; box-shadow:0 8px 30px rgba(0,0,0,0.06); text-align:center; }
      .btn { display:inline-block; padding:12px 20px; background:#007bff; color:#fff; text-decoration:none; border-radius:6px; font-weight:600; }
      .muted { color:#888; font-size:13px; margin-top:18px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h2>Password Reset</h2>
      <p>Hello <strong>${userEmail}</strong>,</p>
      <p>We received a request to reset your password. Click the button below to continue:</p>
      <p><a href="${resetLink}" class="btn">Reset Password</a></p>
      <p class="muted">If you didn't request this, you can ignore this email.</p>
      <p class="muted">© ${new Date().getFullYear()} eMarket</p>
    </div>
  </body>
  </html>
  `;
}
