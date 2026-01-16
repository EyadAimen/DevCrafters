
import React, { createContext, useContext, useState, useCallback } from 'react';
import { LayoutRectangle, View } from 'react-native';

type TargetLayout = {
    x: number;
    y: number;
    width: number;
    height: number;
};

type TourContextType = {
    targets: Record<string, TargetLayout>;
    registerTarget: (id: string, layout: TargetLayout) => void;
    unregisterTarget: (id: string) => void;
    measureAndRegister: (id: string, view: View | null) => void;
};

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [targets, setTargets] = useState<Record<string, TargetLayout>>({});

    const registerTarget = useCallback((id: string, layout: TargetLayout) => {
        // Only update if changed significantly to avoid loops
        setTargets((prev) => {
            const current = prev[id];
            if (
                current &&
                Math.abs(current.x - layout.x) < 2 &&
                Math.abs(current.y - layout.y) < 2 &&
                Math.abs(current.width - layout.width) < 2 &&
                Math.abs(current.height - layout.height) < 2
            ) {
                return prev;
            }
            console.log(`[TourContext] Registering target: ${id}`, layout);
            return { ...prev, [id]: layout };
        });
    }, []);

    const unregisterTarget = useCallback((id: string) => {
        setTargets((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    }, []);

    const measureAndRegister = useCallback((id: string, view: View | null) => {
        if (!view) return;

        // We need absolute coordinates on screen
        view.measureInWindow((x, y, width, height) => {
            if (width > 0 && height > 0) {
                registerTarget(id, { x, y, width, height });
            }
        });
    }, [registerTarget]);

    return (
        <TourContext.Provider value={{ targets, registerTarget, unregisterTarget, measureAndRegister }}>
            {children}
        </TourContext.Provider>
    );
};

export const useTour = () => {
    const context = useContext(TourContext);
    if (!context) {
        throw new Error('useTour must be used within a TourProvider');
    }
    return context;
};
