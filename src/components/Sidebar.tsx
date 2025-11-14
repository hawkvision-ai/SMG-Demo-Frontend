import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";

// Import custom icons
import { useAuth } from "@/context/AuthContext";
import { useEnv } from "@/context/EnvContext";
import Analytics from "../assets/icons/Analytics.svg";
import HomeIcon from "../assets/icons/home.svg";
import Incident from "../assets/icons/Incident.svg";
import Sites from "../assets/icons/sites.svg";
import supportIcon from "../assets/icons/support-icon.svg";
import Users from "../assets/icons/Users.svg";

interface SidebarItemProps {
  to: string;
  icon?: string;
  label: string;
  onClick?: () => void;
  LucideIcon?: any;
}

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const allSidebarItems: SidebarItemProps[] = [
  { to: "/home", icon: HomeIcon, label: "Home" },
  { to: "/configure", icon: Sites, label: "Sites" },
  { to: "/report", icon: Incident, label: "Incidents" },
  { to: "/analysis", icon: Analytics, label: "Analytics" },
  { to: "/manage-consumer", icon: Users, label: "Users" },
  { to: "/support", icon: supportIcon, label: "Support" },
];

// Function to filter sidebar items based on user role
const getFilteredSidebarItems = (userRole: string | undefined): SidebarItemProps[] => {
  if (!userRole) {
    return allSidebarItems.filter((item) => ["/home", "/report", "/analysis", "/support"].includes(item.to));
  }

  const role = userRole.toLowerCase();

  if (role === "consumer") {
    return allSidebarItems.filter((item) =>
      ["/home", "/report", "/analysis", "/support"].includes(item.to),
    );
  } else if (["admin", "cust_admin", "cust_super_admin"].includes(role)) {
    return allSidebarItems;
  } else {
    return allSidebarItems.filter((item) => ["/home", "/report", "/analysis"].includes(item.to));
  }
};

// Animation variants
const sidebarVariants = {
  open: {
    width: 250,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 40,
    },
  },
  closed: {
    width: 70,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 40,
    },
  },
};

const itemVariants = {
  open: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
  closed: {
    x: -20,
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

export function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const location = useLocation();
  const { env } = useEnv();
  const { user } = useAuth();

  // Get filtered sidebar items based on user role
  const sidebarItems = getFilteredSidebarItems(user?.role);

  // const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <>
      {/* Backdrop - visible when sidebar is open */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-10"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Full Height */}
      <motion.aside
        variants={sidebarVariants}
        animate={sidebarOpen ? "open" : "closed"}
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}  
        className={cn(
          "fixed inset-y-0 left-0 flex flex-col",
          "border-r border-gray-200/50 bg-white/95 backdrop-blur-xl",
          "overflow-hidden",
          sidebarOpen ? "z-30" : "z-1",
        )}
        style={{
          top: env === "virtual" ? "81px" : "58px",
          height: env === "virtual" ? "calc(100vh - 90px)" : "calc(100vh - 80px)",
        }}
      >
        {/* Environment-specific gradient overlay */}
        <div
          className={cn(
            "absolute inset-0 opacity-30",
            env === "virtual"
              ? "bg-gradient-to-b from-indigo-50/50 to-purple-50/30"
              : "bg-gradient-to-b from-teal-50/50 to-blue-50/30",
          )}
        />

        {/* Navigation Items */}
        <nav className="relative z-10 flex flex-1 flex-col gap-2 p-3">
          {sidebarItems.map((item, index) => (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {item.to === "/support" && (
                <div className="-mx-2 mt-4 mb-4 border-t border-gray-200"></div>
              )}
              <SidebarItem
                {...item}
                active={location.pathname === item.to}
                expanded={sidebarOpen}
                onItemClick={() => setSidebarOpen(false)}
              />
            </motion.div>
          ))}
        </nav>
      </motion.aside>
    </>
  );
}

interface SidebarItemComponentProps extends SidebarItemProps {
  active: boolean;
  expanded: boolean;
  onItemClick: () => void;
}

function SidebarItem({
  to,
  icon,
  label,
  active,
  LucideIcon,
  expanded,
  onItemClick,
}: SidebarItemComponentProps) {
  const { env } = useEnv();
  const location = useLocation();

  // Enhanced active state logic to handle sub-routes
  const isActive = active || location.pathname.startsWith(to);

  const handleClick = () => {
    onItemClick();
  };

  return (
    <Link to={to} onClick={handleClick}>
      <motion.div
        whileHover={{ scale: 1.02, x: 2 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-2.5 py-2",
          "cursor-pointer transition-all duration-200",
          "hover:bg-white/60 hover:shadow-sm",
          // Active state styling
          isActive && env === "virtual" && "bg-indigo-50/80 ring-1 ring-indigo-200",
          isActive && env === "real" && "bg-teal-50/80 ring-1 ring-teal-200",
        )}
      >
        {/* Icon */}
        <div className="flex h-8 w-6 flex-shrink-0 items-center justify-center">
          {LucideIcon ? (
            <LucideIcon
              className={cn(
                "h-5 w-5 transition-colors duration-200",
                isActive
                  ? env === "virtual"
                    ? "text-indigo-600"
                    : "text-teal-600"
                  : "text-gray-800",
              )}
            />
          ) : (
            <img
              src={icon}
              alt=""
              className="h-5.5 w-5.5 transition-all duration-200"
              style={{
                filter: isActive
                  ? env === "virtual"
                    ? "invert(28%) sepia(50%) saturate(2500%) hue-rotate(240deg) brightness(100%) contrast(95%)"
                    : "brightness(0) saturate(100%) invert(40%) sepia(74%) saturate(568%) hue-rotate(131deg) brightness(93%) contrast(86%)"          
                  : "brightness(0) saturate(100%) invert(20%) sepia(0%) saturate(0%) brightness(0%) contrast(100%)",     
                }}
            />
          )}
        </div>

        {/* Label with animation */}
        <AnimatePresence mode="wait">
          {expanded && (
            <motion.span
              variants={itemVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className={cn(
                "text-sm font-medium whitespace-nowrap",
                isActive
                  ? env === "virtual"
                    ? "text-indigo-700"
                    : "text-teal-600"
                  : "text-gray-900",
              )}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Active indicator */}
        {isActive && (
          <motion.div
            layoutId="activeIndicator"
            className={cn(
              "absolute left-0 rounded-r-full",
              env === "virtual" ? "bg-indigo-500" : "bg-teal-500",
            )}
            style={{ y: "-50%" }}
          />
        )}

        {/* Tooltip for collapsed state */}
        {!expanded && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            whileHover={{ opacity: 1, x: 0 }}
            className={cn(
              "absolute left-full z-50 ml-2 rounded-md px-2 py-1 shadow-lg",
              "bg-gray-900 text-xs whitespace-nowrap text-white",
              "pointer-events-none",
            )}
          >
            {label}
            <div className="absolute top-1/2 left-0 -ml-1 h-0 w-0 -translate-y-1/2 border-t-4 border-r-4 border-b-4 border-transparent border-r-gray-900" />
          </motion.div>
        )}
      </motion.div>
    </Link>
  );
}
