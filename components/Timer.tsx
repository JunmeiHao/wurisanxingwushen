import React, { useEffect, useRef, useState } from 'react';
import { PictureInPicture, ExternalLink } from 'lucide-react';

interface TimerProps {
  totalSeconds: number;
  timeLeft: number;
  isActive: boolean;
  isMini?: boolean;
}

export const Timer: React.FC<TimerProps> = ({ totalSeconds, timeLeft, isActive, isMini = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPipActive, setIsPipActive] = useState(false);

  // Calculate progress
  const percentage = Math.max(0, Math.min(100, ((totalSeconds - timeLeft) / totalSeconds) * 100));
  const strokeDasharray = 283; // 2 * PI * 45 (radius)
  const strokeDashoffset = strokeDasharray - (percentage / 100) * strokeDasharray;

  // Format time
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Dynamic title update
  useEffect(() => {
    if (timeLeft === 0 && !isActive) {
      document.title = "⏰ Time's Up!";
    } else {
      document.title = isActive ? `${timeString} - FocusFlow` : 'FocusFlow';
    }
  }, [timeLeft, isActive, timeString]);

  // Draw to hidden canvas for PiP stream
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 180; // Large radius for high-res canvas

    // Special State: Time is Up! (Red Alert Background)
    if (timeLeft === 0) {
      ctx.fillStyle = '#ef4444'; // Red-500
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 100px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText("TIME UP", centerX, centerY - 30);
      
      ctx.font = 'bold 50px sans-serif';
      ctx.fillText("Click to Log", centerX, centerY + 60);
      return;
    }

    // Normal State Drawing
    // Clear and Fill Background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f8fafc'; // slate-50
    ctx.fillRect(0, 0, width, height);

    // Draw Track
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#e2e8f0'; // slate-200
    ctx.lineWidth = 30;
    ctx.stroke();

    // Draw Progress
    if (percentage > 0) {
      const startAngle = -Math.PI / 2;
      const progressAngle = (2 * Math.PI) * (percentage / 100);
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + progressAngle);
      ctx.strokeStyle = isActive ? '#6366f1' : '#94a3b8'; // indigo-500 or slate-400
      ctx.lineWidth = 30;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Draw Time Text
    ctx.fillStyle = '#334155'; // slate-700
    ctx.font = 'bold 120px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(timeString, centerX, centerY - 20);

    // Draw Status Text
    ctx.fillStyle = '#94a3b8'; // slate-400
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(isActive ? 'FOCUSING' : 'PAUSED', centerX, centerY + 80);

  }, [timeLeft, isActive, percentage, timeString]);

  // Handle PiP toggle
  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPipActive(false);
      } else {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas) {
            if (video.paused) {
                // @ts-ignore: captureStream might not be in all TS definitions yet
                const stream = canvas.captureStream(10); 
                video.srcObject = stream;
                await video.play();
            }
            await video.requestPictureInPicture();
            setIsPipActive(true);
        }
      }
    } catch (error) {
      console.error("Failed to enter Picture-in-Picture mode:", error);
      alert("This feature requires a modern browser (Chrome/Edge/Safari).");
    }
  };

  // Sync state when PiP is closed externally
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLeavePip = () => setIsPipActive(false);
    video.addEventListener('leavepictureinpicture', onLeavePip);
    return () => video.removeEventListener('leavepictureinpicture', onLeavePip);
  }, []);

  const openMiniMode = () => {
    const width = 350;
    const height = 500;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    window.open(
      `${window.location.pathname}?mode=mini`, 
      'FocusFlowMini', 
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    );
  };

  return (
    <div className={`relative flex items-center justify-center ${isMini ? 'w-48 h-48' : 'w-64 h-64'}`}>
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
      
      {/* Time Text & Controls */}
      <div className="absolute flex flex-col items-center justify-center text-slate-700">
        <span className={`${isMini ? 'text-4xl' : 'text-6xl'} font-bold tracking-tighter font-mono`}>{timeString}</span>
        <span className="text-sm font-medium text-slate-400 mt-2 uppercase tracking-widest">
            {isActive ? 'Focusing' : 'Paused'}
        </span>
        
        {/* External Window Controls - Only show in Main Mode */}
        {!isMini && (
          <div className="flex gap-2 mt-3">
            <button 
              onClick={togglePiP}
              className={`p-2 rounded-full transition-all duration-200 ${isPipActive ? 'bg-indigo-100 text-indigo-600' : 'text-slate-300 hover:text-indigo-600 hover:bg-slate-50'}`}
              title={isPipActive ? "Close Floating Timer" : "Float Timer (PiP)"}
            >
              <PictureInPicture size={20} />
            </button>
            <button 
              onClick={openMiniMode}
              className="p-2 rounded-full text-slate-300 hover:text-indigo-600 hover:bg-slate-50 transition-all duration-200"
              title="Pop out Window"
            >
              <ExternalLink size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Hidden Canvas & Video for PiP Stream */}
      <canvas ref={canvasRef} width={500} height={500} className="hidden" />
      <video ref={videoRef} className="hidden" muted playsInline />
    </div>
  );
};