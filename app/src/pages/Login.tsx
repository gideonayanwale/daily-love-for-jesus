import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Sparkles, Lock, Mail, User, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp, isAuthenticated } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // If already authenticated, redirect
  if (isAuthenticated) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (isSignUp && password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const res = await signUp(email.trim(), password, name.trim());
        if (res.error) {
          toast.error(res.error.message);
        } else {
          toast.success("Account created successfully! Welcome to Daily Love For Jesus.");
          navigate("/");
        }
      } else {
        const res = await signIn(email.trim(), password);
        if (res.error) {
          toast.error(res.error.message);
        } else {
          toast.success("Welcome back!");
          navigate("/");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-white to-amber-50/30 flex flex-col justify-center items-center px-4 py-12">
      {/* Brand Header */}
      <div className="text-center mb-6 space-y-2 max-w-sm">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white shadow-lg shadow-amber-500/25 mb-1">
          <Heart className="w-7 h-7 fill-white/20 stroke-[2.2]" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-serif">
          Daily Love For Jesus
        </h1>
        <p className="text-xs text-amber-700 font-semibold tracking-wider uppercase">
          Love Fellowship Christian International
        </p>
      </div>

      {/* Auth Card */}
      <Card className="w-full max-w-sm border-amber-100/80 shadow-xl shadow-amber-900/5 bg-white/90 backdrop-blur-sm">
        <CardHeader className="pb-4 text-center">
          <CardTitle className="text-xl font-bold text-gray-800">
            {isSignUp ? "Create an Account" : "Welcome Back"}
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">
            {isSignUp
              ? "Join to save favorites, track reading progress & receive daily devotionals."
              : "Sign in with your Supabase account to sync your devotionals."}
          </CardDescription>

          {/* Toggle Tab */}
          <div className="flex bg-amber-50/80 p-1 rounded-xl mt-3 border border-amber-100">
            <button
              type="button"
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                !isSignUp
                  ? "bg-white text-amber-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                isSignUp
                  ? "bg-white text-amber-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Sign Up
            </button>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium text-gray-700">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Sister Mary / Brother John"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 text-sm h-10 border-gray-200 focus-visible:ring-amber-500"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-gray-700">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 text-sm h-10 border-gray-200 focus-visible:ring-amber-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium text-gray-700">
                  Password
                </Label>
                {!isSignUp && (
                  <span className="text-[11px] text-amber-600 hover:underline cursor-pointer">
                    Forgot password?
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder={isSignUp ? "At least 6 characters" : "••••••••"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 text-sm h-10 border-gray-200 focus-visible:ring-amber-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 mt-2 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white font-medium shadow-md shadow-amber-600/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {isSignUp ? "Creating account..." : "Signing in..."}
                </>
              ) : (
                <>
                  {isSignUp ? "Create Free Account" : "Sign In"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Guest continuation */}
          <div className="mt-4 pt-3 border-t border-gray-100 text-center">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-xs text-gray-500 hover:text-amber-700 transition-colors inline-flex items-center gap-1 font-medium"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Continue reading as Guest
            </button>
          </div>
        </CardContent>
      </Card>

      <footer className="mt-8 text-center text-xs text-gray-400">
        Powered by ForLove Media &bull; Supabase Auth &bull; Free & Open
      </footer>
    </div>
  );
}
