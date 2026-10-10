import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-brand-cardDark text-slate-600 dark:text-slate-200 shadow-sm hover:scale-105 transition-all duration-200"
      aria-label="Toggle Theme"
    >
      {theme === 'light' ? (
        <span className="flex items-center gap-2 text-xs font-semibold">
          🌙 Dark Mode
        </span>
      ) : (
        <span className="flex items-center gap-2 text-xs font-semibold">
          ☀️ Light Mode
        </span>
      )}
    </button>
  );
};
