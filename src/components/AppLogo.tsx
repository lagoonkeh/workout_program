import React from 'react';

interface AppLogoProps {
  size?: number;
  className?: string;
  showGlow?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 38,
  className = '',
  showGlow = true,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-label="Workout Program Athletic Emerald Logo"
      role="img"
    >
      {/* Ambient Emerald Backlight Glow */}
      {showGlow && (
        <div
          className="absolute inset-0 rounded-xl bg-emerald-500/25 blur-md pointer-events-none -z-10 transform scale-90"
          aria-hidden="true"
        />
      )}

      <svg
        viewBox="0 0 44 44"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm select-none"
      >
        <defs>
          {/* Emerald Gradient for the Hexagonal Shield Rim */}
          <linearGradient id="logo-shield-stroke" x1="4" y1="2" x2="40" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="45%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          {/* Deep Dark Emerald Radial / Linear Background */}
          <linearGradient id="logo-shield-bg" x1="22" y1="2" x2="22" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#064e3b" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#022c22" stopOpacity="0.95" />
          </linearGradient>

          {/* Kinetic Chevrons Gradient */}
          <linearGradient id="logo-chevron-left" x1="8" y1="14" x2="20" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          <linearGradient id="logo-chevron-right" x1="36" y1="14" x2="24" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          {/* Central Apex Core Gradient */}
          <linearGradient id="logo-core-grad" x1="22" y1="6" x2="22" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a7f3d0" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* Core Soft Glow */}
          <filter id="logo-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Structural Faceted Hexagon Shield (Stability & Bulletproofing) */}
        <polygon
          points="22,3 39,12 39,32 22,41 5,32 5,12"
          fill="url(#logo-shield-bg)"
          stroke="url(#logo-shield-stroke)"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* 2. Inner Subtle Geometric Accent Ring */}
        <polygon
          points="22,7 35,14 35,30 22,37 9,30 9,14"
          fill="none"
          stroke="#10b981"
          strokeWidth="0.8"
          strokeOpacity="0.3"
          strokeDasharray="2 2"
        />

        {/* 3. Ascending Left Kinetic Wing / Chevron (Force Vector) */}
        <path
          d="M11,26 L19,15 L19,22.5 L13.5,29.5 Z"
          fill="url(#logo-chevron-left)"
        />

        {/* 4. Ascending Right Kinetic Wing / Chevron (Bilateral Symmetry) */}
        <path
          d="M33,26 L25,15 L25,22.5 L30.5,29.5 Z"
          fill="url(#logo-chevron-right)"
        />

        {/* 5. Central Vertical Barbell Axis & Kinetic Arrowhead Apex */}
        <path
          d="M22,8 L26.5,15.5 L23.5,15.5 L23.5,33 L20.5,33 L20.5,15.5 L17.5,15.5 Z"
          fill="url(#logo-core-grad)"
          filter="url(#logo-glow-filter)"
        />

        {/* 6. Heavy Barbell Plate Base Collar Accent */}
        <rect
          x="16.5"
          y="29"
          width="11"
          height="2.2"
          rx="1.1"
          fill="#a7f3d0"
        />
        <rect
          x="18"
          y="32"
          width="8"
          height="1.5"
          rx="0.75"
          fill="#6ee7b7"
          opacity="0.8"
        />
      </svg>
    </div>
  );
};
