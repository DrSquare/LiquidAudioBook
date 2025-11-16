import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { storage } from "./storage";
import { flaskClient } from "./services/flask-client";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
});

export async function registerRoutes(app: Express): Promise<Server> {
  // POST /api/extract-text - Extract text from images using Flask ML service
  app.post("/api/extract-text", upload.array("images", 50), async (req, res) => {
    let jobId: string = "";
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No images provided" });
      }

      const files = req.files as Express.Multer.File[];

      // Create job record
      const job = await storage.createJob({
        status: "extracting",
        totalImages: files.length,
        currentImage: 0,
      });
      jobId = (job.id as unknown as string);

      console.log(
        `[${jobId}] Starting text extraction for ${files.length} images using Flask ML service`
      );

      // Check Flask service health
      const isHealthy = await flaskClient.isHealthy();
      if (!isHealthy) {
        await storage.updateJob(jobId, { status: "error" });
        return res.status(503).json({
          message: "Flask ML service is unavailable",
          jobId,
        });
      }

      // Call Flask backend for text extraction
      const imageBuffers = files.map((file) => file.buffer);
      const flaskResponse = await flaskClient.extractText(jobId, imageBuffers);

      // Update job status
      await storage.updateJob(jobId, {
        status: "extracting_completed",
        currentImage: files.length,
      });

      console.log(`[${jobId}] Text extraction completed via Flask`);

      res.json({
        jobId,
        status: "completed",
        extractedTexts: flaskResponse.extractedTexts,
      });
    } catch (error) {
      console.error(`[${jobId}] Extract text error:`, error);
      if (jobId) {
        await storage.updateJob(jobId, { status: "error" });
      }
      res.status(500).json({
        jobId,
        message: "Text extraction failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // POST /api/refine-text - Refine extracted text using Flask ML service
  app.post("/api/refine-text", async (req, res) => {
    let jobId: string = "";
    try {
      const { jobId: reqJobId, extractedTexts, refinementInstructions } = req.body;
      jobId = reqJobId;

      if (!jobId || !extractedTexts || !Array.isArray(extractedTexts)) {
        return res.status(400).json({
          message: "Invalid request: jobId and extractedTexts required",
        });
      }

      console.log(
        `[${jobId}] Starting text refinement using Flask ML service`
      );

      // Update job status
      await storage.updateJob(jobId, {
        status: "refining",
      });

      // Call Flask backend for text refinement
      const flaskResponse = await flaskClient.refineText(
        jobId,
        extractedTexts,
        refinementInstructions
      );

      // Update job status
      await storage.updateJob(jobId, {
        status: "refining_completed",
      });

      console.log(`[${jobId}] Text refinement completed via Flask`);

      res.json({
        jobId,
        status: "completed",
        refinedText: flaskResponse.refinedText,
      });
    } catch (error) {
      console.error("Refine text error:", error);
      if (jobId) {
        await storage.updateJob(jobId, { status: "error" });
      }
      res.status(500).json({
        jobId,
        message: "Text refinement failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // POST /api/generate-audio - Generate audio from text using Flask ML service
  app.post("/api/generate-audio", async (req, res) => {
    let jobId: string = "";
    try {
      const { jobId: reqJobId, text, voice, rate } = req.body;
      jobId = reqJobId;

      if (!jobId || !text) {
        return res.status(400).json({
          message: "Invalid request: jobId and text required",
        });
      }

      console.log(`[${jobId}] Starting audio generation using Flask ML service`);

      // Update job status
      await storage.updateJob(jobId, {
        status: "generating",
      });

      // Call Flask backend for audio generation
      const flaskResponse = await flaskClient.generateAudio(
        jobId,
        text,
        voice || "default",
        rate || 150
      );

      // Decode base64 audio data and save
      const audioBuffer = Buffer.from(flaskResponse.audioData, "base64");
      const audioUrl = await storage.saveAudio(jobId, audioBuffer);

      // Update job status
      await storage.updateJob(jobId, {
        status: "completed",
      });

      console.log(`[${jobId}] Audio generation completed via Flask, URL: ${audioUrl}`);

      res.json({
        jobId,
        status: "completed",
        audioUrl,
      });
    } catch (error) {
      console.error("Generate audio error:", error);
      if (jobId) {
        await storage.updateJob(jobId, { status: "error" });
      }
      res.status(500).json({
        jobId,
        message: "Audio generation failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // GET /api/jobs/:jobId - Get job status
  app.get("/api/jobs/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;

      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Determine current stage based on status
      let stage = 0;
      if (job.status === "refining_completed" || job.status === "generating") {
        stage = 1;
      } else if (job.status === "completed") {
        stage = 2;
      }

      res.json({
        jobId,
        stage,
        currentItem: job.currentImage || 1,
        totalItems: job.totalImages || 1,
        status: job.status,
      });
    } catch (error) {
      console.error("Get job error:", error);
      res.status(500).json({ message: "Failed to fetch job status" });
    }
  });

  // GET /api/audio/:jobId - Download audio file
  app.get("/api/audio/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;

      const audioBuffer = await storage.getAudio(jobId);
      if (!audioBuffer) {
        return res.status(404).json({ message: "Audio not found" });
      }

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="audiobook-${jobId}.mp3"`
      );
      res.send(audioBuffer);

      console.log(`[${jobId}] Audio downloaded`);
    } catch (error) {
      console.error("Download audio error:", error);
      res.status(500).json({ message: "Download failed" });
    }
  });

  // Health check endpoint - includes Flask ML service status
  app.get("/api/health", async (req, res) => {
    try {
      const flaskHealthy = await flaskClient.isHealthy();
      const flaskStatus = flaskHealthy
        ? "connected"
        : "unavailable";

      res.json({
        status: flaskHealthy ? "ok" : "degraded",
        timestamp: new Date().toISOString(),
        services: {
          express: "ok",
          flask: flaskStatus,
        },
      });
    } catch (error) {
      console.error("Health check error:", error);
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Unable to verify service health",
      });
    }
  });

  // Flask ML service status endpoint
  app.get("/api/flask-status", async (req, res) => {
    try {
      const status = await flaskClient.getServerStatus();
      res.json(status);
    } catch (error) {
      res.status(503).json({
        error: "Flask ML service unavailable",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
