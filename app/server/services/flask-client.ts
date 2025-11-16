/**
 * Flask Backend API Client
 * Handles communication with Python Flask ML service running on port 5001
 * Manages requests for text extraction, refinement, and audio generation
 */

interface FlaskConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}

interface ExtractTextRequest {
  jobId: string;
  images: string[]; // base64 encoded images
}

interface ExtractTextResponse {
  jobId: string;
  status: string;
  extractedTexts: Array<{
    pageNumber: number;
    text: string;
    processingTimeMs: number;
  }>;
}

interface RefineTextRequest {
  jobId: string;
  extractedTexts: string[];
  refinementInstructions?: string;
}

interface RefineTextResponse {
  jobId: string;
  status: string;
  refinedText: string;
  processingTimeMs: number;
}

interface GenerateAudioRequest {
  jobId: string;
  text: string;
  voice?: string;
  rate?: number;
}

interface GenerateAudioResponse {
  jobId: string;
  status: string;
  audioData: string; // base64 encoded audio
  durationMs: number;
  processingTimeMs: number;
}

interface ServerStatusResponse {
  status: string;
  ollama: {
    isRunning: boolean;
    models: {
      vision: { name: string; loaded: boolean };
      text: { name: string; loaded: boolean };
    };
  };
}

export class FlaskClient {
  private config: FlaskConfig;
  private retryDelayMs: number = 1000;

  constructor(
    baseUrl: string = "http://localhost:5001",
    timeout: number = 120000,
    retries: number = 3
  ) {
    this.config = { baseUrl, timeout, retries };
  }

  /**
   * Check if Flask backend is available and healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response = (await this.makeRequest("GET", "/api/health")) as {
        status: string;
      };
      return response.status === "ok";
    } catch (error) {
      console.error("Flask health check failed:", error);
      return false;
    }
  }

  /**
   * Get detailed server status including Ollama and models
   */
  async getServerStatus(): Promise<ServerStatusResponse> {
    try {
      const response = (await this.makeRequest(
        "GET",
        "/api/status"
      )) as ServerStatusResponse;
      return response;
    } catch (error) {
      console.error("Failed to get Flask server status:", error);
      throw new Error("Unable to connect to Flask ML service");
    }
  }

  /**
   * Extract text from images using vision model
   */
  async extractText(
    jobId: string,
    images: Buffer[]
  ): Promise<ExtractTextResponse> {
    try {
      // Convert buffers to base64
      const base64Images = images.map((img) => img.toString("base64"));

      const request = {
        jobId,
        images: base64Images,
      };

      const response = (await this.makeRequest(
        "POST",
        "/api/extract-text",
        request as Record<string, unknown>
      )) as ExtractTextResponse;

      return response;
    } catch (error) {
      console.error(`[${jobId}] Text extraction failed:`, error);
      throw new Error(
        `Text extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Refine extracted text using text model
   */
  async refineText(
    jobId: string,
    extractedTexts: string[],
    instructions?: string
  ): Promise<RefineTextResponse> {
    try {
      const request = {
        jobId,
        extractedTexts,
        refinementInstructions: instructions,
      };

      const response = (await this.makeRequest(
        "POST",
        "/api/refine-text",
        request as Record<string, unknown>
      )) as RefineTextResponse;

      return response;
    } catch (error) {
      console.error(`[${jobId}] Text refinement failed:`, error);
      throw new Error(
        `Text refinement failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Generate audio from text using TTS
   */
  async generateAudio(
    jobId: string,
    text: string,
    voice: string = "default",
    rate: number = 150
  ): Promise<GenerateAudioResponse> {
    try {
      const request = {
        jobId,
        text,
        voice,
        rate,
      };

      const response = (await this.makeRequest(
        "POST",
        "/api/generate-audio",
        request as Record<string, unknown>
      )) as GenerateAudioResponse;

      return response;
    } catch (error) {
      console.error(`[${jobId}] Audio generation failed:`, error);
      throw new Error(
        `Audio generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Generic HTTP request handler with retry logic
   */
  private async makeRequest(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>,
    attempt: number = 1
  ): Promise<unknown> {
    try {
      const url = `${this.config.baseUrl}${endpoint}`;

      const options: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout
      );

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await response.text();
          throw new Error(
            `Flask API returned ${response.status}: ${error.substring(0, 200)}`
          );
        }

        // For binary responses (audio), return buffer
        if (
          endpoint.includes("audio") &&
          response.headers.get("content-type")?.includes("audio")
        ) {
          const buffer = await response.arrayBuffer();
          return { data: Buffer.from(buffer) };
        }

        // For JSON responses
        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      // Retry logic
      if (attempt < this.config.retries) {
        const waitTime = this.retryDelayMs * attempt;
        console.warn(
          `Request to ${endpoint} failed (attempt ${attempt}/${this.config.retries}), retrying in ${waitTime}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return this.makeRequest(method, endpoint, body, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Check if Ollama server is running and models are loaded
   */
  async checkOllamaModels(): Promise<boolean> {
    try {
      const status = await this.getServerStatus();
      return (
        status.ollama.isRunning &&
        status.ollama.models.vision.loaded &&
        status.ollama.models.text.loaded
      );
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const flaskClient = new FlaskClient(
  process.env.FLASK_BASE_URL || "http://localhost:5001",
  parseInt(process.env.FLASK_TIMEOUT || "120000", 10),
  parseInt(process.env.FLASK_RETRIES || "3", 10)
);
