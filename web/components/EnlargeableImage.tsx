"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Expand, X } from "lucide-react"

export function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string
  alt: string
  onClose: () => void
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 text-white transition-opacity hover:opacity-80"
        aria-label="Close enlarged image"
      >
        <X className="h-6 w-6" strokeWidth={1.75} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] object-contain shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      />
    </div>,
    document.body
  )
}

export function EnlargeableImage({
  src,
  alt,
  className,
  wrapClassName,
}: {
  src: string
  alt: string
  className?: string
  wrapClassName?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative block cursor-zoom-in overflow-hidden border border-line bg-white ${wrapClassName ?? ""}`}
        aria-label={`Enlarge ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={className} />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/10 transition-colors group-hover:bg-ink/25 sm:bg-ink/0">
          <Expand
            className="h-4 w-4 text-white opacity-90 drop-shadow transition-opacity group-hover:opacity-100 sm:opacity-0"
            strokeWidth={1.75}
          />
        </span>
      </button>
      {open ? (
        <ImageLightbox src={src} alt={alt} onClose={() => setOpen(false)} />
      ) : null}
    </>
  )
}
