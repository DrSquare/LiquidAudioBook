import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { storage } from "./storage";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
});

export async function registerRoutes(app: Express): Promise<Server> {
  // POST /api/extract-text - Extract text from images using vision model
  app.post("/api/extract-text", upload.array("images", 50), async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No images provided" });
      }

      const files = req.files as Express.Multer.File[];
      const jobId = uuidv4();

      console.log(`[${jobId}] Starting text extraction for ${files.length} images`);

      // TODO: Replace with actual Liquid.ai Vision Model API call
      // For now, simulate text extraction
      const extractedTexts = await Promise.all(
        files.map(async (file, index) => {
          // Simulate extraction delay
          await new Promise((resolve) => setTimeout(resolve, 500));
          return {
            pageNumber: index + 1,
            text: `Mock extracted text from image ${index + 1}: ${file.originalname}`,
          };
        })
      );

      // Store job in database
      await storage.createJob({
        id: jobId,
        status: "extracting_completed",
        totalImages: files.length,
        currentImage: files.length,
      });

      res.json({
        jobId,
        status: "completed",
        extractedTexts,
      });

      console.log(`[${jobId}] Text extraction complete`);
    } catch (error) {
      console.error("Extract text error:", error);
      res.status(500).json({
        message: "Text extraction failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // POST /api/refine-text - Refine extracted text using text model
  app.post("/api/refine-text", async (req, res) => {
    try {
      const { jobId, extractedTexts } = req.body;

      if (!jobId || !extractedTexts || !Array.isArray(extractedTexts)) {
        return res.status(400).json({
          message: "Invalid request: jobId and extractedTexts required",
        });
      }

      console.log(`[${jobId}] Starting text refinement`);

      // Combine all extracted texts
      const combinedText = extractedTexts.join("\n\n");

      // TODO: Replace with actual Liquid.ai Text Extraction Model API call
      // For now, simulate text refinement
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const refinedText = `Mock refined text from ${extractedTexts.length} images: ${combinedText.substring(0, 50)}...`;

      // Update job status
      await storage.updateJob(jobId, {
        status: "refining_completed",
      });

      res.json({
        jobId,
        status: "completed",
        refinedText,
      });

      console.log(`[${jobId}] Text refinement complete`);
    } catch (error) {
      console.error("Refine text error:", error);
      res.status(500).json({
        message: "Text refinement failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // POST /api/generate-audio - Generate audio from text using TTS model
  app.post("/api/generate-audio", async (req, res) => {
    try {
      const { jobId, text } = req.body;

      if (!jobId || !text) {
        return res.status(400).json({
          message: "Invalid request: jobId and text required",
        });
      }

      console.log(`[${jobId}] Starting audio generation`);

      // TODO: Replace with actual Liquid.ai TTS Model API call
      // For now, simulate audio generation
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Create mock audio data
      const audioBuffer = Buffer.from("mock audio data");
      const audioUrl = await storage.saveAudio(jobId, audioBuffer);

      // Update job status
      await storage.updateJob(jobId, {
        status: "completed",
      });

      res.json({
        jobId,
        status: "completed",
        audioUrl,
      });

      console.log(`[${jobId}] Audio generation complete, URL: ${audioUrl}`);
    } catch (error) {
      console.error("Generate audio error:", error);
      res.status(500).json({
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

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);

  return httpServer;
}
