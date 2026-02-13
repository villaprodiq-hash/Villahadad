import React, { useEffect, useState, useRef } from 'react';
import './CursorHalo.css';

interface CursorHaloProps {
  size?: number;
  borderWidth?: number;
  borderColor?: string;
  arcColor?: string;
  arcLength?: number;
  smoothing?: number;
  image?: string;
}

export const CursorHalo: React.FC<CursorHaloProps> = ({
  size = 80,
  borderWidth = 2,
  borderColor = 'rgba(255, 255, 255, 0.3)',
  arcColor = 'rgba(139, 92, 246, 0.8)',
  arcLength = 90,
  smoothing = 0.15,
  image = undefined
}) => {
  const [position, setPosition] = useState({ x: -200, y: -200 });
  const [rotation, setRotation] = useState(0);
  const targetPosition = useRef({ x: -200, y: -200 });
  const currentPosition = useRef({ x: -200, y: -200 });
  const animationFrameId = useRef<number>();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      targetPosition.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Smooth animation loop
    const animate = () => {
      const dx = targetPosition.current.x - currentPosition.current.x;
      const dy = targetPosition.current.y - currentPosition.current.y;

      currentPosition.current.x += dx * smoothing;
      currentPosition.current.y += dy * smoothing;

      setPosition({
        x: currentPosition.current.x,
        y: currentPosition.current.y
      });

      // Rotate arc based on movement direction
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      setRotation(angle);

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [smoothing]);

  return (
    <div
      className="cursor-halo"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size}px`,
        height: `${size}px`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      }}
    >
      {/* Main circle with border */}
      <div
        className="cursor-halo-circle"
        style={{
          width: '100%',
          height: '100%',
          border: `${borderWidth}px solid ${borderColor}`,
          borderRadius: '50%',
        }}
      >
        {image && (
          <img
            src={image}
            alt=""
            className="cursor-halo-image"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
            }}
          />
        )}
      </div>

      {/* Animated arc */}
      <svg
        className="cursor-halo-arc"
        width={size + borderWidth * 4}
        height={size + borderWidth * 4}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <circle
          cx={(size + borderWidth * 4) / 2}
          cy={(size + borderWidth * 4) / 2}
          r={(size + borderWidth * 2) / 2}
          fill="none"
          stroke={arcColor}
          strokeWidth={borderWidth + 1}
          strokeDasharray={`${arcLength} ${360 - arcLength}`}
          strokeLinecap="round"
          className="cursor-halo-arc-path"
        />
      </svg>
    </div>
  );
};
