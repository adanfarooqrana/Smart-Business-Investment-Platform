import React, { useRef, useEffect } from 'react';
import './ShapeGrid.css';

interface Particle {
  angle: number;
  radius: number;
  length: number;
  width: number;
  speed: number;
  color: string;
  offsetX: number;
  offsetY: number;
  vx: number;
  vy: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
}

export interface ShapeGridProps {
  direction?: 'diagonal' | 'up' | 'down' | 'left' | 'right';
  speed?: number;
  borderColor?: string;
  squareSize?: number;
  hoverFillColor?: string;
  shape?: 'square' | 'hexagon' | 'circle' | 'triangle';
  hoverTrailAmount?: number;
  className?: string;
}

// Interactive Google Antigravity-style Concentric Particle Flow component
// Styled in light orange/amber/gold and includes a white-out masking click shockwave.
const ShapeGrid: React.FC<ShapeGridProps> = ({
  speed = 1,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const vortexCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Center the swirl in the upper-left quadrant to match the Antigravity style
    vortexCenter.current = {
      x: canvas.offsetWidth * 0.12,
      y: canvas.offsetHeight * 0.28
    };

    const getOrangeLightColor = (radius: number, angle: number) => {
      // Interpolate colors based on radius and angle to create a gorgeous warm sweeping gradient
      const factor = (radius / (Math.max(canvas.offsetWidth, canvas.offsetHeight) * 1.2) + (angle + Math.PI) / (Math.PI * 2)) / 2;
      
      // Hues: 10 (deep coral/red-orange) -> 26 (orange) -> 38 (warm amber) -> 48 (bright yellow-gold)
      const h = 10 + (factor % 1) * 38;
      const s = 88 + Math.random() * 12;
      const l = 50 + Math.random() * 14;
      const alpha = 0.45 + Math.random() * 0.45;
      return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
    };

    const initParticles = () => {
      const tempParticles: Particle[] = [];
      const width = canvas.width;
      const height = canvas.height;

      const step = 22; // Concentric ring distance
      const maxRadius = Math.max(width, height) * 1.4;

      for (let r = 80; r < maxRadius; r += step) {
        const circumference = 2 * Math.PI * r;
        const numParticlesInRing = Math.floor(circumference / (40 + Math.random() * 25));

        for (let i = 0; i < numParticlesInRing; i++) {
          const angle = (i / numParticlesInRing) * Math.PI * 2 + (Math.random() - 0.5) * 0.08;
          tempParticles.push({
            angle: angle,
            radius: r + (Math.random() - 0.5) * 8, // Jitter
            length: 5 + Math.random() * 8,
            width: 1.2 + Math.random() * 1.3,
            speed: ((0.06 + Math.random() * 0.08) / r) * speed, // Orbital speed
            color: getOrangeLightColor(r, angle),
            offsetX: 0,
            offsetY: 0,
            vx: 0,
            vy: 0,
          });
        }
      }
      particlesRef.current = tempParticles;
    };

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      vortexCenter.current = {
        x: canvas.width * 0.12,
        y: canvas.height * 0.28
      };
      initParticles();
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const center = vortexCenter.current;
      const mouse = mouseRef.current;

      // Draw all particle dashes
      particlesRef.current.forEach(p => {
        p.angle += p.speed; // Orbital movement

        const baseX = center.x + p.radius * Math.cos(p.angle);
        const baseY = center.y + p.radius * Math.sin(p.angle);

        const currentX = baseX + p.offsetX;
        const currentY = baseY + p.offsetY;

        // Mouse force field repulsion
        if (mouse) {
          const dx = currentX - mouse.x;
          const dy = currentY - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 130;

          if (dist < maxDist) {
            const force = (maxDist - dist) / maxDist;
            p.vx += (dx / (dist || 1)) * force * 0.9;
            p.vy += (dy / (dist || 1)) * force * 0.9;
          }
        }

        // Apply friction and restore base position forces
        p.vx *= 0.88;
        p.vy *= 0.88;

        p.offsetX += p.vx;
        p.offsetY += p.vy;

        p.offsetX += (0 - p.offsetX) * 0.06;
        p.offsetY += (0 - p.offsetY) * 0.06;

        // Draw particle dash aligned tangentially to the orbit
        const dirAngle = p.angle + Math.PI / 2;
        const halfL = p.length / 2;

        const startX = currentX - halfL * Math.cos(dirAngle);
        const startY = currentY - halfL * Math.sin(dirAngle);
        const endX = currentX + halfL * Math.cos(dirAngle);
        const endY = currentY + halfL * Math.sin(dirAngle);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.lineWidth = p.width;
        ctx.strokeStyle = p.color;
        ctx.lineCap = 'round';
        ctx.stroke();
      });

      // DRAW WHITE MASKING BUBBLES OVER THE PARTICLES
      // This instantly clears the particles around the click coordinate,
      // creating a gorgeous clean expanding "white only" circular spot.
      ripplesRef.current.forEach(ripple => {
        const bubbleRadius = ripple.radius * 0.95;
        if (bubbleRadius > 5) {
          const grad = ctx.createRadialGradient(
            ripple.x, ripple.y, 0,
            ripple.x, ripple.y, bubbleRadius
          );
          
          const opacity = (1 - ripple.radius / ripple.maxRadius);
          
          grad.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
          grad.addColorStop(0.8, `rgba(255, 255, 255, ${opacity * 0.95})`);
          grad.addColorStop(1, `rgba(255, 255, 255, 0)`);
          
          ctx.beginPath();
          ctx.arc(ripple.x, ripple.y, bubbleRadius, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }
      });

      // DRAW EXPANDING GOLDEN RIPPLE BORDERS
      ripplesRef.current.forEach(ripple => {
        const opacity = (1 - ripple.radius / ripple.maxRadius);
        if (opacity > 0.05) {
          ctx.beginPath();
          ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = `rgba(245, 158, 11, ${opacity * 0.15})`;
          ctx.stroke();
        }
      });

      // Subtle ambient vignette gradient overlay
      const gradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        Math.sqrt(canvas.width ** 2 + canvas.height ** 2) / 2
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const updateAnimation = () => {
      // Update ripple radius
      for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
        ripplesRef.current[i].radius += ripplesRef.current[i].speed;
        if (ripplesRef.current[i].radius > ripplesRef.current[i].maxRadius) {
          ripplesRef.current.splice(i, 1);
        }
      }

      drawParticles();
      requestRef.current = requestAnimationFrame(updateAnimation);
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = null;
    };

    const handleCanvasClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;

      // Register new expanding white masking ripple
      ripplesRef.current.push({
        x: clickX,
        y: clickY,
        radius: 0,
        maxRadius: Math.max(canvas.width, canvas.height) * 0.6,
        speed: 12
      });

      // Push surrounding particles outward physically
      particlesRef.current.forEach(p => {
        const center = vortexCenter.current;
        const px = center.x + p.radius * Math.cos(p.angle) + p.offsetX;
        const py = center.y + p.radius * Math.sin(p.angle) + p.offsetY;
        const dx = px - clickX;
        const dy = py - clickY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxShockRadius = 260;

        if (dist < maxShockRadius) {
          const force = (maxShockRadius - dist) / maxShockRadius;
          p.vx += (dx / (dist || 1)) * force * 15;
          p.vy += (dy / (dist || 1)) * force * 15;
        }
      });
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('click', handleCanvasClick);

    requestRef.current = requestAnimationFrame(updateAnimation);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [speed]);

  return <canvas ref={canvasRef} className={`shapegrid-canvas ${className}`}></canvas>;
};

export default ShapeGrid;
