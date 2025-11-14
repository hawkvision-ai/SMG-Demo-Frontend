import { ChevronDown, Clock, LogOut, Menu, Settings, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import hawkVisionLogo from "../assets/icons/HawkVision.svg";
import ProfileIcon from "../assets/icons/Profile.svg";
import TermsandCondition from "../assets/icons/termsicon.svg";
import { ConfirmationDialog } from "../components/ConfirmationDialog";
import { useAuth } from "../context/AuthContext";
import { useEnv } from "../context/EnvContext";
import { cn } from "../lib/utils";

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const { user, logout } = useAuth();
  const { env, setEnv } = useEnv();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingEnv, setPendingEnv] = useState<"real" | "virtual">(env);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Show confirmation dialog before switch
  const handleSwitchClick = (newEnv: "real" | "virtual") => {
    if (newEnv === env) return;
    setPendingEnv(newEnv);
    setConfirmOpen(true);
    setUserMenuOpen(false);
  };

  const handleConfirm = () => {
    setEnv(pendingEnv);
    setConfirmOpen(false);
  };

  const handleSettingsClick = () => {
    setUserMenuOpen(false);
    navigate("/settings");
  };

  const handleProfileClick = () => {
    setUserMenuOpen(false);
    navigate("/profile");
  };

  const handleTermsClick = () => {
    setUserMenuOpen(false);
    navigate("/terms-and-conditions");
  };

  const handleLogoutClick = () => {
    setUserMenuOpen(false);
    logout();
  };

  return (
    <>
      {/* Status Bar - Only show in virtual mode */}
      {env === "virtual" && (
        <div className="flex w-full items-center justify-start bg-indigo-600 px-2 py-1 text-[9px] font-medium text-white sm:text-[10px]">
          <span className="truncate">
            You're in virtual mode right now — turn it off to switch to real mode!
          </span>
          <span className="mx-1 sm:mx-2" />
          <button
            onClick={() => handleSwitchClick("real")}
            className="text-[9px] font-bold whitespace-nowrap text-white underline transition-colors hover:text-blue-100 sm:text-[10px]"
          >
            Turn Off
          </button>
        </div>
      )}

      <header
        className={cn(
          "relative flex h-[58px] w-full items-center justify-between",
          "border-b bg-white px-2 sm:px-4",
          env === "virtual"
            ? "border-indigo-300/60 bg-gradient-to-l from-indigo-100/55 via-indigo-100/90 to-indigo-100/85"
            : "border-gray-300/60 bg-white",
        )}
      >
        {/* Ambient glow effects */}
        <div
          className={cn(
            "absolute -inset-1 opacity-20 blur-xl transition-all duration-700",
            env === "virtual"
              ? "bg-gradient-to-r from-indigo-400/30 to-purple-400/20"
              : "bg-white/0",
          )}
        />

        <div
          className={cn(
            "relative z-10 flex items-center gap-2 px-2 transition-all duration-300 sm:gap-4 sm:px-4",
          )}
        >
          {/* Hamburger Menu Button */}
          <button
            onClick={() => {
              console.log("Hamburger clicked, current state:", sidebarOpen);
              setSidebarOpen(!sidebarOpen);
            }}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
              "cursor-pointer hover:bg-white/60 hover:shadow-sm",
              env === "virtual"
                ? "text-black hover:bg-gray-50/80"
                : "text-black hover:bg-gray-50/80",
            )}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Enhanced Logo Section */}
          <div className="group flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <img
                src={hawkVisionLogo}
                alt="Logo"
                className={cn(
                  "h-6 w-6 drop-shadow-md transition-all duration-300 sm:h-7 sm:w-7",
                  "group-hover:scale-105 group-hover:drop-shadow-lg",
                  env === "virtual" ? "brightness-110 hue-rotate-60 filter" : "",
                )}
              />
              {/* Subtle glow behind logo */}
              <div
                className={cn(
                  "absolute inset-0 scale-150 rounded-full opacity-30 blur-md transition-all duration-300",
                  env === "virtual" ? "bg-indigo-400/40" : "bg-teal-400/30",
                )}
              />
            </div>

            <div className="flex flex-col">
              <h1
                className={cn(
                  "text-sm font-bold tracking-wide transition-all duration-300 sm:text-lg",
                  "bg-gradient-to-r bg-clip-text text-transparent",
                  env === "virtual"
                    ? "from-indigo-800 via-indigo-900 to-purple-800"
                    : "from-teal-800 via-teal-900 to-blue-800",
                )}
              >
                <span className="hidden sm:inline">Hawkvision AI</span>
                <span className="sm:hidden">Hawkvision</span>
              </h1>
            </div>
          </div>

          {/* Enhanced Virtual Environment Badge */}
          {env === "virtual" && (
            <div className="ml-1 flex items-center sm:ml-3">
              <div
                className={cn(
                  "relative flex items-center rounded-lg px-1 py-1 transition-all duration-300 sm:px-2",
                  "bg-gradient-to-r from-indigo-100/90 to-indigo-200/80",
                  "border border-indigo-300/60 shadow-xs shadow-indigo-500/20",
                  "backdrop-blur-sm hover:shadow-xl hover:shadow-indigo-500/30",
                )}
              >
                <ShieldAlert className="mr-0.5 h-3 w-3 animate-pulse text-indigo-700 sm:mr-1" />
                <span className="text-[8px] font-bold tracking-wide text-indigo-800 sm:text-[10px]">
                  <span className="hidden sm:inline">VIRTUAL ENVIRONMENT</span>
                  <span className="sm:hidden">VIRTUAL</span>
                </span>

                {/* Subtle inner border for depth */}
                <div className="pointer-events-none absolute inset-0.5 rounded-xl" />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-2 sm:gap-4 sm:px-6">
          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={cn(
                "flex items-center gap-1 rounded-full px-1 py-1 transition-all duration-300 sm:gap-3 sm:px-2",
                "backdrop-blur-sm",
                env === "virtual"
                  ? userMenuOpen
                    ? "bg-white"
                    : "bg-header hover:bg-white/50"
                  : userMenuOpen
                    ? "bg-gray-200"
                    : "hover:bg-gray-200",
              )}
            >
              {/* User avatar with circular shape and border in both envs */}
              <div
                className={cn(
                  "relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-1 border-gray-400 sm:h-8 sm:w-8",
                  env === "real" ? "bg-white" : "bg-header",
                )}
              >
                <img
                  src={user?.logo || "logo"}
                  alt={user?.customer_name || "Customer Logo"}
                  className="h-6 w-6 object-contain sm:h-7 sm:w-7"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>

              {/* User info - Hidden on mobile */}
              <div className="hidden text-left sm:block">
                <div className="text-sm font-medium text-gray-900">{user?.name || "John Doe"}</div>
                <div className="text-[10px] text-gray-600">
                  {user?.customer_name || "Penguin & Penguin Inc"}
                </div>
              </div>

              {/* Dropdown icon */}
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-gray-800 transition-transform duration-300 sm:h-5 sm:w-5",
                  userMenuOpen && "rotate-180",
                )}
              />
            </button>

            {/* User Dropdown Menu */}
            {userMenuOpen && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-[100]" onClick={() => setUserMenuOpen(false)} />

                {/* Menu */}
                <div
                  className={cn(
                    "absolute top-full right-0 z-[110] mt-2 w-72 overflow-hidden rounded-3xl sm:w-80",
                    "bg-white backdrop-blur-md",
                    "border border-gray-300/60 shadow-xl shadow-gray-200/20",
                  )}
                >
                  {/* Timezone Section with enhanced styling and equal padding */}
                  <div className="bg-gray-200 bg-gradient-to-r px-3 py-3 backdrop-blur-sm sm:px-4 sm:py-4">
                    <div className="flex items-center gap-3 text-sm font-medium text-gray-800 sm:gap-4 sm:text-base">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="truncate">
                        {user?.timezone?.split(" ")[0] || "Asia/Kolkata"}
                      </span>
                    </div>
                  </div>

                  {/* Mode Section with equal padding */}
                  <div className="bg-white px-3 py-2 sm:px-4">
                    <div className="mb-2 text-sm font-medium text-gray-600 sm:text-base">Mode</div>
                    <div className="flex gap-1 rounded-xl border border-gray-300/40 bg-gray-100/60 p-1 backdrop-blur-sm">
                      <button
                        onClick={() => handleSwitchClick("real")}
                        className={cn(
                          "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 sm:px-4 sm:text-base",
                          env === "real"
                            ? "bg-teal-500 text-sm font-medium text-white shadow-lg shadow-teal-500/40 sm:text-lg"
                            : "bg-transparent text-gray-600 hover:bg-gray-200/70",
                        )}
                      >
                        Real
                      </button>
                      <button
                        onClick={() => handleSwitchClick("virtual")}
                        className={cn(
                          "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 sm:px-4 sm:text-base",
                          env === "virtual"
                            ? "bg-indigo-600 text-sm font-medium text-white shadow-lg shadow-indigo-500/40 sm:text-lg"
                            : "bg-transparent text-gray-600 hover:bg-gray-200/70",
                        )}
                      >
                        Virtual
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-300/40"></div>

                  {/* Settings and Contact sections with equal padding */}
                  <div className="bg-white px-1 py-2 sm:px-2">
                    <button
                      onClick={handleProfileClick}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-100/50 hover:text-gray-900 sm:gap-4 sm:px-4 sm:text-base"
                    >
                      <img src={ProfileIcon} alt="Profile" className="h-4 w-4 sm:h-5 sm:w-5" />
                      My Profile
                    </button>

                    <button
                      onClick={handleSettingsClick}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-100/50 hover:text-gray-900 sm:gap-4 sm:px-4 sm:text-base"
                    >
                      <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                      Settings
                    </button>

                    {/* <button
                      onClick={() => {
                      }}
                      className="flex w-full items-center gap-4 rounded-lg px-4 py-3 text-base text-gray-700 transition-colors hover:bg-gray-100/50 hover:text-gray-900"
                    >
                      <PhoneCall className="h-5 w-5" />
                      Contact Us
                    </button> */}

                    <button
                      onClick={handleTermsClick}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-100/50 hover:text-gray-900 sm:gap-4 sm:px-4 sm:text-base"
                    >
                      <img src={TermsandCondition} alt="Terms" className="h-4 w-4 sm:h-5 sm:w-5" />
                      Terms & Conditions
                    </button>
                  </div>

                  <div className="border-t border-gray-300/40"></div>

                  {/* Logout section with equal padding */}
                  <div className="bg-white px-1 py-2 sm:px-2">
                    <button
                      onClick={handleLogoutClick}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-red-500 transition-colors hover:bg-red-50/70 hover:text-red-600 sm:gap-4 sm:px-4 sm:text-base"
                    >
                      <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Enhanced Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmOpen}
        title={`Switch to ${pendingEnv === "real" ? "Real" : "Virtual"} Environment`}
        description={`Are you sure you want to switch to the ${pendingEnv === "real" ? "Real" : "Virtual"} environment? ${
          pendingEnv === "real"
            ? "This will give you access to production data."
            : "This is a testing environment and no changes will affect production data."
        }`}
        primaryButtonText={`Switch to ${pendingEnv === "real" ? "Real" : "Virtual"}`}
        secondaryButtonText="Cancel"
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        isLoading={false}
      />
    </>
  );
}
