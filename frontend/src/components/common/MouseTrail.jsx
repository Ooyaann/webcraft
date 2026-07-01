import React, { useEffect, useRef } from 'react';

export default function MouseTrail() {
  const cursorDotRef = useRef(null);
  const cursorRingRef = useRef(null);

  useEffect(() => {
    // 1. Hide default browser cursor
    document.documentElement.classList.add('neo-cursor-sparkle');
    document.body.classList.add('neo-cursor-sparkle');

    let lastTime = 0;
    const colors = ['#FACC15', '#3B82F6', '#10B981', '#EC4899', '#6366F1'];

    // Track mouse movement — ring now moves instantly with cursor (no lag)
    const handleMouseMove = (e) => {
      const x = e.clientX;
      const y = e.clientY;

      // Update dot cursor instantly
      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        cursorDotRef.current.style.opacity = '1';
      }
      // Update ring cursor instantly (no lerp — precise with cursor)
      if (cursorRingRef.current) {
        cursorRingRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        cursorRingRef.current.style.opacity = '1';
      }

      // Sparkle particles logic
      const now = Date.now();
      if (now - lastTime < 45) return;
      lastTime = now;

      const particle = document.createElement('div');
      particle.className = 'mouse-particle';
      particle.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';

      const size = Math.floor(Math.random() * 6) + 5; // 5-11px — smaller
      const color = colors[Math.floor(Math.random() * colors.length)];
      const dx = (Math.random() - 0.5) * 60;
      const dy = (Math.random() - 0.5) * 60 - 30;

      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.backgroundColor = color;
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.setProperty('--dx', `${dx}px`);
      particle.style.setProperty('--dy', `${dy}px`);

      document.body.appendChild(particle);

      setTimeout(() => {
        particle.remove();
      }, 600);
    };

    // Hover state global event delegation
    const handleMouseOver = (e) => {
      const target = e.target;
      if (target && typeof target.closest === 'function') {
        const interactive = target.closest('button, a, input, select, textarea, [role="button"], .cursor-pointer');
        if (interactive) {
          if (cursorRingRef.current) cursorRingRef.current.classList.add('cursor-hover');
          if (cursorDotRef.current) cursorDotRef.current.classList.add('cursor-hover');
        }
      }
    };

    const handleMouseOut = (e) => {
      const target = e.target;
      if (target && typeof target.closest === 'function') {
        const interactive = target.closest('button, a, input, select, textarea, [role="button"], .cursor-pointer');
        if (interactive) {
          if (cursorRingRef.current) cursorRingRef.current.classList.remove('cursor-hover');
          if (cursorDotRef.current) cursorDotRef.current.classList.remove('cursor-hover');
        }
      }
    };

    // Click/Active state listeners
    const handleMouseDown = () => {
      if (cursorRingRef.current) cursorRingRef.current.classList.add('cursor-clicked');
      if (cursorDotRef.current) cursorDotRef.current.classList.add('cursor-clicked');
    };

    const handleMouseUp = () => {
      if (cursorRingRef.current) cursorRingRef.current.classList.remove('cursor-clicked');
      if (cursorDotRef.current) cursorDotRef.current.classList.remove('cursor-clicked');
    };

    // Handle mouse leaving and entering window
    const handleMouseLeave = () => {
      if (cursorRingRef.current) cursorRingRef.current.style.opacity = '0';
      if (cursorDotRef.current) cursorDotRef.current.style.opacity = '0';
    };

    const handleMouseEnter = () => {
      if (cursorRingRef.current) cursorRingRef.current.style.opacity = '1';
      if (cursorDotRef.current) cursorDotRef.current.style.opacity = '1';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseover', handleMouseOver);
    window.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      document.documentElement.classList.remove('neo-cursor-sparkle');
      document.body.classList.remove('neo-cursor-sparkle');
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, []);

  return (
    <>
      <div className="neo-custom-cursor-ring" ref={cursorRingRef}>
        <div className="neo-custom-cursor-ring-inner"></div>
      </div>
      <div className="neo-custom-cursor-dot" ref={cursorDotRef}>
        <div className="neo-custom-cursor-dot-inner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(1px 1px 0px #0F172A)' }}>
            <path d="M1 1L18 10L10 12L8 19L1 1Z" fill="#FACC15" stroke="#0F172A" strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </>
  );
}
