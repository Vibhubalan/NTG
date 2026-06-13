type Props = {
  path: string;
  title?: string;
  className?: string;
};

export default function BrandIcon({ path, title, className = "h-6 w-6" }: Props) {
  return (
    <svg
      role={title ? "img" : "presentation"}
      aria-label={title}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      className={className}
    >
      {title ? <title>{title}</title> : null}
      <path d={path} />
    </svg>
  );
}
