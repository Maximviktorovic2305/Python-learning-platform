import Image from "next/image";

export function PythonLogo({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/python-logo.svg"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className={className}
      unoptimized
    />
  );
}
