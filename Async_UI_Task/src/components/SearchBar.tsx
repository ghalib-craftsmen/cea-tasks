interface Props {
  value: string;
  onChange: (value: string) => void;
}

function SearchBar({ value, onChange }: Props) {
  return (
    <input
      type="search"
      placeholder="Search stories..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
    />
  );
}

export default SearchBar;
