import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type ViewStyle,
} from "react-native";
import { useBrandingStore } from "@/store/branding.store";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  style?: ViewStyle;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "",
  secondary: "",
  outline: "bg-transparent active:bg-slate-50 border border-slate-200",
  ghost: "bg-transparent active:bg-slate-50",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-4 py-2.5",
  md: "px-5 py-3",
  lg: "px-6 py-3.5",
};

const textVariantStyles: Record<ButtonVariant, string> = {
  primary: "text-white",
  secondary: "",
  outline: "text-slate-700",
  ghost: "",
};

const sizeTextStyles: Record<ButtonSize, string> = {
  sm: "text-sm font-semibold",
  md: "text-sm font-semibold",
  lg: "text-base font-semibold",
};

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "lg",
  loading = false,
  disabled = false,
  fullWidth = true,
  className = "",
  style,
}: ButtonProps) {
  const theme = useBrandingStore((s) => s.theme);
  const primaryColor = theme.primary;
  const isDisabled = disabled || loading;

  const baseStyle = {
    backgroundColor:
      variant === "primary"
        ? primaryColor
        : variant === "secondary"
          ? `${primaryColor}14`
          : undefined,
  };

  const textColor =
    variant === "primary"
      ? "#FFFFFF"
      : variant === "secondary" || variant === "ghost"
        ? primaryColor
        : "#334155";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      className={[
        "flex-row items-center justify-center rounded-xl",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth ? "w-full" : "",
        isDisabled ? "opacity-50" : "",
        className,
      ].join(" ")}
      style={
        {
          ...baseStyle,
          ...(variant === "primary" && !isDisabled
            ? {
                shadowColor: primaryColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 2,
              }
            : {}),
          ...(style as object),
        } as ViewStyle
      }
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text
          className={[
            textVariantStyles[variant],
            sizeTextStyles[size],
          ].join(" ")}
          style={
            variant === "primary" || variant === "secondary" || variant === "ghost"
              ? { color: textColor }
              : undefined
          }
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
