"use client";

import * as React from "react";

export interface UserType {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
}

interface AuthContextType {
  user: UserType | null;
  isSignedIn: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  isSignedIn: false,
  isLoading: true,
  logout: async () => {},
  refresh: async () => {},
});

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: UserType | null;
}) {
  const [user, setUser] = React.useState<UserType | null>(initialUser);
  const [isLoading, setIsLoading] = React.useState(initialUser === null);

  const refresh = React.useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching user session:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!initialUser) {
      refresh();
    } else {
      setIsLoading(false);
    }
  }, [initialUser, refresh]);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      window.location.href = "/sign-in";
    } catch (error) {
      console.error("Logout request failed:", error);
    }
  };

  const value = React.useMemo(
    () => ({
      user,
      isSignedIn: !!user,
      isLoading,
      logout,
      refresh,
    }),
    [user, isLoading, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return React.useContext(AuthContext);
}

/**
 * Drop-in helper matching the pattern used in the marketing nav.
 */
export function Show({ when, children }: { when: "signed-in" | "signed-out"; children: React.ReactNode }) {
  const { isSignedIn, isLoading } = useAuth();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    if (when === "signed-out") {
      return <>{children}</>;
    }
    return null;
  }
  
  if (when === "signed-in") {
    return isSignedIn ? <>{children}</> : null;
  }
  if (when === "signed-out") {
    return !isSignedIn ? <>{children}</> : null;
  }
  return null;
}

export function SignedIn({ children }: { children: React.ReactNode }) {
  return <Show when="signed-in">{children}</Show>;
}

export function SignedOut({ children }: { children: React.ReactNode }) {
  return <Show when="signed-out">{children}</Show>;
}
