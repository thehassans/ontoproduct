import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function VideoToaster() {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Delay showing the toaster to catch user attention
    const timer = setTimeout(() => {
      if (!isClosed) setIsVisible(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isClosed]);

  if (!isVisible || isClosed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px', // Above mobile bottom nav
        right: '16px',
        width: '110px',
        height: '160px',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
        zIndex: 9999,
        cursor: 'pointer',
        border: '2px solid white',
        animation: 'slideUpToaster 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        backgroundColor: '#000',
      }}
      onClick={() => navigate('/catalog')}
    >
      {/* Close Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsVisible(false);
          setIsClosed(true);
        }}
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          color: 'white',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      {/* Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
      />

      {/* Product Info / Call to Action */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
          padding: '24px 8px 8px',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#fbbf24', marginBottom: '2px' }}>
          Trending
        </div>
        <div style={{ fontSize: '12px', fontWeight: 700, lineHeight: 1.2 }}>
          Shop Now
        </div>
      </div>

      <style>{`
        @keyframes slideUpToaster {
          0% { transform: translateY(100px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
