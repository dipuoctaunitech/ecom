"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Image from "next/image";
import { ZoomIn, ZoomOut } from "lucide-react";

interface ProductImageZoomProps {
  src: string;
  alt: string;
}

export function ProductImageZoom({ src, alt }: ProductImageZoomProps) {
  const [mounted, setMounted] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState("50% 50%");

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleZoomMove(event: MouseEvent<HTMLDivElement>) {
    if (!isZoomed) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    setZoomOrigin(`${x}% ${y}%`);
  }

  return (
    <div className="space-y-3">
      <div
        className={`relative aspect-[4/5] overflow-hidden rounded-xl bg-[#eceae7] ${
          mounted
            ? isZoomed
              ? "cursor-zoom-out"
              : "cursor-zoom-in"
            : ""
        }`}
        onMouseMove={mounted ? handleZoomMove : undefined}
        onMouseLeave={mounted ? () => setZoomOrigin("50% 50%") : undefined}
      >
        {mounted && (
          <button
            type="button"
            onClick={() => setIsZoomed((value) => !value)}
            className="absolute right-3 top-3 z-10 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-ink shadow-sm transition hover:bg-white"
            aria-pressed={isZoomed}
            aria-label={
              isZoomed ? "Zoom out product image" : "Zoom in product image"
            }
          >
            {isZoomed ? (
              <ZoomOut className="h-3.5 w-3.5" strokeWidth={1.75} />
            ) : (
              <ZoomIn className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
            {isZoomed ? "Zoom Out" : "Zoom In"}
          </button>
        )}

        <div
          className={`relative h-full w-full transition-transform duration-200 ${
            mounted && isZoomed ? "scale-[2.2]" : "scale-100"
          }`}
          style={mounted ? { transformOrigin: zoomOrigin } : undefined}
        >
          <Image
            src={src}
            alt={alt}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      </div>

      {mounted && (
        <p className="text-xs text-ink-muted">
          Use the zoom button, then move your pointer over the image for a closer
          look.
        </p>
      )}
    </div>
  );
}
