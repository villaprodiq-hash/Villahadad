import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './AnimatedTooltip.css';

interface AnimatedTooltipProps {
  children: React.ReactNode;
  content: string;
  delay?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const AnimatedTooltip: React.FC<AnimatedTooltipProps> = ({
  children,
  content,
  delay = 0,
  position = 'top'
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (_event: React.MouseEvent<HTMLDivElement>) => {
    // Optional: Can track mouse for future effects
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // Position calculations
  const getTooltipPosition = () => {
    switch (position) {
      case 'top':
        return { bottom: '100%', left: '50%', transform: 'translateX(-50%) translateY(-8px)' };
      case 'bottom':
        return { top: '100%', left: '50%', transform: 'translateX(-50%) translateY(8px)' };
      case 'left':
        return { right: '100%', top: '50%', transform: 'translateY(-50%) translateX(-8px)' };
      case 'right':
        return { left: '100%', top: '50%', transform: 'translateY(-50%) translateX(8px)' };
      default:
        return { bottom: '100%', left: '50%', transform: 'translateX(-50%) translateY(-8px)' };
    }
  };

  return (
    <div
      className="animated-tooltip-container"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="animated-tooltip"
            style={{
              ...getTooltipPosition(),
            }}
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 20,
              delay: delay / 1000
            }}
          >
            <div className="animated-tooltip-content">
              {content}
            </div>
            <div className="animated-tooltip-arrow" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface AvatarTooltipProps {
  name: string;
  designation?: string;
  image?: string;
  size?: 'sm' | 'md' | 'lg';
  delay?: number;
}

export const AvatarTooltip: React.FC<AvatarTooltipProps> = ({
  name,
  designation,
  image,
  size = 'md',
  delay = 0
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const sizeClasses = {
    sm: 'w-12 h-12 text-sm',
    md: 'w-16 h-16 text-lg',
    lg: 'w-20 h-20 text-2xl'
  };

  const tooltipContent = designation ? `${name}\n${designation}` : name;

  return (
    <div
      className="avatar-tooltip-wrapper"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`avatar-circle ${sizeClasses[size]}`}>
        {image ? (
          <img src={image} alt={name} className="avatar-image" />
        ) : (
          <span className="avatar-initials">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="avatar-tooltip"
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 25,
              delay: delay / 1000
            }}
          >
            <div className="avatar-tooltip-content">
              <div className="avatar-tooltip-name">{name}</div>
              {designation && (
                <div className="avatar-tooltip-designation">{designation}</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface AvatarGroupProps {
  users: Array<{
    name: string;
    designation?: string;
    image?: string;
  }>;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  users,
  max = 5,
  size = 'md'
}) => {
  const displayUsers = users.slice(0, max);
  const remainingCount = users.length - max;

  return (
    <div className="avatar-group">
      {displayUsers.map((user, index) => (
        <AvatarTooltip
          key={index}
          name={user.name}
          designation={user.designation}
          image={user.image}
          size={size}
          delay={index * 50}
        />
      ))}
      {remainingCount > 0 && (
        <div className={`avatar-circle avatar-more ${size === 'sm' ? 'w-12 h-12 text-sm' : size === 'md' ? 'w-16 h-16 text-lg' : 'w-20 h-20 text-2xl'}`}>
          <span>+{remainingCount}</span>
        </div>
      )}
    </div>
  );
};
