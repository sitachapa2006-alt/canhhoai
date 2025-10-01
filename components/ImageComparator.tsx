import React, { useState, useEffect, useRef } from 'react';

interface ImageComparatorProps {
  originalImage: string;
  generatedImage: string;
  onClose: () => void;
}

const ImageComparator: React.FC<ImageComparatorProps> = ({ originalImage, generatedImage, onClose }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  const handleMove = (clientX: number) => {
    if (imageContainerRef.current) {
        const rect = imageContainerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percent = (x / rect.width) * 100;
        setSliderPosition(percent);
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    handleMove(event.clientX);
  };
  
  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    handleMove(event.touches[0].clientX);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4 animate-fade-in-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <style>{`
          @keyframes fade-in-backdrop { from { opacity: 0; } to { opacity: 1; } }
          .animate-fade-in-backdrop { animation: fade-in-backdrop 0.3s ease-out forwards; }
          @keyframes scale-up-content { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          .animate-scale-up-content { animation: scale-up-content 0.3s ease-out forwards; }
      `}</style>

      <button
        onClick={onClose}
        className="absolute top-4 right-4 bg-white/20 text-white rounded-full p-2 hover:bg-white/30 transition-colors z-50"
        aria-label="Đóng"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="relative max-w-5xl w-full animate-scale-up-content" onClick={(e) => e.stopPropagation()}>
          <div 
            ref={imageContainerRef}
            className="relative w-full aspect-square overflow-hidden rounded-lg select-none"
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
          >
              <img
                  src={originalImage}
                  alt="Original"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />
              <div 
                className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
                style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
              >
                  <img
                      src={generatedImage}
                      alt="Generated"
                      className="absolute inset-0 w-full h-full object-contain"
                  />
              </div>
              <div
                className="absolute top-0 bottom-0 w-1 bg-white/50 cursor-ew-resize pointer-events-none"
                style={{ left: `calc(${sliderPosition}% - 2px)` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -left-4 w-9 h-9 rounded-full bg-white/80 border-2 border-white shadow-lg flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
                </div>
              </div>
          </div>
          <div className="flex justify-between mt-2 text-white">
            <span className="bg-black/50 px-3 py-1 rounded">Trước</span>
            <span className="bg-black/50 px-3 py-1 rounded">Sau</span>
        </div>
      </div>
    </div>
  );
};

export default ImageComparator;
