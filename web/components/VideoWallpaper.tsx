"use client";

import { useEffect, useRef } from "react";

interface VideoWallpaperProps {
  src: string;
  /** Extra classes on the outer wrapper (positioning, z-index, opacity). */
  className?: string;
  /** When true, uses fixed inset-0 (page-wide wallpaper). */
  fixed?: boolean;
  /** Opacity 0–1 applied to the video. Default 1. */
  opacity?: number;
  /** Optional poster / fallback still while the video loads. */
  poster?: string;
}

/**
 * Muted, looping, autoplay video background for heroes and page wallpapers.
 */
export function VideoWallpaper({
  src,
  className = "",
  fixed = false,
  opacity = 1,
  poster,
}: VideoWallpaperProps) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    void video.play().catch(() => {});
  }, [src]);

  return (
    <div
      className={`${
        fixed ? "pointer-events-none fixed inset-0" : "absolute inset-0"
      } overflow-hidden ${className}`}
      style={{ opacity }}
      aria-hidden
    >
      <video
        ref={ref}
        className="h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={poster}
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
}
