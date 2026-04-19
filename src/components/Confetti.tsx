"use client";
import { useMemo } from "react";

export function Confetti() {
  const particles = useMemo(() => {
    const colors = ["#00E676", "#00BCD4", "#FFB74D", "#E040FB", "#FF6B6B", "#ffffff"];
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 3,
      dur: 3 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.random() * 6,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: -20,
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            borderRadius: 2,
            animation: `confetti ${p.dur}s ${p.delay}s linear infinite`,
          }}
        />
      ))}
    </div>
  );
}
