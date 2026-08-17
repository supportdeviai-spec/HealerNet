import React from 'react';
import { useSiteLogo } from '../../hooks/useSiteLogo';

export default function HealerNetLogo({ size = 'md', showText = true, className = '' }) {
  const { logoSrc, onLogoError } = useSiteLogo();

  const sizeClasses = {
    sm: 'w-9 h-9',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    hero: 'w-28 h-28 sm:w-40 sm:h-40 lg:w-48 lg:h-48 xl:w-60 xl:h-60',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
    hero: 'text-4xl',
  };

  const imgClass = sizeClasses[size] || sizeClasses.md;
  const textSizeClass = textSizes[size] || textSizes.md;

  return (
    <div className={`flex items-center gap-2 sm:gap-3 min-w-0 ${className}`}>
      <div className="relative group shrink-0">
        <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-[#D4AF37]/50 via-[#65A30D]/40 to-[#0F382C]/60 blur-md group-hover:blur-lg transition-all duration-300 pointer-events-none" />
        <img
          src={logoSrc}
          onError={onLogoError}
          alt="HealerNet Logo"
          className={`${imgClass} relative object-contain drop-shadow-[0_6px_16px_rgba(15,56,44,0.4)] transition-transform duration-300 group-hover:scale-105 max-w-full`}
        />
      </div>

      {showText && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-0.5 font-serif tracking-tight leading-none">
            <span className={`${textSizeClass} font-bold text-[#0F382C] dark:text-[#F3F4F6]`}>
              Healer
            </span>
            <span className={`${textSizeClass} font-bold text-[#65A30D] dark:text-[#84CC16]`}>
              Net
            </span>
            <span className="text-[10px] text-[#D4AF37] font-bold align-top ml-0.5">™</span>
          </div>
          <span className="text-[9px] sm:text-xs text-[#0F382C]/80 dark:text-[#A3E635] font-semibold tracking-widest uppercase mt-1 truncate">
            Global Healing Network
          </span>
        </div>
      )}
    </div>
  );
}
