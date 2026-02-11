"use client";

/**
 * Decorative SVG components for calming ocean-themed UI
 * - Organic blob shapes
 * - Wave backgrounds  
 * - Floating particles/bubbles
 */

import { useEffect, useState } from "react";

// ============================================================================
// Blob Shapes - Organic floating decorations
// ============================================================================

interface BlobProps {
  className?: string;
  variant?: 1 | 2 | 3 | 4;
  color?: "teal" | "sky" | "coral";
}

const blobPaths = {
  1: "M47.5,-57.2C59.9,-46.8,67.5,-30.6,70.2,-13.6C72.9,3.4,70.7,21.2,62.3,35.5C53.9,49.8,39.3,60.6,23.1,66.1C6.9,71.6,-10.9,71.8,-27.1,65.8C-43.3,59.8,-57.9,47.6,-66.3,32.1C-74.7,16.6,-76.9,-2.2,-71.8,-18.5C-66.7,-34.8,-54.3,-48.6,-40.1,-58.6C-25.9,-68.6,-9.9,-74.8,4.3,-79.9C18.5,-85,35.1,-89,47.5,-57.2Z",
  2: "M44.5,-51.6C56.8,-42.8,65.4,-28.5,68.7,-12.8C72,2.9,70,20,61.8,33.5C53.6,47,39.2,56.9,23.4,62.5C7.6,68.1,-9.6,69.4,-25.2,64.1C-40.8,58.8,-54.8,46.9,-62.8,31.8C-70.8,16.7,-72.8,-1.6,-68.1,-17.9C-63.4,-34.2,-52,-48.5,-38.4,-57C-24.8,-65.5,-9,-68.2,4.4,-73.5C17.8,-78.8,32.2,-86.7,44.5,-51.6Z",
  3: "M39.3,-47.4C50.9,-38.6,60.2,-26.3,64.5,-11.8C68.8,2.7,68.1,19.4,60.6,32.7C53.1,46,38.8,55.9,23.2,61.4C7.6,66.9,-9.3,68,-24.7,63C-40.1,58,-54,46.9,-61.2,32.6C-68.4,18.3,-68.9,0.8,-64.4,-14.5C-59.9,-29.8,-50.4,-42.9,-38.4,-51.6C-26.4,-60.3,-11.9,-64.6,1.4,-66.3C14.7,-68,27.7,-67.1,39.3,-47.4Z",
  4: "M54.2,-59.1C68.8,-48.9,78.3,-30.5,79.6,-11.8C80.9,6.9,74,25.9,62.4,40.4C50.8,54.9,34.5,64.9,16.7,70.2C-1.1,75.5,-20.4,76.1,-37.1,69.1C-53.8,62.1,-67.9,47.5,-74.3,30.2C-80.7,12.9,-79.4,-7.1,-71.5,-23.5C-63.6,-39.9,-49.1,-52.7,-34,-61C-18.9,-69.3,-3.2,-73.1,10.9,-71.8C25,-70.5,39.6,-64.1,54.2,-59.1Z"
};

const blobColors = {
  teal: {
    start: "rgba(100, 255, 218, 0.15)",
    end: "rgba(79, 209, 197, 0.08)"
  },
  sky: {
    start: "rgba(168, 237, 234, 0.12)",
    end: "rgba(100, 255, 218, 0.06)"
  },
  coral: {
    start: "rgba(255, 214, 224, 0.1)",
    end: "rgba(255, 158, 181, 0.05)"
  }
};

export function BlobShape({ className = "", variant = 1, color = "teal" }: BlobProps) {
  const colors = blobColors[color];
  const gradientId = `blob-gradient-${variant}-${color}`;
  
  return (
    <svg
      viewBox="0 0 200 200"
      className={`${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.start} />
          <stop offset="100%" stopColor={colors.end} />
        </linearGradient>
      </defs>
      <g transform="translate(100, 100)">
        <path
          d={blobPaths[variant]}
          fill={`url(#${gradientId})`}
        />
      </g>
    </svg>
  );
}

// ============================================================================
// Wave Background - Layered waves at bottom
// ============================================================================

interface WaveBackgroundProps {
  className?: string;
  variant?: "bottom" | "top" | "divider";
}

export function WaveBackground({ className = "", variant = "bottom" }: WaveBackgroundProps) {
  if (variant === "divider") {
    return (
      <svg
        className={`w-full h-16 ${className}`}
        viewBox="0 0 1440 64"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0,32 C360,64 720,0 1080,32 C1260,48 1380,24 1440,32 L1440,64 L0,64 Z"
          fill="rgba(100, 255, 218, 0.05)"
        />
      </svg>
    );
  }
  
  return (
    <svg
      className={`w-full ${className}`}
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Deep wave */}
      <path
        className="wave-drift"
        d="M0,288L48,272C96,256,192,224,288,213.3C384,203,480,213,576,229.3C672,245,768,267,864,261.3C960,256,1056,224,1152,208C1248,192,1344,192,1392,192L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        fill="rgba(30, 58, 95, 0.8)"
      />
      {/* Mid wave */}
      <path
        className="wave-drift"
        style={{ animationDelay: "-2s" }}
        d="M0,256L48,261.3C96,267,192,277,288,272C384,267,480,245,576,234.7C672,224,768,224,864,234.7C960,245,1056,267,1152,261.3C1248,256,1344,224,1392,208L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        fill="rgba(17, 34, 64, 0.9)"
      />
      {/* Top wave with teal tint */}
      <path
        className="wave-drift"
        style={{ animationDelay: "-4s" }}
        d="M0,224L48,234.7C96,245,192,267,288,261.3C384,256,480,224,576,218.7C672,213,768,235,864,240C960,245,1056,235,1152,218.7C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        fill="rgba(100, 255, 218, 0.05)"
      />
    </svg>
  );
}

// ============================================================================
// Floating Bubbles - Ambient particles
// ============================================================================

interface FloatingBubblesProps {
  count?: number;
  className?: string;
}

export function FloatingBubbles({ count = 15, className = "" }: FloatingBubblesProps) {
  const [bubbles, setBubbles] = useState<Array<{
    id: number;
    size: number;
    left: number;
    delay: number;
    duration: number;
    opacity: number;
  }>>([]);

  useEffect(() => {
    const newBubbles = Array.from({ length: count }, (_, i) => ({
      id: i,
      size: Math.random() * 8 + 4,
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: Math.random() * 15 + 20,
      opacity: Math.random() * 0.3 + 0.1
    }));
    setBubbles(newBubbles);
  }, [count]);

  return (
    <div className={`fixed inset-0 overflow-hidden pointer-events-none ${className}`}>
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="bubble absolute rounded-full"
          style={{
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            left: `${bubble.left}%`,
            bottom: "-20px",
            background: `radial-gradient(circle at 30% 30%, rgba(100, 255, 218, ${bubble.opacity + 0.2}), rgba(79, 209, 197, ${bubble.opacity}))`,
            animationDuration: `${bubble.duration}s`,
            animationDelay: `${bubble.delay}s`,
            boxShadow: `0 0 ${bubble.size}px rgba(100, 255, 218, 0.2)`
          }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Decorative Container - Wraps page with blobs
// ============================================================================

interface DecorativeContainerProps {
  children: React.ReactNode;
  showBlobs?: boolean;
  showBubbles?: boolean;
  showWaves?: boolean;
  className?: string;
}

export function DecorativeContainer({ 
  children, 
  showBlobs = true, 
  showBubbles = true,
  showWaves = true,
  className = "" 
}: DecorativeContainerProps) {
  return (
    <div className={`relative min-h-screen ${className}`}>
      {/* Gradient background */}
      <div className="gradient-bg" />
      
      {/* Floating blobs */}
      {showBlobs && (
        <>
          <BlobShape 
            variant={1} 
            color="teal"
            className="fixed top-[-10%] left-[-10%] w-[40vw] h-[40vw] float-slow opacity-60 pointer-events-none"
          />
          <BlobShape 
            variant={2} 
            color="sky"
            className="fixed top-[30%] right-[-15%] w-[50vw] h-[50vw] float-medium opacity-40 pointer-events-none"
          />
          <BlobShape 
            variant={3} 
            color="teal"
            className="fixed bottom-[-20%] left-[20%] w-[45vw] h-[45vw] float-fast opacity-50 pointer-events-none"
          />
          <BlobShape 
            variant={4} 
            color="coral"
            className="fixed bottom-[10%] right-[-5%] w-[30vw] h-[30vw] float-slow opacity-30 pointer-events-none"
          />
        </>
      )}
      
      {/* Ambient bubbles */}
      {showBubbles && <FloatingBubbles count={12} />}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Wave background at bottom */}
      {showWaves && (
        <div className="fixed bottom-0 left-0 right-0 pointer-events-none z-0">
          <WaveBackground />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Calming Icon - Centered breathing animation
// ============================================================================

interface CalmingOrbProps {
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  className?: string;
}

export function CalmingOrb({ size = "md", icon, className = "" }: CalmingOrbProps) {
  const sizes = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32"
  };
  
  const innerSizes = {
    sm: "w-12 h-12",
    md: "w-20 h-20",
    lg: "w-28 h-28"
  };

  return (
    <div className={`relative ${sizes[size]} ${className}`}>
      {/* Outer glow */}
      <div 
        className={`breathing-orb absolute inset-0 rounded-full bg-gradient-to-br from-teal-400/30 to-cyan-500/20 blur-xl`}
      />
      {/* Inner orb */}
      <div 
        className={`relative ${innerSizes[size]} m-auto rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center glow-soft`}
        style={{ 
          background: "linear-gradient(135deg, #4fd1c5, #64ffda, #38b2ac)",
          top: "50%",
          transform: "translateY(-50%)"
        }}
      >
        {icon && (
          <div className="text-ocean-deep">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Section Divider - Wave-style divider
// ============================================================================

export function SectionDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`relative h-8 my-6 ${className}`}>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1200 30"
        preserveAspectRatio="none"
      >
        <path
          d="M0,15 Q300,30 600,15 T1200,15"
          fill="none"
          stroke="rgba(100, 255, 218, 0.2)"
          strokeWidth="2"
        />
        <circle cx="600" cy="15" r="4" fill="rgba(100, 255, 218, 0.4)" />
      </svg>
    </div>
  );
}

