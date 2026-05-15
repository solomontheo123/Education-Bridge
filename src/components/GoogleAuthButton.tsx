"use client";

import { useState } from "react";
import { GoogleLogin, GoogleOAuthProvider, CredentialResponse } from "@react-oauth/google";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:9000";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

interface GoogleAuthButtonProps {
  redirectTo?: string;
}

export default function GoogleAuthButton({ redirectTo = "/dashboard" }: GoogleAuthButtonProps) {
  const router = useRouter();
  const [error, setError] = useState("");

  const handleSuccess = async (credentialResponse: CredentialResponse | null) => {
    setError("");
    const token = credentialResponse?.credential;

    if (!token) {
      setError("Google authentication failed. Please try again.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.error || "Google authentication failed.");
      }

      localStorage.setItem("eduBridgeToken", data.access_token);
      if (data.email) {
        localStorage.setItem("eduBridgeEmail", data.email);
      }

      router.push(redirectTo);
    } catch (err: any) {
      setError(err?.message || "Google authentication failed. Please try again.");
    }
  };

  const handleError = () => {
    setError("Google authentication failed. Please try again.");
  };

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="text-sm text-red-600">
        Google sign-in is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your .env.local.
      </p>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="space-y-2">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          text="continue_with"
          size="large"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </GoogleOAuthProvider>
  );
}
