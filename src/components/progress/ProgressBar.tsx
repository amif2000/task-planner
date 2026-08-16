interface ProgressBarProps {
  value: number; // 0–100
  colorClass?: string;
  height?: string;
}

export default function ProgressBar({
  value,
  colorClass = 'bg-blue-500',
  height = 'h-3',
}: ProgressBarProps) {
  return (
    <div className={`w-full bg-slate-200 rounded-full overflow-hidden ${height}`}>
      <div
        className={`${height} ${colorClass} rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
