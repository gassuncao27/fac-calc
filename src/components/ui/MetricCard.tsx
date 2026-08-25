interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
}

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
      <p className="text-[13px] font-medium text-slate-500">{label}</p>
      <p className="tabular mt-1.5 text-lg font-semibold leading-tight tracking-tight text-slate-900 sm:text-xl lg:text-2xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
