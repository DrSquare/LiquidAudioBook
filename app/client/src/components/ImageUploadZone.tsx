import { Upload, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useState, useRef } from 'react';

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  pageNumber: number;
}

interface ImageUploadZoneProps {
  onImagesChange?: (images: UploadedImage[]) => void;
}

export default function ImageUploadZone({ onImagesChange }: ImageUploadZoneProps) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const newImages: UploadedImage[] = [];
    const currentCount = images.length;

    Array.from(files).forEach((file, index) => {
      if (currentCount + newImages.length >= 50) return;
      if (!file.type.startsWith('image/')) return;
      if (file.size > 5 * 1024 * 1024) return;

      newImages.push({
        id: `${Date.now()}-${index}`,
        file,
        preview: URL.createObjectURL(file),
        pageNumber: currentCount + newImages.length + 1,
      });
    });

    const updatedImages = [...images, ...newImages];
    setImages(updatedImages);
    onImagesChange?.(updatedImages);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const removeImage = (id: string) => {
    const updatedImages = images.filter((img) => img.id !== id).map((img, idx) => ({
      ...img,
      pageNumber: idx + 1,
    }));
    setImages(updatedImages);
    onImagesChange?.(updatedImages);
  };

  if (images.length === 0) {
    return (
      <Card
        className={`h-64 border-2 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer hover-elevate transition-all ${
          isDragging ? 'border-primary scale-105' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        data-testid="upload-zone-empty"
      >
        <Upload className="w-12 h-12 text-muted-foreground" />
        <div className="text-center">
          <p className="text-base font-medium" data-testid="text-upload-primary">
            Drop book page images here
          </p>
          <p className="text-sm text-muted-foreground" data-testid="text-upload-secondary">
            or click to browse (JPG, PNG up to 5MB, max 50 images)
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={handleFileChange}
          data-testid="input-file-upload"
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" data-testid="text-image-count">
          {images.length} / 50 images uploaded
        </p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {images.map((image) => (
          <Card
            key={image.id}
            className="relative aspect-square overflow-hidden group hover-elevate"
            data-testid={`card-image-${image.id}`}
          >
            <img
              src={image.preview}
              alt={`Page ${image.pageNumber}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="destructive"
                onClick={() => removeImage(image.id)}
                data-testid={`button-remove-${image.id}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              Page {image.pageNumber}
            </div>
          </Card>
        ))}
        {images.length < 50 && (
          <Card
            className="aspect-square border-2 border-dashed flex items-center justify-center cursor-pointer hover-elevate"
            onClick={handleClick}
            data-testid="button-add-more"
          >
            <Plus className="w-8 h-8 text-muted-foreground" />
          </Card>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleFileChange}
        data-testid="input-file-upload-more"
      />
    </div>
  );
}
