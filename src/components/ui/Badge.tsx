import type { HTMLAttributes, ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLSpanElement>;

export default function Badge({
  children,
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span className={`pn-badge ${className}`.trim()} {...props}>
      {children}
    </span>
  );
}
