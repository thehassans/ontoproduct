import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../api';

export default function VideoToaster() {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [videoProducts, setVideoProducts] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const navigate = useNavigate();

  // Position state
  const [position, setPosition] = useState({ x: window.innerWidth - 160, y: window.innerHeight - 300 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, currentX: position.x, currentY: position.y, hasMoved: false });
  const containerRef = useRef(null);

  useEffect(() => {
    // Fetch video products
    apiGet('/api/settings/website/content?page=home_video_products')
      .then(res => {
        const el = res?.content?.elements?.find(e => e.id === 'video_product_list');
        if (el?.text) {
          const list = JSON.parse(el.text);
          if (Array.isArray(list) && list.length > 0) {
            setVideoProducts(list);
            // Select random video
            const randomVid = list[Math.floor(Math.random() * list.length)];
            setSelectedVideo(randomVid);
          }
        }
      })
      .catch(err => console.error("Failed to load video toaster settings", err));
  }, []);

  useEffect(() => {
    // Center it somewhat or position relative to screen size
    setPosition({
      x: window.innerWidth > 500 ? window.innerWidth - 180 : window.innerWidth - 160,
      y: window.innerHeight - 300
    });
  }, []);

  useEffect(() => {
    if (selectedVideo && !isClosed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [selectedVideo, isClosed]);

  const handlePointerDown = (e) => {
    if (e.target.closest('button')) return; // ignore close button
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      currentX: position.x,
      currentY: position.y,
      hasMoved: false
    };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current.dragging) return;
    
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragRef.current.hasMoved = true;
    }
    
    let newX = dragRef.current.currentX + dx;
    let newY = dragRef.current.currentY + dy;
    
    // Bounds check
    const maxX = window.innerWidth - 140; // width
    const maxY = window.innerHeight - 250; // height
    if (newX < 0) newX = 0;
    if (newX > maxX) newX = maxX;
    if (newY < 0) newY = 0;
    if (newY > maxY) newY = maxY;

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e) => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleClick = () => {
    if (!dragRef.current.hasMoved && selectedVideo?.productId) {
      navigate(`/product/${selectedVideo.productId}`);
    }
  };

  if (!isVisible || isClosed || !selectedVideo) return null;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleClick}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: '140px',
        height: '250px',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
        zIndex: 9999,
        cursor: isDragging ? 'grabbing' : 'pointer',
        border: '2px solid white',
        animation: 'slideUpToaster 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        backgroundColor: '#000',
        touchAction: 'none', // Prevent scrolling while dragging
      }}
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
          top: '8px',
          right: '8px',
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          backgroundColor: 'rgba(0,0,0,0.6)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
          pointerEvents: 'none' // Let container handle events
        }}
        src={selectedVideo.videoUrl}
      />

      <style>{`
        @keyframes slideUpToaster {
          0% { transform: translateY(100px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
