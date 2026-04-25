"use client";

import * as Slider from "@radix-ui/react-slider";
import * as Switch from "@radix-ui/react-switch";
import * as RadioGroup from "@radix-ui/react-radio-group";

export function SliderRow({
  label,
  minLabel,
  maxLabel,
  value,
  onChange,
}: {
  label: string;
  minLabel: string;
  maxLabel: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-ink-muted">
          {label}
        </p>
        <span className="font-sans text-[10px] tracking-[0.08em] text-ink-faint">
          {Math.round(value * 100)}%
        </span>
      </div>
      <Slider.Root
        className="relative flex h-5 w-full touch-none select-none items-center"
        min={0}
        max={1}
        step={0.01}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      >
        <Slider.Track className="relative h-px w-full grow bg-rule">
          <Slider.Range className="absolute h-px bg-ochre" />
        </Slider.Track>
        <Slider.Thumb
          className="block h-3 w-3 rounded-full border border-ochre bg-paper focus-visible:outline-ochre"
          aria-label={label}
        />
      </Slider.Root>
      <div className="flex items-center justify-between font-sans text-[10px] uppercase tracking-[0.2em] text-ink-faint">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

export function SwitchRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="flex flex-col gap-1">
        <p className="font-sans text-[13px] text-ink">{label}</p>
        <p className="max-w-[32ch] font-sans text-[12px] text-ink-muted">{description}</p>
      </div>
      <Switch.Root
        checked={checked}
        onCheckedChange={onChange}
        className="relative mt-1 h-[22px] w-[40px] flex-shrink-0 rounded-full border border-rule bg-paper-deep transition-colors duration-200 ease-editorial data-[state=checked]:border-ochre data-[state=checked]:bg-ochre/20 focus-visible:outline-ochre"
        aria-label={label}
      >
        <Switch.Thumb className="block h-[16px] w-[16px] translate-x-[2px] rounded-full bg-ink-muted transition-transform duration-200 ease-editorial data-[state=checked]:translate-x-[20px] data-[state=checked]:bg-ochre" />
      </Switch.Root>
    </div>
  );
}

export function RadioRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-ink-muted">
        {label}
      </p>
      <RadioGroup.Root
        value={value}
        onValueChange={onChange}
        className="grid grid-cols-3 gap-3"
      >
        {options.map((o) => (
          <RadioGroup.Item
            key={o.value}
            value={o.value}
            className="group flex h-16 items-center justify-center border border-rule bg-paper text-center font-sans text-[12px] text-ink-muted transition-colors duration-200 ease-editorial hover:border-ink/20 hover:text-ink data-[state=checked]:border-ochre data-[state=checked]:text-ink focus-visible:outline-ochre"
          >
            <span className="font-sans text-[11px] uppercase tracking-[0.18em]">
              {o.label}
            </span>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </div>
  );
}
