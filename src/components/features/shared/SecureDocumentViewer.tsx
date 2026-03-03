import React, { useEffect, useState } from 'react';

interface SecureDocumentViewerProps {
  documentUrl: string;
  merchantName: string;
  expiresAt: Date;
}

/**
 * Secure Document Viewer
 * 
 * Frontend Security Strategy:
 * 
 * For React Native / Flutter (Mobile Apps):
 * - Android: Use `getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);`
 * - iOS: Use a blur overlay when `UIApplication.userDidTakeScreenshotNotification` is triggered or when app goes to background.
 * 
 * For Web (CityLink Web Portal):
 * - Disable right-click, text selection, and drag-and-drop.
 * - Add a dynamic watermark with the Merchant's name and IP/Timestamp to deter physical photos of the screen.
 * - Use CSS `filter: blur` when the window loses focus.
 */
export const SecureDocumentViewer: React.FC<SecureDocumentViewerProps> = ({ documentUrl, merchantName, expiresAt }) => {
  const [isFocused, setIsFocused] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Prevent right-click
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);

    // Timer for expiration
    const timer = setInterval(() => {
      const remaining = Math.max(0, expiresAt.getTime() - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(timer);
    }, 1000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      clearInterval(timer);
    };
  }, [expiresAt]);

  if (timeLeft === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-red-950/30 text-red-400 rounded-xl border border-red-900/50">
        <p className="font-semibold">Access Expired. Please request a new link.</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-4 select-none">
      {/* Header with Timer */}
      <div className="flex justify-between items-center mb-4 text-slate-300 text-sm">
        <span>Viewing securely as: <strong className="text-white">{merchantName}</strong></span>
        <span className="font-mono text-emerald-400">
          Expires in: {Math.ceil(timeLeft / 60000)}m
        </span>
      </div>

      {/* Document Container */}
      <div 
        className={`relative transition-all duration-200 ${!isFocused ? 'blur-md grayscale' : ''}`}
        onDragStart={(e) => e.preventDefault()}
      >
        {/* Dynamic Watermark Overlay to deter photos of the screen */}
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center opacity-20 rotate-[-30deg]">
          {Array.from({ length: 5 }).map((_, i) => (
            <p key={i} className="text-white text-3xl font-bold my-8 whitespace-nowrap">
              CONFIDENTIAL • {merchantName} • {new Date().toISOString().split('T')[0]}
            </p>
          ))}
        </div>

        {/* The actual document (Image or PDF rendered as image for security) */}
        <img 
          src={documentUrl} 
          alt="Secure Document" 
          className="w-full h-auto rounded pointer-events-none"
          draggable={false}
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Unfocused Warning */}
      {!isFocused && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <p className="text-white font-medium text-lg px-6 py-3 bg-slate-800 rounded-full shadow-2xl">
            Click to resume viewing
          </p>
        </div>
      )}
    </div>
  );
};

export default SecureDocumentViewer;
