import express from "express";
import dotenv from "dotenv";

dotenv.config();
//static import for routes
import path from "path";
import authRoutes from "./routes/auth";
import { errorHandler } from "./middlewares/errorHandler";
import recommenderRoutes from "./routes/recommender";
// import { upload } from "./middlewares/uploadCloudinary";
// import { uploadImage, uploadBase64 } from "./controllers/uploadController";
import uploadRoutes from "./routes/upload";

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/recommender", recommenderRoutes);
//cloudinary upload routes
app.use("/api/v1/upload", uploadRoutes);

// health
app.get("/health", (req, res) => res.json({ ok: true }));
//static files
app.use(express.static(path.join(__dirname, "../public")));
app.use(errorHandler);

export default app;
