// src/middleware/uploadCloudinary.ts
import multer from "multer";
import type { Request, Response, NextFunction } from "express";
import { envelope } from "../utils/responseEnvelope";

const storage = multer.memoryStorage();

// Use Multer's expected fileFilter signature to avoid TS mismatch between multiple Express type versions.
const fileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed"));
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// Multer brings its own nested @types/express which can cause structural incompatibility with our root @types/express.
// Casting avoids the transient type mismatch; runtime behavior is unaffected.
export function multerHandler(req: Request, res: Response, next: NextFunction) {
  return (upload.single("image") as any)(req, res, (err: any) => {
    if (err) {
      return res
        .status(400)
        .json(
          envelope("error", null, "File upload error", [
            { message: err.message },
          ])
        );
    }
    next();
  });
}

//multiple files to uploads
export function multerMultipleHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  return (upload.array("images", 3) as any)(req, res, (err: any) => {
    if (err) {
      return res
        .status(400)
        .json(
          envelope("error", null, "File upload error", [
            { message: err.message || "Upload error" },
          ])
        );
    }
    // validate number of files (defensive)
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      return res
        .status(400)
        .json(
          envelope("error", null, "No files uploaded", { field: "images" })
        );
    }
    if (files.length > 3) {
      return res
        .status(400)
        .json(envelope("error", null, "Maximum 3 images allowed", { max: 3 }));
    }
    next();
  });
}
