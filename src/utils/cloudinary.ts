import { v2 as cloudinaryV2, UploadApiResponse } from "cloudinary";
import dotenv from "dotenv";
//import streamifier from "streamifier"; //tidak dipakai  sudah usang

dotenv.config();
cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
  secure: true,
});

// //MOCK TEMPPRARY FOR TESTING ONLY!
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

// src/utils/cloudinary.ts
import axios from "axios";
import FormData from "form-data";
import { Readable } from "stream";
import crypto from "crypto";
import https from "https";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const API_KEY = process.env.CLOUDINARY_API_KEY || "";
const API_SECRET = process.env.CLOUDINARY_API_SECRET || "";
const DEFAULT_FOLDER = process.env.CLOUDINARY_UPLOAD_FOLDER || "uploads";

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.warn(
    "[CLOUDINARY] Missing credentials in env. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
  );
}

function makeSignature(paramsToSign: Record<string, any>, apiSecret: string) {
  const keys = Object.keys(paramsToSign).sort();
  const str = keys.map((k) => `${k}=${paramsToSign[k]}`).join("&");
  return crypto
    .createHash("sha1")
    .update(str + apiSecret)
    .digest("hex");
}

async function postFormWithAgent(
  url: string,
  form: FormData,
  timeout = 30000,
  httpsAgent?: https.Agent
) {
  return axios.post(url, form, {
    headers: { ...form.getHeaders() },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    httpsAgent,
    timeout,
  });
}

/**
 * Upload buffer to Cloudinary with retry/backoff.
 * options: folder, public_id
 */
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

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  const httpsAgent = new https.Agent({ family: 4, keepAlive: true }); // force IPv4 for reliability on dev host

  // Retry/backoff parameters
  const maxAttempts = 3;
  const baseDelayMs = 500; // initial backoff
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await postFormWithAgent(url, form, 30000, httpsAgent);
      return res.data;
    } catch (err: any) {
      // If last attempt, rethrow with normalized error
      const isLast = attempt === maxAttempts;
      const info = {
        attempt,
        message: err?.message,
        code: err?.code,
        status: err?.response?.status,
        data: err?.response?.data,
      };
      console.warn(`[CLOUDINARY] upload attempt ${attempt} failed:`, info);

      if (isLast) {
        console.error("[CLOUDINARY] upload final failure:", info);
        throw err;
      }
      // exponential backoff with jitter
      const jitter = Math.floor(Math.random() * 100);
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
      await new Promise((r) => setTimeout(r, delay));
      // IMPORTANT: recreate form stream before retry - FormData stream is consumed on first attempt.
      // The easiest approach: rebuild the FormData on each attempt
      // Rebuild form
      const newForm = new FormData();
      const newStream = Readable.from(buffer);
      newForm.append("file", newStream, { filename: `${Date.now()}.jpg` });
      newForm.append("api_key", API_KEY);
      newForm.append("timestamp", String(Math.floor(Date.now() / 1000)));
      // recompute signature due to new timestamp
      const newParamsToSign: Record<string, any> = {
        timestamp: Math.floor(Date.now() / 1000),
      };
      if (folder) newParamsToSign.folder = folder;
      if (options.public_id) newParamsToSign.public_id = options.public_id;
      newForm.append("signature", makeSignature(newParamsToSign, API_SECRET));
      if (folder) newForm.append("folder", folder);
      if (options.public_id) newForm.append("public_id", options.public_id);
      newForm.append("resource_type", "image");
      // replace form reference for next loop iteration
      // @ts-ignore
      form = newForm;
    }
  }

  // unreachable
  throw new Error("Unexpected cloudinary upload flow");
};
