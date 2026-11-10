type Props = {
  className?: string;
  size?: number;
};

/** Symbole app / favicon DripMyCard (goutte volt). */
export function BrandMark({ className = "", size = 40 }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="512" height="512" rx="112" fill="#5B2EFF" />
      <path
        d="M256 88c0 0-92 156-92 248a92 92 0 1 0 184 0C348 244 256 88 256 88Z"
        fill="#F7F5F2"
      />
      <ellipse cx="214" cy="298" rx="22" ry="34" fill="#5B2EFF" opacity="0.22" />
    </svg>
  );
}
