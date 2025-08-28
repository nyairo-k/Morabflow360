import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react"; // We need the loader icon

// The onLogin function now expects a user object
interface LoginScreenProps {
  onLogin: (user: { name: string; role: string }) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzHJ6ZYJFZV6XgQu5Kp-spLNPhy9OYnH6NZm4-3lblH4H-4ZM1zxHZvfUuusjQwCP3M0Q/exec"; // <-- Use the URL from your NEW auth script

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          type: "login",
          username: username,
          password: password
        })
      });

      const result = await response.json();

      if (result.status === "success") {
        onLogin(result.user);
      } else {
        setError(result.message || "Invalid username or password.");
      }

    } catch (err) {
      setError("A network error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      
      {/* --- Panel 1: The Brand & Welcome Panel (This is now correctly included) --- */}
      <div className="hidden lg:flex lg:flex-col lg:items-center lg:justify-center bg-[#073763] p-12 text-center">
        <div className="space-y-6 text-white">
           <img src="/logo.png" alt="Morab Group Logo" className="h-24 w-auto mx-auto" />
           <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight">
                Welcome to the Morab Group ERP
              </h1>
              <p className="text-lg text-slate-300">
                Digitizing the Future of Medical Supply.
              </p>
           </div>
        </div>
      </div>

      {/* --- Panel 2: The Action Panel (Right Side) --- */}
      <div className="flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold">Sign In</CardTitle>
              <CardDescription>
                Access your dashboard to manage your operations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* The Role Selector has been removed, as the role comes from the backend */}
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>
                
                {error && <p className="text-sm font-medium text-destructive">{error}</p>}

                <Button type="submit" className="w-full" disabled={isLoading || !username || !password}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}