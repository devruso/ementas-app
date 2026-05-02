import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export const SearchBar = ({ value, placeholder, onChange }: SearchBarProps) => {
  return (
    <label className="relative block w-full min-w-0">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-500/70" />
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="soft-ring h-14 w-full min-w-0 rounded-2xl border border-transparent bg-white pl-11 pr-4 text-sm text-ink shadow-panel placeholder:text-muted"
      />
    </label>
  );
};