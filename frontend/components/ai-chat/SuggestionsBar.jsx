export default function SuggestionsBar({ suggestions = [], onSelect }) {
  if (suggestions.length === 0) return null;
  return (
    <div className="suggestions">
      {suggestions.map((s, i) => (
        <button key={i} className="suggestion" onClick={() => onSelect?.(s)}>
          {s}
        </button>
      ))}
    </div>
  );
}
