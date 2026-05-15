"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("eduBridgeToken");
    const email = localStorage.getItem("eduBridgeEmail");

    if (!token || !email) {
      router.push("/login");
      return;
    }

    // Optional: Verify token is still valid by making a request
    // This prevents users with expired tokens from accessing protected pages
    const verifyToken = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:9000'}/user-stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          // Token is invalid, redirect to login
          localStorage.removeItem("eduBridgeToken");
          localStorage.removeItem("eduBridgeEmail");
          router.push("/login");
        }
      } catch (error) {
        console.warn("Token verification failed:", error);
        // Don't redirect on network errors, just log
      }
    };

    verifyToken();
  }, [router]);
}