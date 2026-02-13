
import React, { useEffect, useRef } from 'react';

const Snowfall: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: { x: number; y: number; radius: number; speed: number; wind: number; alpha: number }[] = [];

    // --- Configuration: Sparse and Drifting ---
    const createParticles = () => {
      // Significantly reduced density: Divide width by 60
      const count = Math.min(window.innerWidth / 60, 40); 
      
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 2 + 0.5, // Tiny particles
          speed: Math.random() * 0.3 + 0.1, // Very slow drift
          wind: Math.random() * 0.5 - 0.25, // Gentle sway
          alpha: Math.random() * 0.5 + 0.2  // Varied opacity
        });
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = [];
      createParticles();
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      
      update();
      animationFrameId = requestAnimationFrame(draw);
    };

    const update = () => {
      particles.forEach(p => {
        p.y += p.speed;
        p.x += p.wind;

        // Gentle sine wave movement
        p.x += Math.sin(p.y * 0.005) * 0.1;

        // Wrap around bottom
        if (p.y > canvas.height) {
          p.y = -5;
          p.x = Math.random() * canvas.width;
        }
        
        // Wrap around sides
        if (p.x > canvas.width) {
          p.x = 0;
        } else if (p.x < 0) {
          p.x = canvas.width;
        }
      });
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-[999999]" 
        style={{ width: '100%', height: '100%' }}
      />
    </>
  );
};

export default Snowfall;
