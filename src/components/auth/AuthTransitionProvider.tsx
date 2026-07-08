"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import AuthLogo from "@/components/auth/AuthLogo";
import { supabase } from "@/lib/supabase";

type AuthTransitionContextValue = {
  navigateAuth: (href: string) => void;
};

const AuthTransitionContext =
  createContext<AuthTransitionContextValue | null>(null);

export function useAuthTransition() {
  const context = useContext(AuthTransitionContext);

  if (!context) {
    throw new Error("useAuthTransition must be used inside AuthTransitionProvider");
  }

  return context;
}

export default function AuthTransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  function navigateAuth(href: string) {
    if (href === pathname) return;

    setExiting(true);

    window.setTimeout(() => {
      router.push(href);
    }, 140);
  }

  useEffect(() => {
    async function redirectLoggedInUser() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setCheckingAuth(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (profile?.onboarding_completed) {
        router.replace("/dashboard");
        return;
      }

      router.replace("/onboarding/genres");
    }

    redirectLoggedInUser();
  }, [router]);

  useEffect(() => {
    setExiting(false);
  }, [pathname]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (checkingAuth) {
    return (
      <main className="auth-page">
        <div className="auth-shell">
          <div className="auth-container">
            <div className="auth-static-logo">
              <AuthLogo />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <AuthTransitionContext.Provider value={{ navigateAuth }}>
      <main className="auth-page">
        <div className="auth-shell">
          <div className="auth-container">
            <div className="auth-static-logo">
              <AuthLogo />
            </div>

            <motion.div
              key={pathname}
              className="auth-card"
              initial={
                hasMounted
                  ? {
                      opacity: 0.96,
                      scale: 0.94,
                      filter: "blur(1px)",
                    }
                  : false
              }
              animate={
                exiting
                  ? {
                      opacity: 0.06,
                      scale: 0.94,
                      filter: "blur(1px)",
                    }
                  : {
                      opacity: 1,
                      scale: 1,
                      filter: "blur(0px)",
                    }
              }
              transition={{
                type: "spring",
                stiffness: 520,
                damping: 36,
                mass: 0.75,
              }}
            >
              {children}
            </motion.div>
          </div>
        </div>
      </main>
    </AuthTransitionContext.Provider>
  );
}