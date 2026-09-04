import React, { useState } from 'react';
import { getCountryCode, getCountryFlag } from '../data/countries';

interface FlagImageProps {
  countryName?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showEmojiFallback?: boolean;
}

export const FlagImage: React.FC<FlagImageProps> = ({
  countryName,
  className = '',
  size = 'sm',
  showEmojiFallback = true
}) => {
  const [hasError, setHasError] = useState(false);
  const code = getCountryCode(countryName);

  const sizeClasses = {
    xs: 'w-3.5 h-2.5',
    sm: 'w-4 h-3',
    md: 'w-5 h-3.5',
    lg: 'w-6 h-4'
  };

  if (!code || hasError) {
    if (showEmojiFallback) {
      return (
        <span className={`inline-flex items-center justify-center leading-none ${className}`}>
          {getCountryFlag(countryName)}
        </span>
      );
    }
    return null;
  }

  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      alt={countryName || 'Bandera'}
      title={countryName}
      loading="lazy"
      onError={() => setHasError(true)}
      className={`inline-block object-cover rounded-xs shadow-xs border border-white/15 shrink-0 align-middle ${sizeClasses[size]} ${className}`}
    />
  );
};
