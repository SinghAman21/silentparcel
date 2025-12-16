"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "motion/react";

type GitHubStarsProps = {
  repo: string;
  stargazersCount: number;
};

export default function GitHubStars({
  repo,
  stargazersCount,
}: GitHubStarsProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Smooth spring animation starting from 0
  const springValue = useSpring(0, {
    stiffness: 50,
    damping: 30,
    mass: 1,
  });

  // Transform the spring value to formatted display
  const displayValue = useTransform(springValue, (latest) =>
    new Intl.NumberFormat("en-US", {
      notation: "compact",
      compactDisplay: "short",
    })
      .format(Math.round(latest))
      .toLowerCase()
  );

  useEffect(() => {
    // Check if already in view on mount
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
      if (isVisible && !isInView) {
        setIsInView(true);
        // Small delay to ensure smooth start
        setTimeout(() => {
          springValue.set(stargazersCount);
        }, 100);
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isInView) {
          setIsInView(true);
          // Small delay to ensure smooth start
          setTimeout(() => {
            springValue.set(stargazersCount);
          }, 100);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [stargazersCount, isInView, springValue]);

  return (
    <div className="inline-block relative group">
      <motion.a
        ref={ref}
        href={`https://github.com/${repo}`}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="inline-flex items-center gap-2 text-gray-700 dark:text-stone-300 underline decoration-gray-500 dark:decoration-stone-400 decoration-[0.5px] underline-offset-4 transition-colors hover:text-gray-900 dark:hover:text-stone-200 hover:decoration-gray-700 dark:hover:decoration-stone-200 relative"
        whileHover={{ scale: 0.90 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        {/* GitHub Icon with smooth rotation */}
        <div className="relative">
          <motion.svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            className="relative z-10"
            animate={{
              rotate: isHovered ? [0, -12, 12, -8, 0] : 0,
            }}
            transition={{
              duration: 0.6,
              ease: "easeInOut",
            }}
          >
            <path
              d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
              fill="currentColor"
            />
          </motion.svg>

          {/* Star particles on hover */}
          {isHovered && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute top-1/2 left-1/2 w-1 h-1 bg-yellow-400 rounded-full"
                  initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                  animate={{
                    scale: [0, 1, 0],
                    x: Math.cos((i * Math.PI) / 3) * 20,
                    y: Math.sin((i * Math.PI) / 3) * 20,
                    opacity: [1, 1, 0],
                  }}
                  transition={{
                    duration: 0.6,
                    ease: "easeOut",
                    delay: i * 0.05,
                  }}
                />
              ))}
            </>
          )}
        </div>

        {/* Star count with smooth animation */}
        <motion.span
          className="text-sm font-medium tabular-nums relative z-10"
          animate={{
            scale: isHovered ? [1, 1.05, 1] : 1,
          }}
          transition={{
            duration: 0.3,
            ease: "easeInOut",
          }}
        >
          {displayValue}
        </motion.span>

        {/* Floating star icon */}
        <motion.svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="relative z-10"
          animate={
            isHovered
              ? {
                  y: [-2, -6, -2],
                  rotate: [0, 360],
                }
              : { y: 0, rotate: 0 }
          }
          transition={{
            duration: 0.8,
            ease: "easeInOut",
          }}
        >
          <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z" />
        </motion.svg>
      </motion.a>

      {/* Tooltip */}
      <motion.div
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs rounded-md whitespace-nowrap pointer-events-none shadow-lg z-50"
        initial={{ opacity: 0, y: 5, scale: 0.9 }}
        animate={
          isHovered
            ? { opacity: 1, y: 10, scale: 1 }
            : { opacity: 0, y: -5, scale: 0.8 }
        }
        transition={{ duration: 0.2 }}
      >
        {new Intl.NumberFormat("en-US").format(stargazersCount)} stars on GitHub
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900 dark:border-t-neutral-100" />
      </motion.div>
    </div>
  );
}
