import ProcessingStages from '../ProcessingStages';
import { useState, useEffect } from 'react';

export default function ProcessingStagesExample() {
  const [stage, setStage] = useState(0);
  const [item, setItem] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setItem((prev) => {
        if (prev >= 24) {
          setStage((s) => (s + 1) % 4);
          return 1;
        }
        return prev + 1;
      });
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8">
      <ProcessingStages currentStage={stage} currentItem={item} totalItems={24} />
    </div>
  );
}
