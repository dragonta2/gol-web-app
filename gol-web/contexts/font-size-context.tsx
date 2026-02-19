'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type FontSize = 'small' | 'medium' | 'large';

interface FontSizeContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>('medium');

  useEffect(() => {
    const savedFontSize = localStorage.getItem('fontSize') as FontSize;
    if (savedFontSize && ['small', 'medium', 'large'].includes(savedFontSize)) {
      queueMicrotask(() => setFontSizeState(savedFontSize));
    }
  }, []);

  useEffect(() => {
    // フォントサイズをbodyに適用
    document.documentElement.setAttribute('data-font-size', fontSize);
    localStorage.setItem('fontSize', fontSize);
  }, [fontSize]);

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
  };

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (context === undefined) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
}
