
import React from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const BusinessThemeToggle = () => {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium">Tema:</span>
      <ThemeToggle />
    </div>
  );
};

export default BusinessThemeToggle;
