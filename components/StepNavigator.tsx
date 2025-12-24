import React, { useEffect, useRef } from 'react';
import { STEPS } from '../constants';
import { StepType } from '../types';
import { Check } from 'lucide-react';

interface StepNavigatorProps {
  currentStep: StepType;
  completedSteps: StepType[];
}

export const StepNavigator: React.FC<StepNavigatorProps> = ({ currentStep, completedSteps }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll logic
  useEffect(() => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    if (scrollContainerRef.current) {
       const btn = scrollContainerRef.current.children[currentIndex] as HTMLElement;
       if (btn) {
         const left = btn.offsetLeft - (scrollContainerRef.current.clientWidth / 2) + (btn.clientWidth / 2);
         scrollContainerRef.current.scrollTo({ left, behavior: 'smooth' });
       }
    }
  }, [currentStep]);

  return (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
      <div 
        ref={scrollContainerRef}
        className="flex overflow-x-auto whitespace-nowrap hide-scrollbar px-4 py-3 gap-3 md:justify-start"
      >
        {STEPS.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = completedSteps.includes(step.id);
          const isPast = STEPS.findIndex(s => s.id === currentStep) > index;

          return (
            <div
              key={step.id}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300
                ${isActive 
                  ? 'bg-green-50 border-green-200 text-green-700 shadow-sm' 
                  : isPast 
                    ? 'bg-white border-green-100 text-green-600'
                    : 'bg-white border-gray-100 text-gray-400'
                }
              `}
            >
              <div className={`
                w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border
                ${isActive 
                  ? 'bg-green-600 border-green-600 text-white' 
                  : isPast
                    ? 'bg-green-100 border-green-100 text-green-600'
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                }
              `}>
                {isPast ? <Check size={12} /> : index + 1}
              </div>
              <span className="text-sm font-bold">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
