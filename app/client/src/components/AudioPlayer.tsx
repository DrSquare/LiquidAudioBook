import { Play, Pause, Square, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useState, useRef, useEffect } from 'react';

interface AudioPlayerProps {
  audioUrl?: string;
  onDownload?: () => void;
}

export default function AudioPlayer({ audioUrl, onDownload }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6" data-testid="audio-player">
      <audio ref={audioRef} src={audioUrl} />

      <div className="flex items-center justify-center gap-4">
        <Button
          size="icon"
          variant="outline"
          onClick={handleStop}
          data-testid="button-stop"
        >
          <Square className="w-5 h-5" />
        </Button>

        <Button
          size="icon"
          className="w-16 h-16"
          onClick={togglePlay}
          data-testid="button-play-pause"
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
        </Button>

        <Button
          size="icon"
          variant="outline"
          onClick={onDownload}
          data-testid="button-download"
        >
          <Download className="w-5 h-5" />
        </Button>
      </div>

      <div className="space-y-2 px-8">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="cursor-pointer"
          data-testid="slider-seek"
        />
        <div className="flex items-center justify-between text-sm font-mono text-muted-foreground">
          <span data-testid="text-current-time">{formatTime(currentTime)}</span>
          <span data-testid="text-total-time">{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
