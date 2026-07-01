import React from 'react';

const SHAPES = [
  { text: '<div>', size: 'text-2xl md:text-3xl', color: 'text-blue-500/20', top: '15%', left: '5%', duration: '12s', delay: '0s' },
  { text: '{}', size: 'text-3xl md:text-4xl', color: 'text-yellow-500/20', top: '45%', left: '8%', duration: '16s', delay: '1s' },
  { text: 'const', size: 'text-xl md:text-2xl', color: 'text-emerald-500/20', top: '75%', left: '4%', duration: '14s', delay: '3s' },
  { text: '</p>', size: 'text-2xl md:text-3xl', color: 'text-pink-500/20', top: '20%', right: '6%', duration: '15s', delay: '2s' },
  { text: '[]', size: 'text-4xl md:text-5xl', color: 'text-indigo-500/20', top: '55%', right: '10%', duration: '18s', delay: '0.5s' },
  { text: '=>', size: 'text-2xl md:text-3xl', color: 'text-purple-500/20', top: '85%', right: '7%', duration: '13s', delay: '4s' },
];

export default function BackgroundCodingShapes() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {SHAPES.map((shape, idx) => (
        <span
          key={idx}
          className={`absolute font-mono font-black ${shape.size} ${shape.color} animate-float-symbol`}
          style={{
            top: shape.top,
            left: shape.left,
            right: shape.right,
            animationDuration: shape.duration,
            animationDelay: shape.delay,
            transformOrigin: 'center',
          }}
        >
          {shape.text}
        </span>
      ))}
    </div>
  );
}
