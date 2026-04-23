"use client";
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto mt-20 p-8 border rounded-xl shadow-lg bg-white">
      <h1 className="text-2xl font-bold mb-6 text-center">Welcome to EduBridge</h1>
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={['google', 'github']} // You can add more later
        redirectTo="http://localhost:3000/roadmap"
      />
    </div>
  );
}