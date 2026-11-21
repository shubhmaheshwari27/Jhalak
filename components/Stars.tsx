"use client";

export default function Stars({
  value,
  onChange,
  label,
}: {
  value: number | null;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div>
      <span className="block text-[11px] text-stone-600">{label}</span>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${label} ${n} of 5`}
            onClick={() => onChange(n)}
            className={`flex-1 py-0.5 text-lg leading-none ${value && n <= value ? "text-amber-500" : "text-stone-300"}`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}
