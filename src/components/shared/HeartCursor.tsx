
import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

const HeartCursor = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const countRef = useRef(0);
  const requestRef = useRef<number | null>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);

    const loop = () => {
      // Calculate distance
      const dist = Math.hypot(
        mousePos.current.x - lastPos.current.x,
        mousePos.current.y - lastPos.current.y
      );

      // Threshold for spawning a new heart
      if (dist > 35) {
        const id = countRef.current++;
        const newParticle = {
          id,
          x: mousePos.current.x,
          y: mousePos.current.y,
          rotation: Math.random() * 30 - 15,
          scale: Math.random() * 0.4 + 0.6, // Random scale between 0.6 and 1.0
        };

        setParticles((prev) => [...prev.slice(-20), newParticle]); // Limit particles
        lastPos.current = { ...mousePos.current };
      }

      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[999999] overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ 
              opacity: 0, 
              scale: 0,
              x: p.x, 
              y: p.y 
          }}
          animate={{ 
            opacity: [0, 1, 0], // Fade in quickly, then fade out
            scale: [0, p.scale, p.scale * 0.8],
            y: p.y - 100, // Float UP significantly
            x: p.x + (Math.random() * 50 - 25) // Random drift left/right
          }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          onAnimationComplete={() => {
            setParticles(prev => prev.filter(item => item.id !== p.id));
          }}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            rotate: p.rotation,
            marginLeft: '-12px',
            marginTop: '-12px'
          }}
        >
          {/* Styled SVG Heart instead of Emoji */}
          <Heart 
              size={24} 
              className="text-pink-500 fill-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]" 
              strokeWidth={0}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default HeartCursor;
