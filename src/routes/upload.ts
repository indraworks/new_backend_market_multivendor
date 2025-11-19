// src/routes/upload.ts
import express from "express";
import {
  multerHandler,
  multerMultipleHandler,
} from "../middlewares/uploadCloudinary";
import {
  uploadImage,
  uploadBase64,
  uploadMultipleImages,
} from "../controllers/uploadController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();

// upload via multipart/form-data (field name: image)
router.post("/image", multerHandler, uploadImage);

// upload via JSON base64
router.post("/base64", uploadBase64);

// upload multiple images
router.post(
  "/multiple",

  multerMultipleHandler,
  uploadMultipleImages
);
// Note: The multerMultipleHandler middleware is used to handle multiple file uploads.

// Export the router to be used in the main app
export default router;
