import { useState, useRef, useEffect } from 'react';

function useFPS() {
    const [fps, setFps] = useState(0);
    const frameCount = useRef(0);
    const lastTime = useRef(performance.now());
    const rafId = useRef();

    useEffect(() => {
        const measure = () => {
            frameCount.current += 1;
            const now = performance.now();
            const delta = now - lastTime.current;

            if (delta >= 1000) {
                setFps(frameCount.current);
                console.log("FPS:", frameCount.current);
                frameCount.current = 0;
                lastTime.current = now;
            }

            rafId.current = requestAnimationFrame(measure);
        };

        rafId.current = requestAnimationFrame(measure);

        // Cleanup on unmount
        return () => {
            cancelAnimationFrame(rafId.current);
        };
    }, []);

    return fps;
}

export default useFPS;