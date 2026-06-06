"use client";

import { useState } from "react";
import { login } from "./actions/auth";
import { useRouter } from "next/navigation";

export default function Home() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);
    const res = await login(formData);
    
    if (res?.error) {
      setError(res.error);
      setIsLoading(false);
    } else if (res?.success) {
      // Pomyślne logowanie - przekierowanie do panelu (zrobimy go zaraz)
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="dashboard-panel max-w-md w-full p-8 flex flex-col items-center space-y-8">
        
        {/* Logo / Header */}
        <div className="space-y-1 text-center w-full">
          <h1 className="text-3xl font-semibold tracking-tight text-text-main">
            Event Manager
          </h1>
          <p className="text-text-muted text-sm">
            Control Panel Authentication
          </p>
        </div>

        {error && (
          <div className="w-full p-3 bg-danger-red/10 border border-danger-red/50 text-danger-red rounded text-sm text-center">
            {error}
          </div>
        )}

        <form action={handleSubmit} className="w-full space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-muted">Username</label>
            <input 
              name="username" 
              type="text" 
              required 
              className="w-full px-3 py-2 bg-dashboard-bg border border-panel-border rounded focus:outline-none focus:border-primary-blue text-text-main"
              placeholder="e.g. admin"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-muted">Password</label>
            <input 
              name="password" 
              type="password" 
              required 
              className="w-full px-3 py-2 bg-dashboard-bg border border-panel-border rounded focus:outline-none focus:border-primary-blue text-text-main"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="btn-primary w-full mt-4"
          >
            {isLoading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        <div className="w-full pt-4 border-t border-panel-border">
          <button className="btn-danger w-full text-xs py-1.5 opacity-80 hover:opacity-100">
            Emergency Access (No Auth)
          </button>
        </div>
        
      </div>
    </div>
  );
}
