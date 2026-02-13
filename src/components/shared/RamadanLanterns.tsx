import React from 'react';
import { motion } from 'framer-motion';

const RamadanLanterns: React.FC = () => {
  return (
    <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[999998] overflow-hidden">
      {/* Lantern 1 - Large Right */}
      <motion.div
        initial={{ y: -100, rotate: 5 }}
        animate={{ y: [-10, 0, -10], rotate: [5, -5, 5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-0 right-[10%] w-24 h-auto opacity-90"
      >
        <svg
          viewBox="0 0 100 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]"
        >
          <path d="M50 0V20" stroke="#F59E0B" strokeWidth="2" />
          <path d="M50 180V160" stroke="#F59E0B" strokeWidth="2" />
          {/* Lantern Body */}
          <path d="M30 20H70L80 40H20L30 20Z" fill="#FBBF24" stroke="#B45309" strokeWidth="1.5" />
          <rect
            x="20"
            y="40"
            width="60"
            height="80"
            rx="5"
            fill="url(#lanternGradient)"
            stroke="#B45309"
            strokeWidth="1.5"
          />
          <path
            d="M20 120H80L70 140H30L20 120Z"
            fill="#FBBF24"
            stroke="#B45309"
            strokeWidth="1.5"
          />
          {/* Glow inside */}
          <circle cx="50" cy="80" r="15" fill="#FEF3C7" className="animate-pulse" />
          <defs>
            <linearGradient
              id="lanternGradient"
              x1="50"
              y1="40"
              x2="50"
              y2="120"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#F59E0B" />
              <stop offset="1" stopColor="#D97706" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Lantern 2 - Small Left */}
      <motion.div
        initial={{ y: -50, rotate: -3 }}
        animate={{ y: [0, -15, 0], rotate: [-3, 3, -3] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute top-[-20px] left-[15%] w-16 h-auto opacity-80"
      >
        <svg
          viewBox="0 0 100 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]"
        >
          <path d="M50 0V20" stroke="#F59E0B" strokeWidth="2" />
          <path d="M30 20H70L80 40H20L30 20Z" fill="#FBBF24" stroke="#B45309" />
          <rect
            x="25"
            y="40"
            width="50"
            height="70"
            rx="5"
            fill="url(#lanternGradient2)"
            stroke="#B45309"
          />
          <path d="M25 110H75L65 130H35L25 110Z" fill="#FBBF24" stroke="#B45309" />
          <circle cx="50" cy="75" r="10" fill="#FEF3C7" className="animate-pulse" />
          <defs>
            <linearGradient
              id="lanternGradient2"
              x1="50"
              y1="40"
              x2="50"
              y2="110"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#F59E0B" />
              <stop offset="1" stopColor="#D97706" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Moon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2 }}
        className="absolute top-10 right-[5%] w-24 h-24 opacity-20 rotate-[-15deg]"
      >
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M85 50C85 77.6142 62.6142 100 35 100C30.2 100 25.5 99.2 21 97.8C42 93 58 74 58 50C58 26 42 7 21 2.2C25.5 0.8 30.2 0 35 0C62.6142 0 85 22.3858 85 50Z"
            fill="#FCD34D"
          />
        </svg>
      </motion.div>
    </div>
  );
};

export default RamadanLanterns;
