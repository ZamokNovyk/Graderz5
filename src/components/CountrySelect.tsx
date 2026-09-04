import React, { useState, useRef, useEffect } from 'react';
import { ALL_COUNTRIES } from '../data/countries';
import { FlagImage } from './FlagImage';
import { ChevronDown, Search, Check } from 'lucide-react';

interface CountrySelectProps {
  value: string;
  onChange: (countryName: string) => void;
  className?: string;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({ value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCountries = ALL_COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#181820] hover:bg-[#1f1f2a] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 cursor-pointer flex items-center justify-between transition-all"
      >
        <div className="flex items-center gap-2.5 truncate">
          <FlagImage countryName={value} size="sm" />
          <span className="font-medium truncate">{value || 'Seleccionar país'}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-[#1a1a24] border border-white/15 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
          {/* Search bar */}
          <div className="p-2 border-b border-white/10 relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar país..."
              autoFocus
              className="w-full bg-[#121218] text-xs text-white placeholder-zinc-500 pl-8 pr-3 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:ring-1 focus:ring-red-500/50"
            />
          </div>

          {/* Country List */}
          <div className="max-h-56 overflow-y-auto custom-scrollbar p-1">
            {filteredCountries.length === 0 ? (
              <div className="p-3 text-center text-xs text-zinc-500">No se encontraron países</div>
            ) : (
              filteredCountries.map((c) => {
                const isSelected = value?.toLowerCase() === c.name.toLowerCase();
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      onChange(c.name);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors text-left cursor-pointer ${
                      isSelected
                        ? 'bg-red-500/20 text-white font-semibold'
                        : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FlagImage countryName={c.name} size="sm" />
                      <span className="truncate">{c.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
