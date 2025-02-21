type StepsListProps = {
  steps: string[];
};

export function StepsList({ steps }: StepsListProps) {
  return (
    <div className="space-y-1 my-2">
      {steps.map((step, stepIndex) => (
        <div key={`step-${stepIndex}`} className="flex justify-start p-2">
          <div className="p-3 rounded-lg bg-gray-100 text-gray-800 text-sm italic max-w-[80%] opacity-75">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">•</span>
              <span>{step}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}