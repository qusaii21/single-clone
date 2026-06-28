"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { Lock, MessageCircle } from "lucide-react";

type Step = "credentials" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAppStore((s) => s.setAuth);

  const [step, setStep] = useState<Step>("credentials");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authService.login(username, password);
      const { access_token, user } = res.data;
      localStorage.setItem("signal_token", access_token);
      localStorage.setItem("signal_user", JSON.stringify(user));
      setAuth(user, access_token);
      router.replace("/");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Login failed";
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.register({ phone, username, display_name: displayName, password });
      toast("Account created! Enter OTP to verify.", "success");
      setStep("otp");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Registration failed";
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.verifyOtp(phone, otp);
      toast("Phone verified! You can now log in.", "success");
      setIsRegister(false);
      setStep("credentials");
      setOtp("");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Invalid OTP";
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111213] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#3a76f0] flex items-center justify-center mb-4 shadow-lg">
            <MessageCircle size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#e9edef]">Signal</h1>
          <p className="text-sm text-[#8696a0] mt-1">Private messaging for everyone</p>
        </div>

        {/* Card */}
        <div className="bg-[#1b1c1f] border border-[#2a2b2f] rounded-2xl p-6 shadow-2xl">
          {step === "otp" ? (
            <>
              <h2 className="text-lg font-semibold text-[#e9edef] mb-1">Verify your number</h2>
              <p className="text-sm text-[#8696a0] mb-5">
                Enter the OTP sent to <span className="text-[#e9edef]">{phone}</span>.
                <br />
                <span className="text-[#3a76f0]">Demo: use 123456</span>
              </p>
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <Input
                  label="One-time password"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  inputMode="numeric"
                  required
                />
                <Button type="submit" loading={loading} className="w-full">
                  Verify
                </Button>
                <button
                  type="button"
                  onClick={() => setStep("credentials")}
                  className="text-sm text-[#8696a0] hover:text-[#e9edef] text-center"
                >
                  Back
                </button>
              </form>
            </>
          ) : isRegister ? (
            <>
              <h2 className="text-lg font-semibold text-[#e9edef] mb-5">Create account</h2>
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <Input
                  label="Phone number"
                  placeholder="+1-555-0100"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <Input
                  label="Username"
                  placeholder="yourname"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <Input
                  label="Display name"
                  placeholder="Your Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock size={14} />}
                  required
                />
                <Button type="submit" loading={loading} className="w-full">
                  Create account
                </Button>
              </form>
              <p className="text-sm text-[#8696a0] text-center mt-4">
                Already have an account?{" "}
                <button
                  className="text-[#3a76f0] hover:underline"
                  onClick={() => setIsRegister(false)}
                >
                  Sign in
                </button>
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-[#e9edef] mb-1">Sign in</h2>
              <p className="text-xs text-[#8696a0] mb-5">
                Demo: <span className="text-[#3a76f0]">qusai / password123</span>
              </p>
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <Input
                  label="Username"
                  placeholder="qusai"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock size={14} />}
                  required
                />
                <Button type="submit" loading={loading} className="w-full">
                  Sign in
                </Button>
              </form>
              <p className="text-sm text-[#8696a0] text-center mt-4">
                New to Signal?{" "}
                <button
                  className="text-[#3a76f0] hover:underline"
                  onClick={() => setIsRegister(true)}
                >
                  Create account
                </button>
              </p>
            </>
          )}
        </div>

        <p className="text-xs text-[#8696a0] text-center mt-6">
          🔒 End-to-end encrypted (simulated)
        </p>
      </div>
    </div>
  );
}
