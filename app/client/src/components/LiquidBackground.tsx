export default function LiquidBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-liquid-blob-1" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-liquid-blob-2" />
      <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-chart-2/15 rounded-full blur-3xl animate-liquid-blob-3" />
    </div>
  );
}
