import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className, size = 40 }) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Don't set an initial value - we'll handle this in the rendering instead
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  
  // Wait for component to be mounted to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    
    // Check system preference immediately on client side
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setLogoSrc(prefersDark ? 'https://res.cloudinary.com/drdt8dznr/image/upload/v1751210151/dark_logo_b7ox1b.png' : 'https://res.cloudinary.com/drdt8dznr/image/upload/v1751210150/bright_logo_pttpeu.png');
    
    // Update logo when theme changes
    if (resolvedTheme) {
      setLogoSrc(resolvedTheme === 'dark' ? 'https://res.cloudinary.com/drdt8dznr/image/upload/v1751210151/dark_logo_b7ox1b.png' : 'https://res.cloudinary.com/drdt8dznr/image/upload/v1751210150/bright_logo_pttpeu.png');
    }
  }, [resolvedTheme]);

  // During SSR or before client hydration is complete
  if (!mounted || !logoSrc) {
    // Use a transparent 1px image for initial render to prevent layout shift
    // This will be replaced immediately after hydration
    return (
      <div className={className} style={{ width: size, height: size }}>
        {/* Empty div with dimensions to prevent layout shift */}
      </div>
    );
  }

  return (
    <div className={className}>
      <Image 
        src={logoSrc} 
        alt="YouEducation Logo"
        width={size}
        height={size}
        priority
        key={logoSrc} // Force re-render when src changes
      />
    </div>
  );
};