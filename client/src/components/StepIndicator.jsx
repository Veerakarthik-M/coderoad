// Reusable Step Indicator for multi-step forms
export default function StepIndicator({ steps, currentStep }) {
  return (
    <div className="step-indicator" role="list" aria-label="Registration steps">
      {steps.map((step, i) => {
        const isCompleted = i < currentStep;
        const isActive = i === currentStep;
        const state = isCompleted ? 'completed' : isActive ? 'active' : 'future';

        return (
          <div
            key={i}
            className={`step-indicator__item step-indicator__item--${state}`}
            role="listitem"
            aria-current={isActive ? 'step' : undefined}
          >
            <div className="step-indicator__dot">
              {isCompleted ? '✓' : i + 1}
            </div>
            <div className="step-indicator__label">{step}</div>
          </div>
        );
      })}
    </div>
  );
}
