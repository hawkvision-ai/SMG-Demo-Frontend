import { Button } from "@/components/ui/button";
import SECRETS from "@/config/secrets";
import { useCreateNewAccount, useForgotPassword, useResetPassword } from "@/hooks/useApi";
import { validateNameString } from "@/utils/inputValidation";
import { Info, Loader, X } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import imageUrl from "../assets/hawkVision.jpg";
import { useAuth } from "../context/AuthContext";

type AuthMode = "login" | "signup" | "forgot";

export default function AuthPage() {
  const { login, user, error: authError, isLoading } = useAuth();
  const { execute: forgotPassword, loading: isForgotLoading } = useForgotPassword();
  const { execute: resetPassword, loading: isResetLoading } = useResetPassword();
  const { execute: createAccount, loading: isSetPasswordLoading } = useCreateNewAccount();

  const navigate = useNavigate();

  const [authMode, setAuthMode] = useState<AuthMode>("login");

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [otp, setOtp] = useState("");
  const [name, setName] = useState(""); // only for signup
  const [nameError, setNameError] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [canResendOtp, setCanResendOtp] = useState(true);
  const [azureLoading, setAzureLoading] = useState(false);

  // Terms and Conditions state
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showTermsError, setShowTermsError] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/home");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (authError) {
      toast.error(authError);
    }
  }, [authError]);

  // Timer effect for OTP
  useEffect(() => {
    let timerId: NodeJS.Timeout;

    if (timeRemaining > 0) {
      timerId = setTimeout(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && !canResendOtp) {
      setCanResendOtp(true);
    }

    return () => {
      clearTimeout(timerId);
    };
  }, [timeRemaining, canResendOtp]);

  const handleAzureSSO = async () => {
    setAzureLoading(true);
    const toastId = toast.loading("Redirecting to Azure...");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || SECRETS.FALLBACK_BACKEND_URL}/auth/sso-login`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (response.ok) {
        const text = await response.text();
        const redirectUrl = text.replace(/^"|"$/g, ""); // strip wrapping quotes, if any

        if (redirectUrl.startsWith("http")) {
          toast.success("Redirecting to Azure login...", { id: toastId });
          window.location.href = redirectUrl;
        } else {
          throw new Error(`Invalid redirect URL: ${redirectUrl}`);
        }
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to initiate Azure SSO: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error("Azure SSO Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to connect to Azure";
      toast.error(errorMessage, { id: toastId });
      setAzureLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading("Signing in...");
    try {
      const success = await login(username, password);
      if (success) {
        toast.success("Login successful", { id: toastId });
        navigate("/home");
      } else {
        toast.error("Login failed", { id: toastId });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      toast.error(errorMessage, { id: toastId });
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    const toastId = toast.loading("Sending verification code...");
    try {
      await forgotPassword(email);
      toast.success("OTP sent to your email", { id: toastId });
      setOtpSent(true);
      setCanResendOtp(false);
      setTimeRemaining(300); // 5 minutes in seconds
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send OTP";
      toast.error(errorMessage, { id: toastId });
    }
  };

  const handleResendOtp = async () => {
    if (!canResendOtp) return;

    const toastId = toast.loading("Resending verification code...");
    try {
      await forgotPassword(email);
      toast.success("OTP resent to your email", { id: toastId });
      setCanResendOtp(false);
      setTimeRemaining(300); // Reset timer to 5 minutes
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to resend OTP";
      toast.error(errorMessage, { id: toastId });
    }
  };

  // For Signup - uses setPassword API
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp) {
      toast.error("Please enter the verification code");
      return;
    }

    if (!password) {
      toast.error("Please enter a password");
      return;
    }

    if (!name) {
      toast.error("Please enter your full name");
      return;
    }

    // Validate name with 50 character limit
    const nameValidationError = validateNameString(name, {
      fieldName: "Full name",
      maxLength: 50,
      allowOnlyNumbers: false,
      allowOnlySpecialChars: false,
    });

    if (nameValidationError) {
      setNameError(nameValidationError);
      toast.error(nameValidationError);
      return;
    }

    // Validate Terms and Conditions acceptance
    if (!termsAccepted) {
      setShowTermsError(true);
      return;
    }

    const toastId = toast.loading("Creating account...");
    try {
      await createAccount({
        email,
        otp,
        new_password: password,
        name,
        terms_accepted: termsAccepted,
      });
      toast.success("Signup successful!", { id: toastId });
      // Reset states
      setAuthMode("login");
      setOtpSent(false);
      setEmail("");
      setPassword("");
      setOtp("");
      setName("");
      setNameError("");
      setTimeRemaining(0);
      setTermsAccepted(false); // Reset terms acceptance
      setShowTermsError(false); // Reset error
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create account";
      toast.error(errorMessage, { id: toastId });
    }
  };

  // For Forgot Password - uses resetPassword API
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp) {
      toast.error("Please enter the verification code");
      return;
    }

    if (!password) {
      toast.error("Please enter a new password");
      return;
    }

    const toastId = toast.loading("Resetting password...");
    try {
      await resetPassword({
        email,
        otp,
        new_password: password,
      });
      toast.success("Password reset successfully! Please login with your new password.", {
        id: toastId,
      });
      // Reset states
      setAuthMode("login");
      setOtpSent(false);
      setEmail("");
      setPassword("");
      setOtp("");
      setTimeRemaining(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reset password";
      toast.error(errorMessage, { id: toastId });
    }
  };

  const resetToLogin = () => {
    setAuthMode("login");
    setOtpSent(false);
    setTimeRemaining(0);
  };

  const switchToForgotPassword = () => {
    setAuthMode("forgot");
    setOtpSent(false);
    setTimeRemaining(0);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  return (
    <>
      <div className="flex min-h-screen w-screen items-center justify-center bg-gray-100 p-4">
        <div
          className="flex w-full max-w-4xl overflow-hidden rounded-xl shadow-2xl"
          style={{ minHeight: "650px", maxHeight: "90vh" }}
        >
          {/* Left Side - Image - Fixed height container */}
          <div className="hidden md:block md:w-1/2">
            <div className="flex h-full items-center justify-center bg-teal-600">
              <img
                src={imageUrl}
                alt="Hawk Vision"
                className="h-full w-full object-cover object-center"
              />
            </div>
          </div>

          {/* Right Side - Form with Gradient Background */}
          <div className="flex w-full flex-col justify-center overflow-y-auto bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-8 md:w-1/2">
            <div className="mx-auto w-full max-w-md">
              {/* Tabs - Only Login and Signup */}
              <div className="mb-6 flex justify-center">
                <div className="relative isolate inline-flex w-64 rounded-full border border-gray-300 bg-white/80 p-1 shadow-sm backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setOtpSent(false);
                      setNameError("");
                    }}
                    className={`relative z-20 w-1/2 rounded-full bg-transparent py-2 text-sm font-semibold transition-all duration-300 ${
                      authMode === "login" ? "text-white" : "text-gray-600"
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signup");
                      setOtpSent(false);
                      setNameError("");
                    }}
                    className={`relative z-20 w-1/2 rounded-full bg-transparent py-2 text-sm font-semibold transition-all duration-300 ${
                      authMode === "signup" ? "text-white" : "text-gray-600"
                    }`}
                  >
                    Sign Up
                  </button>
                  <div
                    className={`absolute top-1 bottom-1 z-10 w-[calc(50%-4px)] rounded-full bg-teal-600 transition-all duration-300 ease-in-out ${
                      authMode === "login"
                        ? "left-1"
                        : authMode === "signup"
                          ? "left-[calc(50%+1px)]"
                          : "left-1"
                    }`}
                  />
                </div>
              </div>

              {/* Title based on mode */}
              <h2 className="mb-2 text-center text-3xl font-bold text-gray-800">
                {authMode === "forgot"
                  ? "Reset Password"
                  : authMode === "signup"
                    ? "Create Account"
                    : "Welcome Back"}
              </h2>
              <p className="mb-6 text-center text-gray-500">
                {authMode === "forgot"
                  ? "We'll send a code to your email"
                  : authMode === "signup"
                    ? "Sign up to get started"
                    : "Sign in to continue"}
              </p>

              {authMode === "login" && (
                <>
                  {/* Azure SSO Button */}
                  <div className="mb-6">
                    <Button
                      type="button"
                      onClick={handleAzureSSO}
                      disabled={azureLoading}
                      className={`flex w-full items-center justify-center rounded-lg border-2 border-blue-500 bg-white py-3 text-blue-600 shadow-md transition-all hover:bg-blue-50 hover:shadow-lg ${
                        azureLoading ? "cursor-not-allowed opacity-80" : ""
                      }`}
                    >
                      {azureLoading ? (
                        <>
                          <Loader className="mr-2 h-4 w-4 animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4z" />
                            <path d="M24 11.4H12.6V0H24v11.4z" />
                          </svg>
                          Continue with Microsoft
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Divider */}
                  <div className="mb-6 flex items-center">
                    <div className="flex-1 border-t border-gray-300"></div>
                    <span className="mx-4 text-sm text-gray-500">or</span>
                    <div className="flex-1 border-t border-gray-300"></div>
                  </div>

                  <form className="space-y-4" onSubmit={handleLogin}>
                    <div className="group relative">
                      <label
                        htmlFor="username"
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        Email
                      </label>
                      <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="focus:ring-opacity-50 w-full rounded-lg border border-gray-300 bg-white/80 p-2 shadow-sm transition-all focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-200"
                        placeholder="username@example.com"
                        required
                      />
                    </div>

                    <div className="group relative">
                      <label
                        htmlFor="password"
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="focus:ring-opacity-50 w-full rounded-lg border border-gray-300 bg-white/80 p-2 shadow-sm transition-all focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-200"
                          placeholder="••••••••"
                          required
                        />
                        <Button
                          type="button"
                          className="absolute top-1/2 right-3 -translate-y-1/2 text-sm font-medium text-gray-500 hover:text-teal-600"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? "Hide" : "Show"}
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={switchToForgotPassword}
                        className="text-sm font-medium text-teal-600 hover:text-teal-800 hover:underline"
                      >
                        Forgot password?
                      </Button>
                    </div>

                    <Button
                      type="submit"
                      className={`flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 py-3 text-white shadow-md transition-all hover:from-teal-600 hover:to-teal-700 hover:shadow-lg ${
                        isLoading ? "cursor-not-allowed opacity-80" : ""
                      }`}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader className="mr-2 h-4 w-4 animate-spin" />
                          <span>Signing in...</span>
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                </>
              )}

              {authMode === "signup" && (
                <form className="space-y-4" onSubmit={otpSent ? handleSignup : handleSendOtp}>
                  <div>
                    <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <div className={`${otpSent ? "" : "flex space-x-2"}`}>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => !otpSent && setEmail(e.target.value)}
                        className={`focus:ring-opacity-50 w-full rounded-lg border border-gray-300 p-2 shadow-sm transition-all focus:border-teal-500 focus:ring-2 focus:ring-teal-200 ${otpSent ? "bg-gray-50" : "bg-white/80 focus:bg-white"}`}
                        placeholder="you@example.com"
                        required
                        disabled={otpSent}
                      />

                      {!otpSent && (
                        <Button
                          type="submit"
                          className={`flex items-center justify-center rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 px-4 whitespace-nowrap text-white shadow-md transition-all hover:from-teal-600 hover:to-teal-700 hover:shadow-lg ${
                            isForgotLoading ? "cursor-not-allowed opacity-80" : ""
                          }`}
                          disabled={isForgotLoading}
                        >
                          {isForgotLoading ? (
                            <>
                              <Loader className="mr-2 h-4 w-4 animate-spin" />
                              <span>Sending...</span>
                            </>
                          ) : (
                            "Send OTP"
                          )}
                        </Button>
                      )}
                    </div>

                    {otpSent && (
                      <div className="mt-1 flex items-center justify-between text-sm">
                        <Button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={!canResendOtp || isForgotLoading}
                          className={`text-teal-600 hover:text-teal-800 hover:underline ${
                            !canResendOtp || isForgotLoading ? "cursor-not-allowed opacity-50" : ""
                          }`}
                        >
                          {isForgotLoading ? "Sending..." : "Resend code"}
                        </Button>
                        {timeRemaining > 0 && (
                          <span className="text-gray-500">
                            {canResendOtp ? "" : `Resend in ${formatTime(timeRemaining)}`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {otpSent && (
                    <>
                      <div>
                        <label
                          htmlFor="otp"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          Verification Code
                        </label>
                        <input
                          id="otp"
                          type="text"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className="focus:ring-opacity-50 w-full rounded-lg border border-gray-300 bg-white/80 p-2 shadow-sm transition-all focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-200"
                          placeholder="Enter verification code"
                          required
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="name"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          Full Name
                        </label>
                        <input
                          id="name"
                          type="text"
                          value={name}
                          onChange={(e) => {
                            const value = e.target.value;
                            setName(value);
                            // Validate on change
                            const error = validateNameString(value, {
                              fieldName: "Full name",
                              maxLength: 50,
                              allowOnlyNumbers: false,
                              allowOnlySpecialChars: false,
                            });
                            setNameError(error);
                          }}
                          className={`focus:ring-opacity-50 w-full rounded-lg border ${
                            nameError ? "border-red-500" : "border-gray-300"
                          } bg-white/80 p-2 shadow-sm transition-all focus:border-teal-500 focus:bg-white focus:ring-2 ${
                            nameError ? "focus:ring-red-200" : "focus:ring-teal-200"
                          }`}
                          placeholder="Your name"
                          required
                          maxLength={50}
                        />
                        {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
                      </div>
                      <div>
                        <label
                          htmlFor="newPassword"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          Create Password
                        </label>
                        <div className="relative">
                          <input
                            id="newPassword"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="focus:ring-opacity-50 w-full rounded-lg border border-gray-300 bg-white/80 p-2 shadow-sm transition-all focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-200"
                            placeholder="••••••••"
                            required
                          />
                          <Button
                            type="button"
                            className="absolute top-1/2 right-3 -translate-y-1/2 text-sm font-medium text-gray-500 hover:text-teal-600"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? "Hide" : "Show"}
                          </Button>
                        </div>
                      </div>

                      {/* Terms and Conditions Checkbox */}
                      <div className="space-y-1">
                        <div className="flex items-start space-x-2">
                          <input
                            id="terms"
                            type="checkbox"
                            checked={termsAccepted}
                            onChange={(e) => {
                              setTermsAccepted(e.target.checked);
                              if (e.target.checked) {
                                setShowTermsError(false); // Clear error when checked
                              }
                            }}
                            className={`mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500 ${
                              showTermsError ? "border-red-500" : ""
                            }`}
                          />
                          <label htmlFor="terms" className="text-sm text-gray-700">
                            I agree to the{" "}
                            <button
                              type="button"
                              onClick={() => setShowTermsModal(true)}
                              className="font-medium text-teal-600 hover:text-teal-800 hover:underline"
                            >
                              Terms and Conditions
                            </button>
                          </label>
                        </div>
                        {showTermsError && (
                          <p className="flex items-center text-sm text-red-600">
                            <Info className="mr-1 h-4 w-4" />
                            You must accept the Terms and Conditions to Sign Up
                          </p>
                        )}
                      </div>

                      <Button
                        type="submit"
                        className={`flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 py-3 text-white shadow-md transition-all hover:from-teal-600 hover:to-teal-700 hover:shadow-lg ${
                          isSetPasswordLoading ? "cursor-not-allowed opacity-80" : ""
                        }`}
                        disabled={isSetPasswordLoading}
                      >
                        {isSetPasswordLoading ? (
                          <>
                            <Loader className="mr-2 h-4 w-4 animate-spin" />
                            <span>Creating Account...</span>
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </>
                  )}
                </form>
              )}

              {authMode === "forgot" && (
                <form
                  className="my-6 space-y-4"
                  onSubmit={otpSent ? handleResetPassword : handleSendOtp}
                >
                  <div>
                    <label
                      htmlFor="forgotEmail"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Email
                    </label>
                    <div className={`${otpSent ? "" : "flex space-x-2"}`}>
                      <input
                        id="forgotEmail"
                        type="email"
                        value={email}
                        onChange={(e) => !otpSent && setEmail(e.target.value)}
                        className={`focus:ring-opacity-50 w-full rounded-lg border border-gray-300 p-2 shadow-sm transition-all focus:border-teal-500 focus:ring-2 focus:ring-teal-200 ${otpSent ? "bg-gray-50" : "bg-white/80 focus:bg-white"}`}
                        placeholder="you@example.com"
                        required
                        disabled={otpSent}
                      />

                      {!otpSent && (
                        <Button
                          type="submit"
                          className={`flex items-center justify-center rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 px-4 whitespace-nowrap text-white shadow-md transition-all hover:from-teal-600 hover:to-teal-700 hover:shadow-lg ${
                            isForgotLoading ? "cursor-not-allowed opacity-80" : ""
                          }`}
                          disabled={isForgotLoading}
                        >
                          {isForgotLoading ? (
                            <>
                              <Loader className="mr-2 h-4 w-4 animate-spin" />
                              <span>Sending...</span>
                            </>
                          ) : (
                            "Send OTP"
                          )}
                        </Button>
                      )}
                    </div>

                    {otpSent && (
                      <div className="mt-1 flex items-center justify-between text-sm">
                        <Button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={!canResendOtp || isForgotLoading}
                          className={`text-teal-600 hover:text-teal-800 hover:underline ${
                            !canResendOtp || isForgotLoading ? "cursor-not-allowed opacity-50" : ""
                          }`}
                        >
                          {isForgotLoading ? "Sending..." : "Resend code"}
                        </Button>
                        {timeRemaining > 0 && (
                          <span className="text-gray-500">
                            {canResendOtp ? "" : `Resend in ${formatTime(timeRemaining)}`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {otpSent && (
                    <>
                      <div>
                        <label
                          htmlFor="forgotOtp"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          Verification Code
                        </label>
                        <input
                          id="forgotOtp"
                          type="text"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className="focus:ring-opacity-50 w-full rounded-lg border border-gray-300 bg-white/80 p-2 shadow-sm transition-all focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-200"
                          placeholder="Enter verification code"
                          required
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="newForgotPassword"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            id="newForgotPassword"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="focus:ring-opacity-50 w-full rounded-lg border border-gray-300 bg-white/80 p-2 shadow-sm transition-all focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-200"
                            placeholder="••••••••"
                            required
                          />
                          <Button
                            type="button"
                            className="absolute top-1/2 right-3 -translate-y-1/2 text-sm font-medium text-gray-500 hover:text-teal-600"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? "Hide" : "Show"}
                          </Button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className={`flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 py-3 text-white shadow-md transition-all hover:from-teal-600 hover:to-teal-700 hover:shadow-lg ${
                          isResetLoading ? "cursor-not-allowed opacity-80" : ""
                        }`}
                        disabled={isResetLoading}
                      >
                        {isResetLoading ? (
                          <>
                            <Loader className="mr-2 h-4 w-4 animate-spin" />
                            <span>Resetting Password...</span>
                          </>
                        ) : (
                          "Reset Password"
                        )}
                      </Button>
                    </>
                  )}

                  <Button
                    type="button"
                    onClick={resetToLogin}
                    className="w-full rounded-lg border border-gray-300 bg-white/80 py-3 text-gray-700 shadow-sm transition-all hover:bg-white"
                  >
                    Back to Login
                  </Button>
                </form>
              )}

              {/* Footer message with switch option */}
              {(authMode === "login" || authMode === "signup") && (
                <p className="mt-6 text-center text-sm text-gray-600">
                  {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
                  <Button
                    type="button"
                    onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
                    className="font-medium text-teal-600 hover:text-teal-800 hover:underline"
                  >
                    {authMode === "login" ? "Sign up" : "Sign in"}
                  </Button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <h2 className="text-2xl font-bold text-gray-900">Terms & Conditions</h2>
              <button
                onClick={() => setShowTermsModal(false)}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="overflow-y-auto p-6" style={{ maxHeight: "calc(90vh - 140px)" }}>
              <TermsContent />
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4">
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-all hover:bg-gray-50"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setTermsAccepted(true);
                    setShowTermsModal(false);
                    toast.success("Terms and Conditions accepted");
                  }}
                  className="rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-2 text-white transition-all hover:from-teal-600 hover:to-teal-700"
                >
                  Accept & Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Extracted Terms Content Component
function TermsContent() {
  return (
    <div className="space-y-6">
      {/* Section 1: Introduction */}
      <section>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">1. Introduction</h3>
        <p className="mb-3 leading-relaxed text-gray-700">
          We value your privacy and are committed to protecting your personal information. These
          Data Privacy Terms and Conditions ("Terms") explain how we collect, use, store, and
          safeguard your personal data when you interact with our services, website, or
          applications.
        </p>
        <p className="leading-relaxed text-gray-700">
          By using our services, you consent to the practices described in these Terms.
        </p>
      </section>

      {/* Section 2: Information We Collect */}
      <section>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">2. Information We Collect</h3>
        <p className="mb-3 leading-relaxed text-gray-700">
          We may collect the following types of information:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-gray-700">
          <li>
            <span className="font-semibold">Technical Information:</span> IP address, device type,
            browser, operating system, cookies.
          </li>
          <li>
            <span className="font-semibold">Usage Data:</span> interactions with our website,
            services, or applications.
          </li>
          <li>
            <span className="font-semibold">Other Information:</span> provided voluntarily by you
            (e.g., survey responses, inquiries).
          </li>
        </ul>
      </section>

      {/* Section 3: How We Use Your Information */}
      <section>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">3. How We Use Your Information</h3>
        <p className="mb-3 leading-relaxed text-gray-700">
          We process personal data only when lawful and necessary, including:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-gray-700">
          <li>To provide and improve our services.</li>
          <li>To communicate with you (customer support, updates, marketing if consented).</li>
          <li>To comply with legal or regulatory requirements.</li>
          <li>To prevent fraud, security threats, or misuse of our services.</li>
        </ul>
      </section>

      {/* Section 4: Legal Basis for Processing */}
      <section>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">
          4. Legal Basis for Processing (where applicable, e.g., GDPR/POPIA/DPDP)
        </h3>
        <p className="mb-3 leading-relaxed text-gray-700">
          We process your personal information under one or more of the following legal bases:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-gray-700">
          <li>
            <span className="font-semibold">Consent</span> (where you have given clear permission).
          </li>
          <li>
            <span className="font-semibold">Contractual Necessity</span> (to provide requested
            services).
          </li>
          <li>
            <span className="font-semibold">Legal Obligation</span> (to comply with applicable
            laws).
          </li>
          <li>
            <span className="font-semibold">Legitimate Interest</span> (where it does not override
            your rights).
          </li>
        </ul>
      </section>

      {/* Section 5: Data Sharing and Disclosure */}
      <section>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">5. Data Sharing and Disclosure</h3>
        <p className="mb-3 leading-relaxed text-gray-700">
          We do not sell your personal data. However, we may share it with:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-gray-700">
          <li>Trusted service providers assisting in delivering our services.</li>
          <li>Legal or regulatory authorities when required by law.</li>
          <li>Business partners in case of mergers, acquisitions, or restructuring.</li>
        </ul>
      </section>

      {/* Section 6: Data Retention */}
      <section>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">6. Data Retention</h3>
        <p className="leading-relaxed text-gray-700">
          We retain your personal data only as long as necessary for the purposes outlined in these
          Terms, or as required by law. When no longer needed, data will be securely deleted or
          anonymized.
        </p>
      </section>

      {/* Section 7: Data Security */}
      <section>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">7. Data Security</h3>
        <p className="leading-relaxed text-gray-700">
          We implement reasonable technical, organizational, and administrative safeguards to
          protect personal data against unauthorized access, loss, misuse, or disclosure.
        </p>
      </section>

      {/* Section 8: International Data Transfers */}
      <section>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">
          8. International Data Transfers
        </h3>
        <p className="leading-relaxed text-gray-700">
          If your information is transferred outside your country, we will ensure appropriate
          safeguards (e.g., contractual clauses, adequacy decisions) are in place as required by
          law.
        </p>
      </section>

      {/* Section 9: Your Rights */}
      <section>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">9. Your Rights</h3>
        <p className="mb-3 leading-relaxed text-gray-700">
          Depending on applicable law (e.g., GDPR, POPIA, DPDP), you may have the right to:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-gray-700">
          <li>Access and request a copy of your data.</li>
          <li>Correct or update inaccurate information.</li>
          <li>Request deletion of your data ("right to be forgotten").</li>
          <li>Object to or restrict certain processing activities.</li>
          <li>Withdraw consent where processing is based on consent.</li>
          <li>Lodge a complaint with the relevant supervisory authority.</li>
        </ul>
      </section>

      {/* Section 10: Cookies and Tracking Technologies */}
      <section>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">
          10. Cookies and Tracking Technologies
        </h3>
        <p className="leading-relaxed text-gray-700">
          We may use cookies, beacons, and similar technologies to enhance user experience, analyze
          site traffic, and personalize content. You can manage cookie preferences through your
          browser settings.
        </p>
      </section>

      {/* Section 11: Updates to These Terms */}
      <section>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">11. Updates to These Terms</h3>
        <p className="leading-relaxed text-gray-700">
          We may update these Terms from time to time. Any significant changes will be communicated
          via our website or other appropriate means. Continued use of our services after updates
          constitutes acceptance.
        </p>
      </section>

      {/* Section 12: Contact Us */}
      <section>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">12. Contact Us</h3>
        <p className="mb-3 leading-relaxed text-gray-700">
          If you have questions, requests, or complaints regarding these Terms or our privacy
          practices, please contact us at:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-gray-700">
          <li>
            <span className="font-semibold">HawkVision AI Limited</span>
          </li>
          <li>
            <span className="font-semibold">Email:</span> data.protection@hawkvision.ai
          </li>
          <li>
            <span className="font-semibold">Address:</span> 3rd Floor, 86-90 Paul Street, London,
            England, United Kingdom, EC2A 4NE
          </li>
        </ul>
      </section>

      {/* Footer Note */}
      <div className="mt-6 border-t border-gray-200 pt-4">
        <p className="text-sm leading-relaxed text-gray-600">
          We comply with GDPR, DPDP, and POPIA regulations to ensure your privacy is protected.
        </p>
      </div>
    </div>
  );
}