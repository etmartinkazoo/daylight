const OPTIONS = [
  { value: "1h", label: "1h" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
];

export default function PeriodSelect({ value = "24h", onChange }) {
  return (
    <div className="period-select">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          className={`period-btn${value === opt.value ? " active" : ""}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
