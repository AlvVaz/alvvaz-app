"use client";

import HTMLFlipBook from "react-pageflip";
import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

type MagazinePage = {
  id: string;
  pageNumber: number;
  imageUrl: string;
  title?: string;
};

type FlipBookProps = {
  pages: MagazinePage[];
  className?: string;
};

const PORTRAIT_RATIO = 2 / 3;
const MAX_BOOK_WIDTH = 1200;
const BOOK_GUTTER = 24;
const MOBILE_BREAKPOINT = 768;

const FlipPage = forwardRef<HTMLDivElement, MagazinePage>(({ imageUrl, title, pageNumber }, ref) => (
  <div ref={ref} className="h-full w-full bg-white">
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
      <img
        src={imageUrl}
        alt={title ? `${title} — Página ${pageNumber}` : `Página ${pageNumber}`}
        className="h-full w-full object-contain"
        loading={pageNumber <= 2 ? "eager" : "lazy"}
      />
      <span className="absolute bottom-4 right-5 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 shadow-sm">
        {pageNumber}
      </span>
    </div>
  </div>
));
FlipPage.displayName = "FlipPage";

export function FlipBook({ pages, className }: FlipBookProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const element = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const sizing = useMemo(() => {
    const safeWidth = Math.max(containerWidth, 320);
    const isMobile = safeWidth < MOBILE_BREAKPOINT;
    const bookWidth = Math.min(safeWidth, MAX_BOOK_WIDTH);
    const pageWidth = isMobile ? bookWidth : (bookWidth - BOOK_GUTTER) / 2;
    const pageHeight = pageWidth / PORTRAIT_RATIO;

    return {
      isMobile,
      pageWidth,
      pageHeight,
      minWidth: Math.max(260, pageWidth * 0.8),
      minHeight: Math.max(380, pageHeight * 0.8),
      maxWidth: pageWidth,
      maxHeight: pageHeight,
    };
  }, [containerWidth]);

  const wrapperStyle = useMemo<CSSProperties>(
    () => ({
      paddingBottom: sizing.pageHeight ? Math.round(sizing.pageHeight * 0.04) : undefined,
    }),
    [sizing.pageHeight]
  );

  return (
    <div ref={containerRef} className={className} style={wrapperStyle}>
      <HTMLFlipBook
        width={Math.round(sizing.pageWidth)}
        height={Math.round(sizing.pageHeight)}
        size="stretch"
        minWidth={Math.round(sizing.minWidth)}
        maxWidth={Math.round(sizing.maxWidth)}
        minHeight={Math.round(sizing.minHeight)}
        maxHeight={Math.round(sizing.maxHeight)}
        startPage={0}
        flippingTime={700}
        startZIndex={0}
        autoSize
        maxShadowOpacity={0.35}
        showCover={false}
        mobileScrollSupport
        drawShadow
        usePortrait={sizing.isMobile}
        useMouseEvents
        swipeDistance={30}
        clickEventForward
        showPageCorners
        disableFlipByClick={false}
        className="mx-auto"
        style={{}}
        onFlip={() => {
          // TODO: Analytics tracking for page turns.
        }}
      >
        {pages.map((page) => (
          <FlipPage key={page.id} {...page} />
        ))}
      </HTMLFlipBook>
    </div>
  );
}
