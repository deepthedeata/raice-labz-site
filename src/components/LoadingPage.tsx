import { useEffect, useState } from "react";

interface LoadingPageProps {
  onLoadingComplete: () => void;
}

const LoadingPage: React.FC<LoadingPageProps> = ({ onLoadingComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            onLoadingComplete();
          }, 200);
          return 100;
        }
        return prev + 2;
      });
    }, 40); // 40ms * 50 steps = 2000ms (2 seconds)

    return () => clearInterval(timer);
  }, [onLoadingComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex flex-col items-center justify-center text-center">
      {/* Main Title */}
      <h1 className="text-8xl font-bold text-white mb-4 tracking-wide">
        RAICE LABZ
      </h1>

      {/* Subtitle */}
      <p className="text-2xl text-blue-100 mb-12 font-light tracking-wide">
        Advanced Rice Quality Analysis System
      </p>

      {/* APIT Logo */}
      <div className="mb-16">
        <img 
          src="/company-logo.png" 
          alt="APIT Company Logo" 
          className="h-24 w-auto mx-auto"
        />
      </div>

      {/* Ready Text */}
      <div className="mb-6">
        <p className="text-white text-2xl font-bold tracking-widest">
          READY!
        </p>
      </div>

      {/* Loading Progress Bar */}
      <div className="w-96 mb-8">
        <div className="bg-blue-400/30 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-yellow-400 h-full transition-all duration-100 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Loading Spinner */}
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-300/30 border-t-blue-400 rounded-full animate-spin"></div>
      </div>
    </div>
  );
};

export default LoadingPage; 