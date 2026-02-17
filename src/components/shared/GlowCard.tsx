
import React, { useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import { cn } from '../../lib/utils';

const ROTATION_RANGE = 20; 

interface GlowCardProps {
    children?: React.ReactNode; 
    className?: string;
    variant?: 'dark' | 'light';
    glowColor?: string; // Optional custom glow color (hex or tailwind class mostly for border)
    disableTilt?: boolean;
}

export const GlowCard = ({ children, className = "", variant = 'dark', glowColor, disableTilt = false }: GlowCardProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const xSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const ySpring = useSpring(y, { stiffness: 300, damping: 30 });

  const transform = disableTilt 
    ? "none" 
    : useMotionTemplate`perspective(1000px) rotateX(${xSpring}deg) rotateY(${ySpring}deg)`;
  
  // Colors based on variant
  const isDark = variant === 'dark';
  
  // Default Glow Colors
  const darkGlow = "rgba(236, 72, 153, 0.03)"; // Pinkish - Ultra subtle
  const lightGlow = "rgba(59, 130, 246, 0.03)"; // Bluish - Ultra subtle

  // Border Colors
  const darkBorder = "border-pink-500/50";
  const lightBorder = "border-blue-400/50"; // Use tailwind classes for border div

  const activeGlow = glowColor || (isDark ? darkGlow : lightGlow);
  const activeBorderClass = glowColor ? `border-[${glowColor}]/50` : (isDark ? darkBorder : lightBorder);

  const borderMask = useMotionTemplate`radial-gradient(300px circle at ${mouseX}px ${mouseY}px, rgba(255,255,255,1) 0%, transparent 100%)`;
  const surfaceGradient = useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, ${activeGlow}, transparent 80%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mX = e.clientX - rect.left;
    const mY = e.clientY - rect.top;
    mouseX.set(mX);
    mouseY.set(mY);
    const rX = disableTilt ? 0 : (mY / height - 0.5) * ROTATION_RANGE * -1;
    const rY = disableTilt ? 0 : (mX / width - 0.5) * ROTATION_RANGE; 
    x.set(rX);
    y.set(rY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform }}
      className={cn(
        "relative group rounded-3xl overflow-hidden transition-all duration-200",
        isDark ? "bg-black/40 backdrop-blur-md border border-white/5" : "bg-white border border-gray-100 shadow-sm hover:shadow-lg",
        className
      )}
    >
      {/* 1. Surface Glow */}
      <motion.div 
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500 opacity-0 group-hover:opacity-100"
        style={{ background: surfaceGradient }}
      />

      {/* 2. Border Glow */}
      <motion.div
        className={cn(
            "pointer-events-none absolute inset-0 z-10 border-2 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300",
            activeBorderClass
        )}
        style={{ 
            maskImage: borderMask,
            WebkitMaskImage: borderMask 
        }}
      />

      {/* 3. Content */}
      <div className="relative z-20 h-full">
        {children}
      </div>
      
      {/* 4. Glossy Reflection (Subtle) */}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-30 mix-blend-overlay" />
    </motion.div>
  );
};
