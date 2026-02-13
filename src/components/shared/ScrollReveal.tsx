
import React from 'react';
import { motion } from 'framer-motion';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  fullHeight?: boolean;
}

const ScrollReveal: React.FC<ScrollRevealProps> = ({ 
  children, 
  className = "", 
  delay = 0, 
  direction = 'up',
  fullHeight = false
}) => {
  const getInitial = () => {
    switch(direction) {
      case 'up': return { opacity: 0, y: 30 };
      case 'down': return { opacity: 0, y: -30 };
      case 'left': return { opacity: 0, x: 30 };
      case 'right': return { opacity: 0, x: -30 };
      default: return { opacity: 0, y: 30 };
    }
  };

  return (
    <motion.div
      initial={getInitial()}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.5, delay: delay, ease: "easeOut" }}
      className={`${className} ${fullHeight ? 'h-full' : ''}`}
    >
      {children}
    </motion.div>
  );
};

export default ScrollReveal;
