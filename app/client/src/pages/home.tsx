import { useState } from 'react';
import LiquidBackground from '@/components/LiquidBackground';
import ImageUploadZone from '@/components/ImageUploadZone';
import ProcessingStages from '@/components/ProcessingStages';
import AudioPlayer from '@/components/AudioPlayer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, AlertCircle } from 'lucide-react';

type AppState = 'upload' | 'processing' | 'completed';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('upload');
  const [images, setImages] = useState<any[]>([]);
  const [processingStage, setProcessingStage] = useState(0);
  const [currentItem, setCurrentItem] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Helper function for progress polling
  const pollProgress = async (
    jobId: string,
    targetStage: number
  ): Promise<void> => {
    const maxAttempts = 120; // 2 minutes with 1s intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) throw new Error('Failed to fetch job status');

        const job = await res.json();
        setCurrentItem(job.currentItem || 1);

        if (job.stage > targetStage) {
          return; // Move to next stage
        }
      } catch (error) {
        console.warn('Progress polling error:', error);
      }

      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      attempts++;
    }

    throw new Error('Processing timeout');
  };

  const handleStartProcessing = async () => {
    try {
      console.log('Starting processing with', images.length, 'images');
      setAppState('processing');
      setError(null);
      setCurrentItem(1);

      // Step 1: Prepare form data with images
      const formData = new FormData();
      images.forEach((img) => {
        formData.append('images', img.file);
      });

      // Step 2: Extract text from images (Stage 0)
      console.log('Calling /api/extract-text');
      setProcessingStage(0);
      const extractRes = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData,
      });

      if (!extractRes.ok) {
        const err = await extractRes.json();
        throw new Error(err.message || 'Text extraction failed');
      }

      const { jobId: newJobId, extractedTexts } = await extractRes.json();
      setJobId(newJobId);
      console.log('Extraction complete, jobId:', newJobId);

      // Poll for extraction progress
      await pollProgress(newJobId, 0);

      // Step 3: Refine extracted text (Stage 1)
      console.log('Calling /api/refine-text');
      setProcessingStage(1);
      const refineRes = await fetch('/api/refine-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: newJobId,
          extractedTexts: extractedTexts.map((e: any) => e.text || e),
        }),
      });

      if (!refineRes.ok) {
        const err = await refineRes.json();
        throw new Error(err.message || 'Text refinement failed');
      }

      const { refinedText } = await refineRes.json();
      console.log('Refinement complete');
      await pollProgress(newJobId, 1);

      // Step 4: Generate audio from text (Stage 2)
      console.log('Calling /api/generate-audio');
      setProcessingStage(2);
      const audioRes = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: newJobId,
          text: refinedText,
        }),
      });

      if (!audioRes.ok) {
        const err = await audioRes.json();
        throw new Error(err.message || 'Audio generation failed');
      }

      const { audioUrl: newAudioUrl } = await audioRes.json();
      setAudioUrl(newAudioUrl);
      console.log('Audio generation complete, URL:', newAudioUrl);
      await pollProgress(newJobId, 2);

      // Success
      setAppState('completed');
      console.log('Processing complete!');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      setError(message);
      setAppState('upload');
      console.error('Processing error:', error);
    }
  };

  const handleDownload = async () => {
    if (!audioUrl) {
      setError('No audio available for download');
      return;
    }

    try {
      console.log('Downloading audio from:', audioUrl);
      const response = await fetch(audioUrl);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'audiobook.mp3';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
      console.log('Download complete');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Download failed';
      setError(message);
      console.error('Download error:', error);
    }
  };

  const handleReset = () => {
    setAppState('upload');
    setImages([]);
    setProcessingStage(0);
    setCurrentItem(1);
    setError(null);
    setJobId(null);
    setAudioUrl(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <LiquidBackground />
      
      <Card className="w-full max-w-6xl p-8 backdrop-blur-xl bg-card/80 shadow-2xl" data-testid="card-main-container">
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold" data-testid="text-app-title">
              LiquidAudio Reader
            </h1>
            <p className="text-muted-foreground" data-testid="text-app-subtitle">
              Convert book page images to audiobook in 3 simple steps
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-800 font-semibold">Error</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-700 font-semibold text-sm flex-shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          {appState === 'upload' && (
            <div className="space-y-6">
              <ImageUploadZone onImagesChange={setImages} />
              
              {images.length > 0 && (
                <div className="flex justify-center">
                  <Button
                    size="lg"
                    className="px-8 py-6 text-lg rounded-full"
                    onClick={handleStartProcessing}
                    data-testid="button-start-processing"
                  >
                    Start Processing
                  </Button>
                </div>
              )}
            </div>
          )}

          {appState === 'processing' && (
            <div className="py-12">
              <ProcessingStages
                currentStage={processingStage}
                currentItem={currentItem}
                totalItems={images.length}
              />
            </div>
          )}

          {appState === 'completed' && (
            <div className="space-y-8">
              <div className="flex items-center justify-center gap-3 text-primary">
                <CheckCircle2 className="w-8 h-8" />
                <p className="text-xl font-semibold" data-testid="text-success-message">
                  Audiobook ready!
                </p>
              </div>

              <AudioPlayer
                audioUrl={audioUrl || undefined}
                onDownload={handleDownload}
              />

              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  data-testid="button-create-new"
                >
                  Create Another Audiobook
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
