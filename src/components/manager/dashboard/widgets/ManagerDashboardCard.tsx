import React from 'react';
import { motion, useMotionValue, useMotionTemplate, useSpring } from 'framer-motion';

const DashboardCard: React.FC<{ 
  children: React.ReactNode; 
  className?: string; 
  title?: string; 
  action?: React.ReactNode; 
  noPadding?: boolean;
} & React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "", title, action, noPadding = false, ...props }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const xSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const ySpring = useSpring(y, { stiffness: 300, damping: 30 });
  const transform = useMotionTemplate`perspective(1000px) rotateX(${xSpring}deg) rotateY(${ySpring}deg)`;
  
  // Light Theme Glow (White Sheen)
  const surfaceGradient = useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, rgba(255, 255, 255, 0.4), transparent 80%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mX = e.clientX - rect.left;
    const mY = e.clientY - rect.top;
    mouseX.set(mX);
    mouseY.set(mY);
    // Reduced Rotation Range for "Calmer" Effect
    const rX = (mY / height - 0.5) * 2 * -1; 
    const rY = (mX / width - 0.5) * 2;
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
      {...(props as any)}
      className={`relative group rounded-4xl shadow-[0_12px_24px_-8px_rgba(100,116,139,0.2)] border border-gray-900/5 dark:border-white/5 ${noPadding ? '' : 'p-5'} ${className.includes('bg-') ? className : `bg-gradient-to-br from-[#F9F3DE] to-[#DCE0E2] dark:from-[#1a1c22] dark:to-[#0f1115] ${className}`}`}
    >
      <motion.div 
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500 opacity-0 group-hover:opacity-100 mix-blend-overlay"
        style={{ background: surfaceGradient }}
      />
      <div className="relative z-10 h-full flex flex-col">
        {(title || action) && (
          <div className={`flex items-center justify-between ${noPadding ? 'p-5 pb-0' : 'mb-4'}`}>
            {title && <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{title}</h3>}
            {action}
          </div>
        )}
        {children}
      </div>
    </motion.div>
  );
};

export default DashboardCard;
