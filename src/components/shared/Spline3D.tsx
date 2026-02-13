
import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface Spline3DProps {
  className?: string;
}

const Spline3D: React.FC<Spline3DProps> = ({ className }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if script already exists to prevent duplicate loading
    if (!document.querySelector('script[src*="spline-viewer.js"]')) {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = 'https://unpkg.com/@splinetool/viewer@1.9.28/build/spline-viewer.js';
        document.head.appendChild(script);
    }

    // Timeout to remove loader as the web component handles its own loading state visually
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`relative w-full h-full ${className} bg-[#050505]`}>
      {/* Loading Screen */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#050505] z-20 transition-opacity duration-500">
          <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
        </div>
      )}

      {/* Spline Viewer Web Component */}
      <div className="w-full h-full relative z-10 pointer-events-none">
         {/* @ts-expect-error: temporary workaround for spline rendering */}
         <spline-viewer 
            url="https://prod.spline.design/pG1NqS0D2ZSttmg3/scene.splinecode"
            loading-anim-type="spinner-small-dark"
         />
      </div>
      
      {/* Overlay for aesthetics and click protection */}
      <div className="absolute inset-0 bg-linear-to-t from-[#050505] via-transparent to-[#050505]/20 pointer-events-none z-10" />
    </div>
  );
};

export default Spline3D;
