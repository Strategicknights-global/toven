import React, { useRef, useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface VerificationLocationComboboxProps {
  value: string;
  onChange: (locationName: string) => void;
  locations: Array<{ id: string; name: string }>;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

const VerificationLocationCombobox: React.FC<VerificationLocationComboboxProps> = ({
  value,
  onChange,
  locations,
  loading = false,
  disabled = false,
  placeholder = 'Select or type location',
  required = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [filteredLocations, setFilteredLocations] = useState(locations);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    // Filter locations based on input
    if (inputValue.trim()) {
      const filtered = locations.filter(loc =>
        loc.name.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredLocations(filtered);
    } else {
      setFilteredLocations(locations);
    }
  }, [inputValue, locations]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsOpen(true);
  };

  const handleSelectLocation = (locationName: string) => {
    setInputValue(locationName);
    onChange(locationName);
    setIsOpen(false);
  };

  const handleInputBlur = () => {
    // If input value doesn't match any location exactly, keep the custom value
    // This allows free-text entry
    onChange(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onChange(inputValue);
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled || loading}
          required={required}
          className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
        />
        <ChevronDown
          size={16}
          className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50">
          {loading && (
            <div className="px-3 py-2 text-sm text-gray-500">Loading locations...</div>
          )}

          {!loading && filteredLocations.length > 0 && (
            <ul className="max-h-48 overflow-y-auto">
              {filteredLocations.map((location) => (
                <li key={location.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectLocation(location.name)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 active:bg-purple-100 transition"
                  >
                    {location.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!loading && locations.length > 0 && filteredLocations.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">
              No matching locations. You can type a custom location.
            </div>
          )}

          {!loading && locations.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">
              No verification locations configured yet. Type a custom location.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VerificationLocationCombobox;
