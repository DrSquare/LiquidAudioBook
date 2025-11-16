import { Check, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Stage {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
}

interface ProcessingStagesProps {
  currentStage: number;
  currentItem?: number;
  totalItems?: number;
}

export default function ProcessingStages({
  currentStage,
  currentItem,
  totalItems,
}: ProcessingStagesProps) {
  const stages: Stage[] = [
    {
      id: 'extract',
      label: 'Extracting Text',
      status: currentStage === 0 ? 'active' : currentStage > 0 ? 'completed' : 'pending',
    },
    {
      id: 'refine',
      label: 'Refining Content',
      status: currentStage === 1 ? 'active' : currentStage > 1 ? 'completed' : 'pending',
    },
    {
      id: 'generate',
      label: 'Generating Audio',
      status: currentStage === 2 ? 'active' : currentStage > 2 ? 'completed' : 'pending',
    },
  ];

  const progress = currentItem && totalItems ? (currentItem / totalItems) * 100 : 0;

  return (
    <div className="space-y-8" data-testid="processing-stages">
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => (
          <div key={stage.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-3 flex-1">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                  stage.status === 'active'
                    ? 'border-primary bg-primary/10 animate-pulse'
                    : stage.status === 'completed'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted bg-background'
                }`}
                data-testid={`stage-indicator-${stage.id}`}
              >
                {stage.status === 'completed' ? (
                  <Check className="w-6 h-6" />
                ) : stage.status === 'active' ? (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">{index + 1}</span>
                )}
              </div>
              <p
                className={`text-sm font-medium ${
                  stage.status === 'active' ? 'text-foreground' : 'text-muted-foreground'
                }`}
                data-testid={`text-stage-${stage.id}`}
              >
                {stage.label}
              </p>
            </div>
            {index < stages.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-4 mt-[-2.5rem] ${
                  stage.status === 'completed' ? 'bg-primary' : 'bg-border'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {currentStage === 0 && currentItem && totalItems && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" data-testid="progress-bar" />
          <p className="text-sm text-center text-muted-foreground font-mono" data-testid="text-progress">
            Processing image {currentItem} of {totalItems}
          </p>
        </div>
      )}
    </div>
  );
}
