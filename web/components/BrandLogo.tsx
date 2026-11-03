import Image from "next/image"
import Link from "next/link"
import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand"

/** Intrinsic size matches logo aspect (~1024×369) */
const SIZES = {
  sm: { width: 167, height: 60, className: "h-9 w-auto sm:h-10" },
  md: { width: 239, height: 86, className: "h-12 w-auto sm:h-14" },
  /** Header mark */
  header: { width: 560, height: 202, className: "h-32 w-auto sm:h-36" },
  lg: { width: 500, height: 180, className: "h-16 w-auto sm:h-24 md:h-32" },
} as const

type BrandLogoProps = {
  size?: keyof typeof SIZES
  href?: string | null
  className?: string
  priority?: boolean
  /** Default left; use center for hero marks */
  align?: "left" | "center"
}

export function BrandLogo({
  size = "sm",
  href = "/",
  className = "",
  priority = false,
  align = "left",
}: BrandLogoProps) {
  const dims = SIZES[size]
  const objectAlign = align === "center" ? "object-center" : "object-left"
  const image = (
    <Image
      src={BRAND_LOGO_SRC}
      alt={BRAND_NAME}
      width={dims.width}
      height={dims.height}
      priority={priority}
      unoptimized
      className={`${dims.className} object-contain ${objectAlign} ${className}`}
    />
  )

  if (href === null) {
    return image
  }

  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight"
      aria-label={BRAND_NAME}
    >
      {image}
    </Link>
  )
}
