import { useState } from 'react';
import LiquidBackground from '@/components/LiquidBackground';
import ImageUploadZone from '@/components/ImageUploadZone';
import ProcessingStages from '@/components/ProcessingStages';
import AudioPlayer from '@/components/AudioPlayer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

type AppState = 'upload' | 'processing' | 'completed';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('upload');
  const [images, setImages] = useState<any[]>([]);
  const [processingStage, setProcessingStage] = useState(0);
  const [currentItem, setCurrentItem] = useState(1);

  const handleStartProcessing = () => {
    console.log('Starting processing with', images.length, 'images');
    setAppState('processing');
    
    // Simulate processing stages
    let stage = 0;
    let item = 1;
    const interval = setInterval(() => {
      item++;
      if (item > images.length) {
        stage++;
        item = 1;
        if (stage > 2) {
          clearInterval(interval);
          setAppState('completed');
          return;
        }
      }
      setProcessingStage(stage);
      setCurrentItem(item);
    }, 300);
  };

  const handleDownload = () => {
    console.log('Downloading audio file');
  };

  const handleReset = () => {
    setAppState('upload');
    setImages([]);
    setProcessingStage(0);
    setCurrentItem(1);
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
                audioUrl="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
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
