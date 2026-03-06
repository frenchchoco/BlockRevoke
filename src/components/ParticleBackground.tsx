import { type ReactElement, useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
    hue: number;
}

const PARTICLE_COUNT = 35;
const CONNECTION_DISTANCE = 120;
const MOUSE_RADIUS = 200;

export function ParticleBackground(): ReactElement {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: -1000, y: -1000 });
    const particlesRef = useRef<Particle[]>([]);
    const frameRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = (): void => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Initialize particles
        particlesRef.current = Array.from({ length: PARTICLE_COUNT }, (): Particle => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            size: Math.random() * 2 + 0.5,
            opacity: Math.random() * 0.5 + 0.1,
            hue: Math.random() * 60 + 180, // Cyan to purple range
        }));

        const handleMouseMove = (e: MouseEvent): void => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener('mousemove', handleMouseMove);

        const animate = (): void => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const particles = particlesRef.current;
            const mouse = mouseRef.current;

            for (const p of particles) {
                // Mouse repulsion
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < MOUSE_RADIUS && dist > 0) {
                    const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS * 0.02;
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }

                // Damping
                p.vx *= 0.99;
                p.vy *= 0.99;

                p.x += p.vx;
                p.y += p.vy;

                // Wrap around edges
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                // Draw particle
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `oklch(0.78 0.12 ${p.hue} / ${p.opacity})`;
                ctx.fill();
            }

            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const a = particles[i] as Particle;
                    const b = particles[j] as Particle;
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < CONNECTION_DISTANCE) {
                        const alpha = (1 - dist / CONNECTION_DISTANCE) * 0.15;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.strokeStyle = `oklch(0.78 0.12 200 / ${alpha})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            frameRef.current = requestAnimationFrame(animate);
        };

        frameRef.current = requestAnimationFrame(animate);

        return (): void => {
            cancelAnimationFrame(frameRef.current);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="pointer-events-none fixed inset-0 z-0"
            style={{ opacity: 0.35 }}
        />
    );
}
