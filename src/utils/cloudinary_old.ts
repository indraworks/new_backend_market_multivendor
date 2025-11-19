import { v2 as cloudinaryV2, UploadApiResponse } from "cloudinary";
import dotenv from "dotenv";
//import streamifier from "streamifier"; //tidak dipakai  sudah usang

import axios from "axios";
import FormData from "form-data";
import { Readable } from "stream";
import crypto from "crypto";
import https from "https";

dotenv.config();
cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
  secure: true,
});

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const API_KEY = process.env.CLOUDINARY_API_KEY || "";
const API_SECRET = process.env.CLOUDINARY_API_SECRET || "";
const DEFAULT_FOLDER = process.env.CLOUDINARY_UPLOAD_FOLDER || "uploads";

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.warn(
    "[CLOUDINARY] Missing credentials in env. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
  );
}

//MOCK TEMPPRARY FOR TESTING ONLY!
// export const uploadBufferToCloudinary = async (
//   buffer: Buffer,
//   options: any = {}
// ) => {
//   // pretend upload succeeded
//   return Promise.resolve({
//     secure_url: `https://res.cloudinary.fake/${
//       options.folder || "uploads"
//     }/${Date.now()}.jpg`,
//     public_id: `fake/${Date.now()}`,
//     width: 100,
//     height: 100,
//     // include other fields if needed
//   });
// };
function makeSignature(paramsToSign: Record<string, any>, apiSecret: string) {
  const keys = Object.keys(paramsToSign).sort();
  const str = keys.map((k) => `${k}=${paramsToSign[k]}`).join("&");
  return crypto
    .createHash("sha1")
    .update(str + apiSecret)
    .digest("hex");
}

export const uploadBufferToCloudinary = async (
  buffer: Buffer,
  options: { folder?: string; public_id?: string } = {}
): Promise<any> => {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    throw new Error("Cloudinary credentials not configured");
  }

  const folder = options.folder || DEFAULT_FOLDER;
  const timestamp = Math.floor(Date.now() / 1000);

  const paramsToSign: Record<string, any> = { timestamp };
  if (folder) paramsToSign.folder = folder;
  if (options.public_id) paramsToSign.public_id = options.public_id;

  const signature = makeSignature(paramsToSign, API_SECRET);

  const form = new FormData();
  const stream = Readable.from(buffer);
  form.append("file", stream, { filename: `${Date.now()}.jpg` });
  form.append("api_key", API_KEY);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  if (folder) form.append("folder", folder);
  if (options.public_id) form.append("public_id", options.public_id);
  form.append("resource_type", "image");

  const httpsAgent = new https.Agent({ family: 4, keepAlive: true });
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  try {
    const res = await axios.post(url, form, {
      headers: { ...form.getHeaders() },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      httpsAgent,
      timeout: 30000,
    });
    return res.data;
  } catch (err: any) {
    console.error("[CLOUDINARY][HTTP] upload error:", {
      message: err?.message,
      code: err?.code,
      status: err?.response?.status,
      data: err?.response?.data,
    });
    throw err;
  }
};
