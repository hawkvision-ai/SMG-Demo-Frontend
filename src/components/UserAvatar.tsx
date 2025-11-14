import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UserAvatarProps {
  name: string;
  subtitle?: string;
  imageUrl?: string;
  className?: string;
}

export function UserAvatar({ name, subtitle, imageUrl, className }: UserAvatarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = () => {
    logout();
  };

  const handleSettings = () => {
    navigate("/settings");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "group relative flex h-10 w-10 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
            className
          )}
          aria-label="Open user menu"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={imageUrl}
              alt={name}
              className="object-cover"
            />
            <AvatarFallback className="bg-teal-100 text-teal-700">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 bg-gray-50" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={imageUrl}
                alt={name}
                className="object-cover"
              />
              <AvatarFallback className="bg-teal-100 text-teal-700">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-gray-900">{name}</p>
              {subtitle && (
                <p className="text-xs text-gray-500">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-gray-700"
              onClick={handleSettings}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
