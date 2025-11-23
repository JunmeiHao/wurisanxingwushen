import React, { useEffect } from 'react';

interface TimerProps {
  totalSeconds: number;
  timeLeft: number;
  isActive: boolean;
}

export const Timer: React.FC<TimerProps> = ({ totalSeconds, timeLeft, isActive }) => {
  
  // Calculate progress
  const percentage = ((totalSeconds - timeLeft) / totalSeconds) * 100;
  const strokeDasharray = 283; // 2 * PI * 45 (radius)
  const strokeDashoffset = strokeDasharray - (percentage / 100) * strokeDasharray;

  // Format time
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Dynamic title update
  useEffect(() => {
    document.title = isActive ? `${timeString} - FocusFlow` : 'FocusFlow';
  }, [timeLeft, isActive, timeString]);

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Outer Circle Track */}
      <svg className="w-full h-full transform -rotate-90 drop-shadow-xl">
        <circle
          cx="50%"
          cy="50%"
          r="45%"
          className="stroke-slate-200 fill-none"
          strokeWidth="8"
        />
        {/* Progress Circle */}
        <circle
          cx="50%"
          cy="50%"
          r="45%"
          className={`fill-none transition-all duration-1000 ease-linear ${isActive ? 'stroke-indigo-500' : 'stroke-slate-400'}`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      
      {/* Time Text */}
      <div className="absolute flex flex-col items-center justify-center text-slate-700">
        <span className="text-6xl font-bold tracking-tighter font-mono">{timeString}</span>
        <span className="text-sm font-medium text-slate-400 mt-2 uppercase tracking-widest">
            {isActive ? 'Focusing' : 'Paused'}
        </span>
      </div>
    </div>
  );
};