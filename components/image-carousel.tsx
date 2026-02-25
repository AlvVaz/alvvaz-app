"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type CarouselImage = {
  src: string;
  alt: string;
};

type ImageCarouselProps = {
  images: CarouselImage[];
  className?: string;
  aspectClassName?: string;
  roundedClassName?: string;
  autoPlay?: boolean;
  interval?: number;
  showControls?: boolean;
  showIndicators?: boolean;
  priority?: boolean;
  ariaLabel?: string;
};

export function ImageCarousel({
  images,
  className,
  aspectClassName = "aspect-[16/9]",
  roundedClassName = "rounded-[32px]",
  autoPlay = false,
  interval = 6000,
  showControls = true,
  showIndicators = true,
  priority = false,
  ariaLabel = "Galería de imágenes",
}: ImageCarouselProps) {
  const [index, setIndex] = useState(() => (images.length <= 1 ? 0 : 1));
  const [isTransitioning, setIsTransitioning] = useState(true);
  const length = images.length;
  const navigationLock = useRef(false);
  const preloadedSrcSet = useRef(new Set<string>());

  const slideImages = useMemo(() => {
    if (length <= 1) return images;
    const first = images[0];
    const last = images[length - 1];
    return [last, ...images, first];
  }, [images, length]);

  useEffect(() => {
    if (!autoPlay || length <= 1) return;

    const id = window.setInterval(() => {
      if (navigationLock.current) return;
      navigationLock.current = true;
      setIsTransitioning(true);
      setIndex((current) => current + 1);
      window.setTimeout(() => {
        navigationLock.current = false;
      }, 350);
    }, interval);

    return () => window.clearInterval(id);
  }, [autoPlay, interval, length]);

  useEffect(() => {
    if (!isTransitioning) {
      const id = window.requestAnimationFrame(() => setIsTransitioning(true));
      return () => window.cancelAnimationFrame(id);
    }
  }, [isTransitioning]);

  const activeIndex = length > 1 ? (index - 1 + length) % length : index;

  const preloadSrc = useCallback((src: string) => {
    if (!src || preloadedSrcSet.current.has(src)) return;
    preloadedSrcSet.current.add(src);
    const img = new window.Image();
    img.decoding = "async";
    img.src = src;
  }, []);

  useEffect(() => {
    if (length === 0) return;

    if (priority) {
      for (const image of images) preloadSrc(image.src);
      return;
    }

    const next = (activeIndex + 1) % length;
    const prev = (activeIndex - 1 + length) % length;

    preloadSrc(images[activeIndex]?.src ?? "");
    preloadSrc(images[next]?.src ?? "");
    preloadSrc(images[prev]?.src ?? "");
  }, [activeIndex, images, length, preloadSrc, priority]);

  if (length === 0) return null;

  const lockNavigation = () => {
    if (navigationLock.current) return false;
    navigationLock.current = true;
    window.setTimeout(() => {
      navigationLock.current = false;
    }, 350);
    return true;
  };

  const handlePrev = () => {
    if (!lockNavigation()) return;
    setIsTransitioning(true);
    setIndex((current) => current - 1);
  };

  const handleNext = () => {
    if (!lockNavigation()) return;
    setIsTransitioning(true);
    setIndex((current) => current + 1);
  };

  const handleTransitionEnd = () => {
    if (length <= 1) return;
    const lastIndex = slideImages.length - 1;
    if (index === 0) {
      setIsTransitioning(false);
      setIndex(length);
    }
    if (index === lastIndex) {
      setIsTransitioning(false);
      setIndex(1);
    }
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-white",
        roundedClassName,
        aspectClassName,
        className
      )}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
    >
      <div
        className={cn(
          "flex h-full w-full ease-out will-change-transform",
          isTransitioning ? "transition-transform duration-300" : "transition-none"
        )}
        style={{ transform: `translateX(-${index * 100}%)` }}
        onTransitionEnd={handleTransitionEnd}
      >
        {slideImages.map((image, imageIndex) => (
          <div
            key={`${image.src}-${imageIndex}`}
            className="relative h-full w-full flex-shrink-0 bg-brand-100/30"
            aria-hidden={index !== imageIndex}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority={priority && (length <= 1 ? imageIndex === 0 : imageIndex === 1)}
              className="object-cover"
              loading={priority ? undefined : imageIndex <= 2 ? "eager" : "lazy"}
              sizes="(max-width: 768px) 100vw, 60vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-950/40 via-transparent to-transparent" />
          </div>
        ))}
      </div>

      {showControls && length > 1 ? (
        <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between px-3">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Imagen anterior"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/80 text-brand-950 transition-all duration-200 hover:bg-white sm:h-9 sm:w-9"
          >
            <span aria-hidden="true">&lt;</span>
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Imagen siguiente"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/80 text-brand-950 transition-all duration-200 hover:bg-white sm:h-9 sm:w-9"
          >
            <span aria-hidden="true">&gt;</span>
          </button>
        </div>
      ) : null}

      {showIndicators && length > 1 ? (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2">
          {images.map((_, dotIndex) => (
            <button
              key={`dot-${dotIndex}`}
              type="button"
              onClick={() => {
                if (!lockNavigation()) return;
                setIsTransitioning(true);
                setIndex(dotIndex + 1);
              }}
              aria-label={`Ir a imagen ${dotIndex + 1}`}
              className={cn(
                "h-2 w-2 rounded-full transition-all duration-200",
                dotIndex === activeIndex ? "w-6 bg-white" : "bg-white/60 hover:bg-white"
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
