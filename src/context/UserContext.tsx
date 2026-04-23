"use client";

import React, { createContext, useContext, useState, useEffect, startTransition } from "react";
import { OnboardingData } from "@/lib/schema";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";

interface UserContextType {
  userData: OnboardingData;
  setUserData: (data: OnboardingData) => void;
  isComplete: boolean;
  isHydrated: boolean;
  onboardingComplete: boolean;
  setOnboardingComplete: (complete: boolean) => void;
  user: User | null;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {

  const [userData, setUserData] = useState<OnboardingData>({
    education: "",
    interests: "",
    barriers: "",
  });

  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("onboardingData");
    const savedOnboardingState = localStorage.getItem("onboardingComplete");

    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        startTransition(() => {
          setUserData(parsed);
        });

      } catch (e) {
        console.error("Failed to parse user data", e);
      }
    }

    if (savedOnboardingState === "true") {
      startTransition(() => {
        setOnboardingComplete(true);
      });
    }

    startTransition(() => {
      setIsHydrated(true);
    });

  }, []);

  // Auth state listener
  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("onboardingData", JSON.stringify(userData));
      localStorage.setItem("onboardingComplete", JSON.stringify(onboardingComplete));
    }
  }, [userData, isHydrated, onboardingComplete]);
   const isComplete = Boolean(
  userData.education?.trim() && 
  userData.interests?.trim() && 
  userData.barriers?.trim()
);

  return (
    <UserContext.Provider
      value={{ userData, setUserData, isComplete, isHydrated, onboardingComplete, setOnboardingComplete, user, loading }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}