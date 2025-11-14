// src/pages/Settings.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useForgotPassword, useResetPassword, useUpdateUser } from "@/hooks/useApi";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Lock,
  Mail,
  Smartphone,
  UserCircle,
  XCircle,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { timezones } from "./data";
import TimezonePicker from "./TimezonePicker";

// Alert Component for better feedback
type AlertVariant = "default" | "success" | "info" | "warning" | "error";

interface AlertProps {
  children: React.ReactNode;
  variant?: AlertVariant;
  className?: string;
}

const Alert = ({ children, variant = "default", className = "" }: AlertProps) => {
  const baseStyles = "flex items-center gap-2 p-3 rounded-lg text-sm";
  const variants: Record<AlertVariant, string> = {
    default: "bg-gray-50 text-gray-700 border border-gray-200",
    success: "bg-green-50 text-green-700 border border-green-200",
    info: "bg-blue-50 text-blue-700 border border-blue-200",
    warning: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    error: "bg-red-50 text-red-700 border border-red-200",
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`}>
      {variant === "success" && <CheckCircle2 className="h-4 w-4" />}
      {variant === "info" && <Info className="h-4 w-4" />}
      {variant === "warning" && <AlertCircle className="h-4 w-4" />}
      {variant === "error" && <XCircle className="h-4 w-4" />}
      {children}
    </div>
  );
};

interface FormErrors {
  name?: string;
  phone?: string;
  timezone?: string;
  general?: string;
}

const Settings: React.FC = () => {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email] = useState(user?.email || "");
  const [role] = useState(user?.role || "");
  const [timezone, setTimezone] = useState(user?.timezone || "");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [resetStep, setResetStep] = useState<"email" | "otp" | null>(null);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { execute: updateUser } = useUpdateUser();
  const { execute: sendOtp, loading: sendingOtp } = useForgotPassword();
  const { execute: resetPassword, loading: resettingPassword } = useResetPassword();

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setTimezone(user.timezone || "");
    }
  }, [user]);

  // Validation functions
  const validateName = (value: string): string | undefined => {
    if (!value.trim()) return "Name is required";
    if (value.trim().length < 2) return "Name must be at least 2 characters";
    if (value.trim().length > 50) return "Name must not exceed 50 characters";
    if (!/^[a-zA-Z\s'-]+$/.test(value.trim()))
      return "Name can only contain letters, spaces, hyphens, and apostrophes";
    return undefined;
  };

  const validatePhoneNumber = (value: string): string | undefined => {
    if (!value || value.length === 0) {
      return "Phone number is required";
    }

    const digits = value.replace(/\D/g, "");

    if (value.startsWith("91") || value.startsWith("+91")) {
      const nationalNumber = digits.slice(2);
      if (nationalNumber.length !== 10) {
        return "phone number must have exactly 10 digits after country code";
      }
      if (!/^[6-9]/.test(nationalNumber)) {
        return "phone number must start with 6, 7, 8, or 9";
      }
    } else {
      if (digits.length < 10) {
        return "Phone number must be at least 10 digits";
      }
      if (digits.length > 15) {
        return "Phone number must not exceed 15 digits";
      }
    }

    if (/^(.)\1+$/.test(digits.slice(-10))) {
      return "Phone number cannot contain all same digits";
    }

    return undefined;
  };

  const validateTimezone = (value: string): string | undefined => {
    if (!value.trim()) return "Timezone is required";
    return undefined;
  };

  // Enhanced real-time validation
  const validateField = (field: string, value: string) => {
    let error: string | undefined;

    switch (field) {
      case "name":
        error = validateName(value);
        break;
      case "phone":
        error = validatePhoneNumber(value);
        break;
      case "timezone":
        error = validateTimezone(value);
        break;
    }

    setErrors((prev) => ({
      ...prev,
      [field]: error,
      general: undefined,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      name: validateName(name),
      phone: validatePhoneNumber(phone),
      timezone: validateTimezone(timezone),
    };

    setErrors(newErrors);
    setTouched({
      name: true,
      phone: true,
      timezone: true,
    });

    return !Object.values(newErrors).some((error) => error !== undefined);
  };

  const handleInputChange = (field: string, value: string) => {
    // Update state
    switch (field) {
      case "name":
        setName(value);
        break;
      case "phone":
        setPhone(value);
        break;
      case "timezone":
        setTimezone(value);
        break;
    }

    if (!touched[field]) {
      setTouched((prev) => ({ ...prev, [field]: true }));
    }

    validateField(field, value);
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    const value =
      field === "name"
        ? name
        : field === "phone"
          ? phone
          : timezone;

    validateField(field, value);
  };

  const getFieldError = (field: string) => {
    return touched[field] ? errors[field as keyof FormErrors] : undefined;
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;

    if (!validateForm()) {
      toast.error("Please fix all validation errors before saving");
      return;
    }

    setIsSaving(true);
    setErrors({});

    try {
      await updateUser(user.id, { 
        name: name.trim(), 
        phone, 
        timezone 
      });
      setUser({ ...user, name: name.trim(), phone, timezone });
      localStorage.setItem("user", JSON.stringify({ ...user, name: name.trim(), phone, timezone }));
      toast.success("Profile updated successfully");

      // Reset touched state after successful save
      setTouched({});
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to save changes";
      toast.error(errorMessage);
      setErrors((prev) => ({
        ...prev,
        general: errorMessage,
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const validatePassword = useCallback(() => {
    if (newPassword.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/[A-Z]/.test(newPassword)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(newPassword)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[0-9]/.test(newPassword)) {
      return "Password must contain at least one number";
    }
    return null;
  }, [newPassword]);

  const handleResetPassword = async () => {
    const passwordError = validatePassword();
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!user?.email) {
      toast.error("User email not found.");
      return;
    }

    try {
      await resetPassword({ email: user?.email, otp, new_password: newPassword });
      toast.success("Password reset successfully!");
      setResetStep(null);
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset password");
    }
  };

  // Conditional class for Password section container
  const passwordSectionClasses = `
    bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden
    ${resetStep === "otp" ? "flex-1 overflow-y-auto" : ""}
  `;

  return (
    <div className="h-[85vh] overflow-y-auto bg-gray-50 p-4">
      <div className="mx-auto flex h-full max-w-4xl flex-col gap-6">
        {/* Profile Section */}
        <div
          className={`overflow-visible rounded-lg border border-gray-200 bg-white shadow-sm ${resetStep === "otp" ? "pointer-events-none opacity-50" : ""}`}
        >
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-teal-600" />
                <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
                <div className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                  {role}
                </div>
              </div>
              {isSaving && (
                <div className="flex items-center gap-1 text-sm text-teal-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving changes...</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-gray-500" />
                  <span>Full Name</span>
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  onBlur={() => handleBlur("name")}
                  placeholder="Enter your name"
                  className={getFieldError("name") ? "border-red-500" : ""}
                />
                {getFieldError("name") && (
                  <p className="text-xs text-red-500">
                    {getFieldError("name")}
                  </p>
                )}
              </div>

              {/* Using the TimezonePicker component with validation */}
              <div className="relative z-10">
                <TimezonePicker
                  value={timezone}
                  onChange={(val) => handleInputChange("timezone", val)}
                  timezones={timezones}
                  required={true}
                  isLoading={false}
                />
                {getFieldError("timezone") && (
                  <p className="text-xs text-red-500">
                    {getFieldError("timezone")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-gray-500" />
                  <span>Phone Number</span>
                  <span className="text-red-500">*</span>
                </Label>
                <PhoneInput
                  country={"in"}
                  value={phone}
                  onChange={(val) => handleInputChange("phone", val)}
                  onBlur={() => handleBlur("phone")}
                  inputClass="w-full !h-[40px] !pl-[3.5rem] !pr-4"
                  containerClass="react-tel-input"
                  buttonClass="!border-r-0"
                  inputStyle={{
                    width: "100%",
                    height: "40px",
                    borderColor: getFieldError("phone")
                      ? "#ef4444"
                      : undefined,
                  }}
                />
                {getFieldError("phone") && (
                  <p className="text-xs text-red-500">
                    {getFieldError("phone")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>Email</span>
                </Label>
                <Input
                  value={email}
                  disabled
                  className="border-gray-200 bg-gray-50 text-gray-600"
                />
                <p className="text-xs text-gray-500">Email cannot be changed</p>
              </div>
            </div>

            {errors.general && (
              <Alert variant="error" className="mt-6">
                <p>{errors.general}</p>
              </Alert>
            )}

            <div className="mt-6">
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="bg-teal-600 text-white hover:bg-teal-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Password Section */}
        <div className={passwordSectionClasses}>
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-teal-600" />
              <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
            </div>
          </div>

          <div className="p-6">
            {resetStep === null ? (
              <div className="space-y-4">
                <Alert variant="info">
                  <p>
                    A secure OTP will be sent to your registered email address. Please check your
                    inbox to continue.
                  </p>
                </Alert>

                <Button
                  onClick={() => {
                    if (!user?.email) {
                      toast.error("User email not found");
                      return;
                    }

                    const toastId = toast.loading("Sending OTP...");

                    sendOtp(user.email)
                      .then(() => {
                        toast.success("OTP sent to your email", { id: toastId });
                        setResetStep("otp");
                      })
                      .catch((err: any) =>
                        toast.error(err?.message || "Failed to send OTP", { id: toastId }),
                      );
                  }}
                  disabled={sendingOtp}
                  className="bg-teal-600 text-white transition-colors hover:bg-teal-700"
                >
                  {sendingOtp ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    "Send Verification Code"
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="otp">Verification Code</Label>
                      <Input
                        id="otp"
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        maxLength={6}
                        className="font-mono tracking-wider"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          placeholder="Enter new password"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          placeholder="Confirm new password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="rounded-md bg-gray-50 p-4">
                      <p className="mb-2 text-sm font-medium text-gray-900">
                        Password requirements:
                      </p>
                      <ul className="space-y-1 text-sm text-gray-600">
                        <li className="flex items-center gap-2">
                          <CheckCircle2
                            className={`h-4 w-4 ${newPassword.length >= 8 ? "text-green-500" : "text-gray-300"}`}
                          />
                          At least 8 characters
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2
                            className={`h-4 w-4 ${/[A-Z]/.test(newPassword) ? "text-green-500" : "text-gray-300"}`}
                          />
                          One uppercase letter
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2
                            className={`h-4 w-4 ${/[a-z]/.test(newPassword) ? "text-green-500" : "text-gray-300"}`}
                          />
                          One lowercase letter
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2
                            className={`h-4 w-4 ${/[0-9]/.test(newPassword) ? "text-green-500" : "text-gray-300"}`}
                          />
                          One number
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleResetPassword}
                    disabled={resettingPassword || !otp || !newPassword || !confirmPassword}
                    className="bg-teal-600 text-white transition-colors hover:bg-teal-700"
                  >
                    {resettingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating Password...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setResetStep(null);
                      setOtp("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;