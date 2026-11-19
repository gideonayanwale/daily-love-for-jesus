import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Sparkles, Lock, Mail, User, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

// ── Sanitise helper ────────────────────────────────────────────────────────────
const sanitiseName = (s: string): string =>
  s
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/(<([^>]+)>)/gi, '')
    .substring(0, 100);

// ── Password strength (0-3) ────────────────────────────────────────────────────
const getStrength = (p: string): number => {
  const has8 = p.length >= 8;
  const hasUpper = /[A-Z]/.test(p);
  const hasDigit = /\d/.test(p);
  return [has8, hasUpper, hasDigit].filter(Boolean).length;
};

const STRENGTH_LABELS = ['Weak', 'Fair', 'Good', 'Strong'] as const;
const STRENGTH_COLORS = [
  'bg-red-500',
  'bg-red-400',
  'bg-yellow-400',
  'bg-emerald-500',
] as const;

// ── Inline error component ─────────────────────────────────────────────────────
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-red-500 text-xs mt-1">{msg}</p>;
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp, isAuthenticated } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Validation error states
  const [emailError, setEmailError] = useState("");
  const [nameError, setNameError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Rate limiting
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // If already authenticated, redirect away from login
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) {
    return null;
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setEmailError("Enter your email address first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset email sent!");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear errors
    setEmailError("");
    setNameError("");
    setPasswordError("");

    // (a) Check cooldown
    if (cooldown > 0) {
      toast.error(`Too many failed attempts. Please wait ${cooldown} seconds.`);
      return;
    }

    let valid = true;

    // (b) Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    }

    // (c) Validate name (signup only)
    if (isSignUp) {
      const sanitised = sanitiseName(name);
      if (!sanitised) {
        setNameError("Full name is required.");
        valid = false;
      } else if (sanitised.length > 100) {
        setNameError("Name must be 100 characters or fewer.");
        valid = false;
      }
    }

    // (d) Validate password
    if (!password) {
      setPasswordError("Password is required.");
      valid = false;
    } else if (isSignUp) {
      if (password.length < 8) {
        setPasswordError("Password must be at least 8 characters long.");
        valid = false;
      }
    }

    if (!valid) return;

    setLoading(true);

    try {
      if (isSignUp) {
        const sanitisedName = sanitiseName(name);
        const res = await signUp(email.trim(), password, sanitisedName);
        if (res.error) {
          toast.error(res.error.message);
        } else if (res.data.session) {
          toast.success("Account created successfully! Welcome to Daily Love For Jesus.");
          navigate("/dashboard");
        } else {
          toast.info("Check your email to confirm your account before signing in.");
        }
      } else {
        const res = await signIn(email.trim(), password);
        if (res.error) {
          // (f) Track failed attempts
          const next = failedAttempts + 1;
          setFailedAttempts(next);
          if (next >= 3) {
            setCooldown(30);
            toast.error("Too many failed attempts. Please wait 30 seconds.");
          } else {
            toast.error(res.error.message);
          }
        } else {
          setFailedAttempts(0);
          toast.success("Welcome back!");
          navigate("/dashboard");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const strength = getStrength(password);

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
              : "Sign in with your account to sync your devotionals."}
          </CardDescription>

          {/* Toggle Tab */}
          <div className="flex bg-amber-50/80 p-1 rounded-xl mt-3 border border-amber-100">
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setEmailError(""); setNameError(""); setPasswordError(""); }}
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
              onClick={() => { setIsSignUp(true); setEmailError(""); setNameError(""); setPasswordError(""); }}
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
          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
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
                    aria-invalid={!!nameError}
                  />
                </div>
                <FieldError msg={nameError} />
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
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 text-sm h-10 border-gray-200 focus-visible:ring-amber-500"
                  aria-invalid={!!emailError}
                />
              </div>
              <FieldError msg={emailError} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium text-gray-700">
                  Password
                </Label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[11px] text-amber-600 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  id="password"
                  type="password"
                  placeholder={isSignUp ? "At least 8 characters" : "••••••••"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 text-sm h-10 border-gray-200 focus-visible:ring-amber-500"
                  aria-invalid={!!passwordError}
                />
              </div>
              <FieldError msg={passwordError} />

              {/* Password strength bar (signup only) */}
              {isSignUp && password.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((seg) => (
                      <div
                        key={seg}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          strength >= seg ? STRENGTH_COLORS[strength] : 'bg-zinc-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Strength: <span className="font-semibold">{STRENGTH_LABELS[strength]}</span>
                    {strength < 3 && ' — add uppercase letters and numbers'}
                  </p>
                </div>
              )}
            </div>

            {/* Cooldown warning */}
            {cooldown > 0 && (
              <p className="text-xs text-red-500 text-center font-medium">
                Too many attempts. Try again in {cooldown}s.
              </p>
            )}

            <Button
              type="submit"
              disabled={loading || cooldown > 0}
              className="w-full h-10 mt-2 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white font-medium shadow-md shadow-amber-600/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {isSignUp ? "Creating account..." : "Signing in..."}
                </>
              ) : cooldown > 0 ? (
                `Try again in ${cooldown}s`
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
        Powered by ForLove Media &bull; Supabase Auth &bull; Free &amp; Open
      </footer>
    </div>
  );
}
