import AuthTransitionProvider from "@/components/auth/AuthTransitionProvider";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthTransitionProvider>{children}</AuthTransitionProvider>;
}