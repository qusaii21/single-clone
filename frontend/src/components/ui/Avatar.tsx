"use client";

import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  isOnline?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: "w-7 h-7 text-xs",
  sm: "w-9 h-9 text-sm",
  md: "w-11 h-11 text-base",
  lg: "w-14 h-14 text-lg",
  xl: "w-20 h-20 text-2xl",
};

const onlineDotSizes = {
  xs: "w-2 h-2 -bottom-0.5 -right-0.5",
  sm: "w-2.5 h-2.5 bottom-0 right-0",
  md: "w-3 h-3 bottom-0 right-0",
  lg: "w-3.5 h-3.5 bottom-0.5 right-0.5",
  xl: "w-4 h-4 bottom-1 right-1",
};

export function Avatar({
  name,
  avatarUrl,
  avatarColor = "#5B5EA6",
  size = "md",
  isOnline,
  className,
}: AvatarProps) {
  return (
    <div className={cn("relative flex-shrink-0", className)}>
      <div
        className={cn(
          "rounded-full flex items-center justify-center font-semibold text-white select-none overflow-hidden",
          sizeClasses[size]
        )}
        style={{ backgroundColor: avatarUrl ? undefined : (avatarColor ?? "#5B5EA6") }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>
      {isOnline !== undefined && (
        <span
          className={cn(
            "absolute rounded-full border-2 border-[#1b1c1f]",
            onlineDotSizes[size],
            isOnline ? "bg-green-400" : "bg-gray-500"
          )}
        />
      )}
    </div>
  );
}
