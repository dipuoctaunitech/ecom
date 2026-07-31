"use client";

import { useMemo, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { Star, Trash2 } from "lucide-react";
import type { ProductReview, ProductReviewSummary } from "@shared/types";
import {
  createProductReview,
  deleteProductReview,
} from "@/app/actions/review";

interface ProductReviewsProps {
  productId: string;
  initialReviews: ProductReview[];
  initialSummary: ProductReviewSummary;
}

function Stars({
  value,
  interactive = false,
  onChange,
  size = "md",
}: {
  value: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  size?: "sm" | "md";
}) {
  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";

  return (
    <div className="inline-flex items-center gap-0.5" role={interactive ? "radiogroup" : "img"} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        const content = (
          <Star
            className={`${iconClass} ${
              filled ? "text-ink fill-ink" : "text-line"
            }`}
            strokeWidth={1.5}
          />
        );

        if (!interactive || !onChange) {
          return <span key={star}>{content}</span>;
        }

        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            onClick={() => onChange(star)}
            className="rounded p-0.5 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function ProductReviews({
  productId,
  initialReviews,
  initialSummary,
}: ProductReviewsProps) {
  const { data: session, status } = useSession();
  const [reviews, setReviews] = useState(initialReviews);
  const [summary, setSummary] = useState(initialSummary);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const ownReview = useMemo(
    () => reviews.find((review) => review.isOwn) ?? null,
    [reviews]
  );

  const canReview = status === "authenticated" && !ownReview;

  function refreshSummary(nextReviews: ProductReview[]) {
    if (nextReviews.length === 0) {
      setSummary({ averageRating: 0, reviewCount: 0 });
      return;
    }

    const total = nextReviews.reduce((sum, review) => sum + review.rating, 0);
    setSummary({
      averageRating: Math.round((total / nextReviews.length) * 10) / 10,
      reviewCount: nextReviews.length,
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        const result = await createProductReview({
          productId,
          rating,
          title,
          comment,
        });
        const nextReviews = [result.review, ...reviews];
        setReviews(nextReviews);
        refreshSummary(nextReviews);
        setTitle("");
        setComment("");
        setRating(5);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to post review.");
      }
    });
  }

  function handleDelete(reviewId: string) {
    setError("");

    startTransition(async () => {
      try {
        await deleteProductReview(reviewId);
        const nextReviews = reviews.filter((review) => review.id !== reviewId);
        setReviews(nextReviews);
        refreshSummary(nextReviews);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete review."
        );
      }
    });
  }

  return (
    <section className="mt-16 border-t border-line pt-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
            Ratings & Reviews
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            What customers are saying about this product.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {summary.reviewCount > 0 ? (
            <>
              <Stars value={Math.round(summary.averageRating)} />
              <div className="text-sm text-ink">
                <span className="font-medium tabular-nums">
                  {summary.averageRating.toFixed(1)}
                </span>
                <span className="text-ink-muted">
                  {" "}
                  · {summary.reviewCount} review
                  {summary.reviewCount === 1 ? "" : "s"}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-muted">No reviews yet</p>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {status === "unauthenticated" && (
        <p className="mt-8 text-sm text-ink-muted">
          Sign in to leave a rating and comment.
        </p>
      )}

      {ownReview && (
        <p className="mt-8 text-sm text-ink-muted">
          You already reviewed this product. You can delete your review below to
          write a new one.
        </p>
      )}

      {canReview && (
        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-4 border border-line bg-surface p-6"
        >
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Your rating
            </label>
            <div className="mt-2">
              <Stars value={rating} interactive onChange={setRating} />
            </div>
          </div>

          <div>
            <label
              htmlFor="review-title"
              className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted"
            >
              Title <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <input
              id="review-title"
              type="text"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sum up your experience"
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="review-comment"
              className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted"
            >
              Comment
            </label>
            <textarea
              id="review-comment"
              required
              rows={4}
              value={comment}
              maxLength={2000}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share details that would help other shoppers"
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isPending || !comment.trim()}
            className="border border-ink bg-ink px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Posting…" : "Post Review"}
          </button>
        </form>
      )}

      <div className="mt-10 space-y-6">
        {reviews.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Be the first to rate this product.
          </p>
        ) : (
          reviews.map((review) => (
            <article
              key={review.id}
              className="border-b border-line pb-6 last:border-b-0 last:pb-0"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Stars value={review.rating} size="sm" />
                  {review.title && (
                    <h3 className="mt-2 font-display text-base font-medium text-ink">
                      {review.title}
                    </h3>
                  )}
                  <p className="mt-1 text-xs text-ink-muted">
                    {review.userName}
                    <span className="mx-1.5">·</span>
                    {formatDate(review.createdAt)}
                  </p>
                </div>

                {(review.isOwn || session?.user?.role === "ADMIN") && (
                  <button
                    type="button"
                    onClick={() => handleDelete(review.id)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 text-xs text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
                    aria-label="Delete review"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Delete
                  </button>
                )}
              </div>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
                {review.comment}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
