"use client";

import React, { useState, useEffect, useRef } from "react";
import Image, { ImageProps } from "next/image";

interface LazyImageProps extends Omit<ImageProps, "src"> {
  src: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  onError,
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsVisible(entry.isIntersecting);
      },
      {
        rootMargin: "200px", // Pre-load 200px before appearing, and unload when off-screen
      }
    );

    const el = containerRef.current;
    if (el) {
      observer.observe(el);
    }

    return () => {
      if (el) {
        observer.unobserve(el);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {isVisible ? (
        <Image
          {...props}
          src={src}
          alt={alt}
          className={className}
          onError={onError}
        />
      ) : (
        <div className="absolute inset-0 bg-zinc-950/40 animate-pulse rounded-md" />
      )}
    </div>
  );
};
