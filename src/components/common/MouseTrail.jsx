import React, { useEffect, useRef, useState } from 'react';

export default function MouseTrail() {
  const cursorDotRef = useRef(null);
  const cursorRingRef = useRef(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => {
      // Deteksi jika perangkat adalah mobile atau tablet (termasuk iPadOS yang mengaku macOS di Safari)
      const isMobileOrTablet = 
        /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));

      // Aktifkan kursor kustom hanya di layar desktop lebar (>= 1024px) dengan mouse/trackpad (pointer: fine)
      const isLargeScreen = window.innerWidth >= 1024;
      const matchesFine = window.matchMedia('(pointer: fine)').matches;
      setIsDesktop(!isMobileOrTablet && isLargeScreen && matchesFine);
    };

    check();
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('resize', check);
    };
  }, []);

  useEffect(() => {
    // 1. Sparkle explosion on pointerdown/click (works on touch and non-touch)
    const handlePointerDown = (e) => {
      const x = e.clientX;
      const y = e.clientY;
      if (typeof x !== 'number' || typeof y !== 'number') return;

      const colors = ['#FACC15', '#3B82F6', '#10B981', '#EC4899', '#6366F1', '#FFA500'];
      const count = 10;

      for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'click-particle';
        
        const size = Math.floor(Math.random() * 8) + 4; // 4px to 12px
        const color = colors[Math.floor(Math.random() * colors.length)];
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 60 + 30; // distance
        const dx = Math.cos(angle) * velocity;
        const dy = Math.sin(angle) * velocity;

        p.style.position = 'fixed';
        p.style.pointerEvents = 'none';
        p.style.zIndex = '99999';
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        p.style.backgroundColor = color;
        p.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        p.style.left = `${x - size / 2}px`;
        p.style.top = `${y - size / 2}px`;
        p.style.setProperty('--dx', `${dx}px`);
        p.style.setProperty('--dy', `${dy}px`);
        p.style.animation = 'click-particle-burst 0.55s cubic-bezier(0.1, 0.8, 0.3, 1) forwards';

        document.body.appendChild(p);
        setTimeout(() => p.remove(), 550);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });

    if (!isDesktop) {
      return () => {
        window.removeEventListener('pointerdown', handlePointerDown);
      };
    }

    // 2. Hide default browser cursor & setup hover trail for desktop
    document.documentElement.classList.add('neo-cursor-sparkle');
    document.body.classList.add('neo-cursor-sparkle');

    let lastTime = 0;
    const colors = ['#FACC15', '#3B82F6', '#10B981', '#EC4899', '#6366F1'];

    // Track mouse movement
    const handleMouseMove = (e) => {
      const x = e.clientX;
      const y = e.clientY;

      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        cursorDotRef.current.style.opacity = '1';
      }
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

      const size = Math.floor(Math.random() * 6) + 5;
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
      setTimeout(() => particle.remove(), 600);
    };

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

    const handleMouseDown = () => {
      if (cursorRingRef.current) cursorRingRef.current.classList.add('cursor-clicked');
      if (cursorDotRef.current) cursorDotRef.current.classList.add('cursor-clicked');
    };

    const handleMouseUp = () => {
      if (cursorRingRef.current) cursorRingRef.current.classList.remove('cursor-clicked');
      if (cursorDotRef.current) cursorDotRef.current.classList.remove('cursor-clicked');
    };

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
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isDesktop]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes click-particle-burst {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate3d(var(--dx), var(--dy), 0) scale(0.2);
            opacity: 0;
          }
        }
      `}} />
      {isDesktop && (
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
      )}
    </>
  );
}
