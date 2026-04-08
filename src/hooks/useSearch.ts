import { useState, useDeferredValue } from "react";
import { useDebounce } from "./useDebounce";

/**
 * Combined search hook with debounce and deferred value for optimal UX.
 * - Debounce prevents excessive API calls during rapid typing
 * - useDeferredValue keeps UI responsive during data fetching
 *
 * @param initialValue - Initial search value (default: "")
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns Object with search state and utilities
 */
export function useSearch(initialValue: string = "", delay: number = 300) {
  const [searchValue, setSearchValue] = useState(initialValue);
  const debouncedValue = useDebounce(searchValue, delay);
  const deferredValue = useDeferredValue(debouncedValue);
  const isPending = searchValue !== deferredValue;

  return {
    /** Current input value (use for controlled input) */
    searchValue,
    /** Debounced + deferred value (use for API calls) */
    debouncedValue: deferredValue,
    /** Update the search value */
    setSearchValue,
    /** True when debounce/defer is pending (can show loading indicator) */
    isPending,
  };
}
