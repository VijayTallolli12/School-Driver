import { View, TouchableOpacity, type ViewStyle } from "react-native";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  variant?: "elevated" | "outlined";
  padding?: "none" | "sm" | "md" | "lg";
  onPress?: () => void;
  className?: string;
  style?: ViewStyle;
}

const variantStyles = {
  elevated: "bg-white border border-slate-100",
  outlined: "bg-white border border-slate-200",
};

const paddingStyles = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export function Card({
  children,
  variant = "elevated",
  padding = "md",
  onPress,
  className = "",
  style,
}: CardProps) {
  const baseStyles = [
    "rounded-2xl",
    variantStyles[variant],
    paddingStyles[padding],
    className,
  ].join(" ");

  const shadowStyle =
    variant === "elevated"
      ? {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 4,
          elevation: 0.5,
        }
      : undefined;

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className={baseStyles}
        style={[shadowStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View className={baseStyles} style={[shadowStyle, style]}>
      {children}
    </View>
  );
}
