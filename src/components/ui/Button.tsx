import Link from "next/link";

type ButtonProps = {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
};

export default function Button({
  children,
  href,
  onClick,
  variant = "primary",
}: ButtonProps) {
  const styles = {
    primary: "bg-white text-slate-950 hover:bg-slate-200",
    secondary: "border border-slate-700 text-white hover:bg-slate-800",
    ghost: "text-slate-300 hover:bg-slate-800 hover:text-white",
  };

  const className = `rounded-lg px-4 py-2 text-sm font-medium transition ${styles[variant]}`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  );
}