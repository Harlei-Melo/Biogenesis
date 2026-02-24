import { useState, useEffect } from 'react';

/**
 * Returns true when the viewport width ≤ breakpoint (default 768px).
 * Updates on resize.
 */
export function useIsMobile(breakpoint = 768): boolean {
    const [isMobile, setIsMobile] = useState(
        () => typeof window !== 'undefined' && window.innerWidth <= breakpoint,
    );

    useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
        const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mql.addEventListener('change', onChange);
        setIsMobile(mql.matches);
        return () => mql.removeEventListener('change', onChange);
    }, [breakpoint]);

    return isMobile;
}
