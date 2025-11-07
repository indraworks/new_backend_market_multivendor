import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import { errorHandler } from "./middlewares/errorHandler";
import recommenderRoutes from "./routes/recommender";
dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/recommender", recommenderRoutes);

// health
app.get("/health", (req, res) => res.json({ ok: true }));

app.use(errorHandler);

export default app;
