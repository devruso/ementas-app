interface SearchBarProps {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export const SearchBar = ({ value, placeholder, onChange }: SearchBarProps) => {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="soft-ring h-14 w-full rounded-2xl border border-transparent bg-white px-5 text-sm text-ink shadow-panel placeholder:text-muted"
    />
  );
};