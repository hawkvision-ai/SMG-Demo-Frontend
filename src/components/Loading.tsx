"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Eye } from "lucide-react";
import React from "react";

interface LoadingProps {
  size?: "sm" | "default" | "lg";
  variant?: "primary" | "secondary";
  className?: string;
  text?: string;
}

const Loading: React.FC<LoadingProps> = ({ variant = "primary", className, text }) => {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-4 sm:gap-3", className)}>
      <motion.div
        className="rounded-full bg-teal-600/10 p-4 shadow-lg sm:p-6"
        initial={{ scale: 0 }}
        animate={{ scale: [0.8, 1.2, 1], rotate: 360 }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <Eye className="h-10 w-10 animate-pulse text-teal-700 sm:h-14 sm:w-14" />
      </motion.div>

      <motion.h1
        className="mt-4 text-center text-lg font-bold tracking-wide text-teal-700 sm:mt-6 sm:text-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.8, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        HawkVision is Protecting
      </motion.h1>

      <motion.div
        className="mt-1 text-center text-xs text-gray-300 sm:mt-2 sm:text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Loading, please wait
      </motion.div>

      {text && (
        <p
          className={cn(
            "px-2 text-center text-xs font-medium sm:text-sm",
            variant === "primary" ? "text-teal-600" : "text-gray-600",
          )}
        >
          {text}
        </p>
      )}
    </div>
  );
};

export default Loading;
