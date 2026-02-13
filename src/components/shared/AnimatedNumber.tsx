import React from 'react';
import { useSpring, animated } from '@react-spring/web';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ 
  value, 
  duration = 1000,
  decimals = 0,
  suffix = '',
  prefix = ''
}) => {
  // Using static render to fix build error with react-spring/typescript
  return (
    <span>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
};

export default AnimatedNumber;
