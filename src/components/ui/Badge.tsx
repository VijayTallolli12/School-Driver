import { View, Text } from "react-native";

type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-green-50 border-green-200",
  warning: "bg-amber-50 border-amber-200",
  error: "bg-red-50 border-red-200",
  info: "bg-primary-50 border-primary-200",
  neutral: "bg-slate-50 border-slate-200",
};

const textStyles: Record<BadgeVariant, string> = {
  success: "text-green-700",
  warning: "text-amber-700",
  error: "text-red-700",
  info: "text-primary-700",
  neutral: "text-slate-600",
};

export function Badge({ label, variant = "info" }: BadgeProps) {
  return (
    <View
      className={[
        "px-2.5 py-1 rounded-lg border",
        variantStyles[variant],
      ].join(" ")}
    >
      <Text className={["text-xs font-semibold", textStyles[variant]].join(" ")}>
        {label}
      </Text>
    </View>
  );
}
