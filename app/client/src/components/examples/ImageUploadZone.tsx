import ImageUploadZone from '../ImageUploadZone';

export default function ImageUploadZoneExample() {
  return (
    <div className="p-8">
      <ImageUploadZone onImagesChange={(images) => console.log('Images changed:', images.length)} />
    </div>
  );
}
