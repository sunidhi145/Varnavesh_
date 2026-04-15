import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import type { Express } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { confirmStripePayment, createStripeCheckoutSession, ensureCommerceSchema } from "./commerce.js";
import { serverConfig } from "./config.js";
import { ApiError } from "./errors.js";
import { closeNeo4jDriver, verifyNeo4jConnection } from "./neo4j.js";
import {
  createConsultationBooking,
  createContactSubmission,
  createCustomDesignRequest,
  fetchProducts,
} from "./repository.js";
import {
  confirmOrderPaymentPayloadSchema,
  consultationPayloadSchema,
  contactPayloadSchema,
  createCheckoutSessionPayloadSchema,
  customDesignPayloadSchema,
  validateUploadedFiles,
} from "./validation.js";

const app = express();
const maxFileSize = 5 * 1024 * 1024;

function ensureDirectoryExists(targetPath: string) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, "-").toLowerCase();
}

async function cleanupRequestUploadDirectory(requestId?: string) {
  if (!requestId) {
    return;
  }

  const targetPath = path.join(serverConfig.uploadsDir, "custom-design-requests", requestId);
  await fs.promises.rm(targetPath, { recursive: true, force: true });
}

ensureDirectoryExists(serverConfig.uploadsDir);

app.use(
  cors({
    origin(origin, callback) {
      const normalizedOrigin = origin?.replace(/\/$/, "");

      if (!normalizedOrigin || serverConfig.allowedFrontendOrigins.includes(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
  }),
);

app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(serverConfig.uploadsDir));

const storage = multer.diskStorage({
  destination(req, _file, callback) {
    const requestId = (req as Request & { uploadRequestId?: string }).uploadRequestId ?? randomUUID();
    const requestUploadDir = path.join(serverConfig.uploadsDir, "custom-design-requests", requestId);
    ensureDirectoryExists(requestUploadDir);
    callback(null, requestUploadDir);
  },
  filename(_req, file, callback) {
    const extension = path.extname(file.originalname) || ".jpg";
    const baseName = path.basename(file.originalname, extension);
    callback(null, `${Date.now()}-${randomUUID()}-${sanitizeFileName(baseName)}${extension.toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSize,
    files: 4,
  },
  fileFilter(_req, file, callback) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      callback(new ApiError("Only JPG, PNG, or WEBP images are allowed."));
      return;
    }

    callback(null, true);
  },
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/products", async (req, res, next) => {
  try {
    const type =
      req.query.type === "outfit" || req.query.type === "accessory"
        ? (req.query.type as "outfit" | "accessory")
        : undefined;
    const products = await fetchProducts(type);
    res.json({ products });
  } catch (error) {
    next(error);
  }
});

app.get("/api/accessories", async (_req, res, next) => {
  try {
    const products = await fetchProducts("accessory");
    res.json({ products });
  } catch (error) {
    next(error);
  }
});

app.post("/api/checkout/session", async (req, res, next) => {
  try {
    const payload = createCheckoutSessionPayloadSchema.parse(req.body);
    const result = await createStripeCheckoutSession(payload);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/orders/confirm-payment", async (req, res, next) => {
  try {
    const payload = confirmOrderPaymentPayloadSchema.parse(req.body);
    const order = await confirmStripePayment(payload.sessionId);
    res.json({ order });
  } catch (error) {
    next(error);
  }
});

app.post("/api/contacts", async (req, res, next) => {
  try {
    const payload = contactPayloadSchema.parse(req.body);
    const result = await createContactSubmission(payload);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/consultations", async (req, res, next) => {
  try {
    const payload = consultationPayloadSchema.parse(req.body);
    const result = await createConsultationBooking(payload);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/custom-design-requests",
  (req, _res, next) => {
    (req as Request & { uploadRequestId?: string }).uploadRequestId = randomUUID();
    next();
  },
  upload.array("images", 4),
  async (req, res, next) => {
    const uploadRequestId = (req as Request & { uploadRequestId?: string }).uploadRequestId;

    try {
      const payload = customDesignPayloadSchema.parse(req.body);
      const files = (req.files as Express.Multer.File[]) ?? [];

      validateUploadedFiles(files);

      const result = await createCustomDesignRequest(uploadRequestId ?? randomUUID(), payload, files);
      res.status(201).json(result);
    } catch (error) {
      await cleanupRequestUploadDirectory(uploadRequestId);
      next(error);
    }
  },
);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: error.issues[0]?.message ?? "Please review the submitted form values.",
    });
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "Each image must be 5 MB or smaller." });
      return;
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      res.status(400).json({ error: "You can upload up to 4 reference images." });
      return;
    }
  }

  const message = error instanceof Error ? error.message : "Unexpected server error.";
  res.status(500).json({ error: message });
});

const server = app.listen(serverConfig.port, async () => {
  try {
    await verifyNeo4jConnection();
    await ensureCommerceSchema();
    console.log(`Neo4j backend listening on http://localhost:${serverConfig.port}`);
  } catch (error) {
    console.error("Failed to connect to Neo4j.", error);
    server.close(async () => {
      await closeNeo4jDriver();
      process.exit(1);
    });
  }
});

async function shutdown() {
  server.close(async () => {
    await closeNeo4jDriver();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
