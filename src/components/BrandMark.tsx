import Image from "next/image";

type Props = {
  className?: string;
  size?: number;
  variant?: "icon" | "full";
};

/** Logo officiel DripMyCard (fichiers dans /public/branding). */
export function BrandMark({
  className = "",
  size = 40,
  variant = "icon",
}: Props) {
  if (variant === "full") {
    return (
      <Image
        src="/branding/logo-horizontal-fond-clair.png"
        alt="dripmycard"
        width={200}
        height={42}
        className={`h-9 w-auto max-w-[200px] ${className}`}
        priority
      />
    );
  }

  return (
    <Image
      src="/branding/app-icon.png"
      alt=""
      width={size}
      height={size}
      className={`rounded-xl ${className}`}
      aria-hidden
    />
  );
}
