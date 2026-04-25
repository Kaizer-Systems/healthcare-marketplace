import { Input } from '../primitives/Input.js';

export function SearchBar({ placeholder }: { placeholder?: string }) {
  return <Input type="search" placeholder={placeholder ?? 'Search'} aria-label="Search" />;
}
