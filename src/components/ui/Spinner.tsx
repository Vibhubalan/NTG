type SpinnerProps = {
  size?: "xs" | "sm" | "md";
  className?: string;
};

const SIZE_CLASSES: Record<NonNullable<SpinnerProps["size"]>, string> = {
  xs: "h-3 w-3 border",
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
};

/**
 * Minimal inline loading spinner. Inherits color from `currentColor`, so it
 * matches whatever text color the parent element sets (e.g. button text).
 */
export default function Spinner({ size = "sm", className = "" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-current border-t-transparent align-[-0.125em] ${SIZE_CLASSES[size]} ${className}`}
    />
  );
}
