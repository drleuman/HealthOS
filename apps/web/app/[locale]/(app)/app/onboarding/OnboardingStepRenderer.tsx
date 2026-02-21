'use client';

import type { StepConfig, OnboardingData, SelectOneStep, SelectManyStep, MultiFieldStep } from './onboarding.types';

// ─────────────────────────────────────────────────────────────────────────────
// Shared style tokens — mirrors existing class conventions
// ─────────────────────────────────────────────────────────────────────────────

const BTN_BASE =
    'w-full px-4 py-3 rounded-lg border text-left text-sm transition-all duration-150';
const BTN_ACTIVE = 'border-secondary bg-secondary/10 text-primary';
const BTN_IDLE = 'border-border bg-transparent text-secondary hover:border-tertiary';

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

function toggleArrayItem(array: string[], item: string): string[] {
    return array.includes(item)
        ? array.filter((i) => i !== item)
        : [...array, item];
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-renderers — one per StepType, no dataset-specific logic
// ─────────────────────────────────────────────────────────────────────────────

function SelectOneRenderer({
    step,
    data,
    setData,
}: {
    step: SelectOneStep;
    data: OnboardingData;
    setData: (d: OnboardingData) => void;
}) {
    const current = data[step.field] as string;
    return (
        <div className="pt-4 space-y-3">
            <label className="label">Seleccionar Dataset de Enfoque</label>
            <div className="grid grid-cols-1 gap-2">
                {step.options.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => setData({ ...data, [step.field]: opt.value })}
                        className={`px-4 py-3 rounded-lg border text-left text-sm transition-all duration-150 flex items-center gap-3 ${current === opt.value ? BTN_ACTIVE : BTN_IDLE}`}
                    >
                        {opt.icon}
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

function SelectManyRenderer({
    step,
    data,
    setData,
}: {
    step: SelectManyStep;
    data: OnboardingData;
    setData: (d: OnboardingData) => void;
}) {
    const current = (data[step.field] as string[]) ?? [];
    return (
        <div className="space-y-2">
            {step.options.map((option) => {
                const active = current.includes(option);
                return (
                    <button
                        key={option}
                        onClick={() =>
                            setData({
                                ...data,
                                [step.field]: toggleArrayItem(current, option),
                            })
                        }
                        className={`${BTN_BASE} ${active ? BTN_ACTIVE : BTN_IDLE}`}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className={`w-3 h-3 border ${active ? 'bg-secondary border-secondary' : 'border-tertiary'}`}
                            />
                            <span>{option}</span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

function MultiFieldRenderer({
    step,
    data,
    setData,
}: {
    step: MultiFieldStep;
    data: OnboardingData;
    setData: (d: OnboardingData) => void;
}) {
    return (
        <div className="space-y-4">
            {step.fields.map(({ field, label, inputType }) => (
                <div key={field as string} className="space-y-2">
                    <label className="label">{label}</label>
                    <input
                        type={inputType}
                        value={data[field] as string}
                        onChange={(e) =>
                            setData({ ...data, [field]: e.target.value })
                        }
                        className="input"
                    />
                </div>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public component — dispatches to the correct sub-renderer by step.type
// ─────────────────────────────────────────────────────────────────────────────

interface OnboardingStepRendererProps {
    step: StepConfig;
    data: OnboardingData;
    setData: (d: OnboardingData) => void;
}

export function OnboardingStepRenderer({
    step,
    data,
    setData,
}: OnboardingStepRendererProps): React.ReactElement | null {
    switch (step.type) {
        case 'selectOne':
            return <SelectOneRenderer step={step} data={data} setData={setData} />;
        case 'selectMany':
            return <SelectManyRenderer step={step} data={data} setData={setData} />;
        case 'multiField':
            return <MultiFieldRenderer step={step} data={data} setData={setData} />;
        case 'info':
            return null;
    }
}
