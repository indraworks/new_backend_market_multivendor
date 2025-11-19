// src/controllers/uploadController.ts

import type { Request, Response } from "express";
import { envelope } from "../utils/responseEnvelope";
import { uploadBufferToCloudinary } from "../utils/cloudinary";

export async function uploadImage(req: Request, res: Response) {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json(envelope("error", null, "No file uploaded"));
    }

    const folder =
      req.body.folder || process.env.CLOUDINARY_UPLOAD_FOLDER || "uploads";

    const result = await uploadBufferToCloudinary(file.buffer, {
      folder,
      public_id: req.body.public_id,
    });

    const data = {
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      raw: result,
    };

    return res.status(200).json(envelope("success", data, "Upload successful"));
  } catch (err: any) {
    console.error("uploadImage error:", {
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
      // stringify non-enumerables and full object
      full: JSON.stringify(err, Object.getOwnPropertyNames(err)),
    });
    return res
      .status(500)
      .json(
        envelope("error", null, "Upload failed", [{ message: err.message }])
      );
  }
}

/**
 * POST /api/v1/upload/base64
 * Body JSON: { data: "data:image/png;base64,....", folder?: string }
 */
export async function uploadBase64(req: Request, res: Response) {
  try {
    const { data, folder } = req.body;
    if (!data)
      return res.status(400).json(envelope("error", null, "No data provided"));

    const matches = data.match(/^data:(.+);base64,(.+)$/);
    if (!matches)
      return res.status(400).json(envelope("error", null, "Invalid data URL"));

    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    const result = await uploadBufferToCloudinary(buffer, { folder });

    const responseData = {
      url: result.secure_url,
      public_id: result.public_id,
      raw: result,
    };

    return res
      .status(200)
      .json(envelope("success", responseData, "Upload successful"));
  } catch (err: any) {
    console.error("uploadBase64 error:", {
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
      // stringify non-enumerables and full object
      full: JSON.stringify(err, Object.getOwnPropertyNames(err)),
    });
    return res
      .status(500)
      .json(
        envelope("error", null, "Upload failed", [
          { message: err.message || "Unknown" },
        ])
      );
  }
}

///upload via multipart/form-data (field name: image)
export async function uploadMultipleImages(req: Request, res: Response) {
  try {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (!files || files.length === 0) {
      return res.status(400).json(envelope("error", null, "No files uploaded"));
    }
    // optional: folder default dari env
    const folder =
      req.body.folder || process.env.CLOUDINARY_UPLOAD_FOLDER || "uploads";

    const results: any[] = [];
    // upload sequentially (safer), bisa dibuat parallel jika mau
    for (const file of files) {
      const r = await uploadBufferToCloudinary(file.buffer, {
        folder,
        public_id: undefined, // bisa set dari req.body mapping jika perlu
      });
      results.push({
        url: r.secure_url,
        public_id: r.public_id,
        width: r.width,
        height: r.height,
      });
    }

    return res
      .status(200)
      .json(envelope("success", { files: results }, "Upload successful"));
  } catch (err: any) {
    console.error("uploadMultipleImages error:", {
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
      // stringify non-enumerables and full object
      full: JSON.stringify(err, Object.getOwnPropertyNames(err)),
    });
    return res
      .status(500)
      .json(
        envelope("error", null, "Upload failed", [
          { message: err.message || "Unknown" },
        ])
      );
  }
}
