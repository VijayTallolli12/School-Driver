import { View, TouchableOpacity, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useBrandingStore } from "@/store/branding.store";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const TAB_ICONS: Record<
  string,
  { focused: keyof typeof Ionicons.glyphMap; default: keyof typeof Ionicons.glyphMap }
> = {
  "(home)": { focused: "home", default: "home-outline" },
  profile: { focused: "person", default: "person-outline" },
};

export function BottomTabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const primaryColor = useBrandingStore((s) => s.theme.primary);

  return (
    <View style={{ paddingBottom: Math.max(insets.bottom, 0), backgroundColor: "#FFFFFF" }}>
      <View style={{ height: 0.5, backgroundColor: "#E2E8F0" }} />
      <View
        style={{
          flexDirection: "row",
          height: 52,
        }}
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const icons = TAB_ICONS[route.name];
          if (!icons) return null;

          const iconName = isFocused ? icons.focused : icons.default;
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : options.title ?? route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.6}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View style={{ position: "relative", alignItems: "center", justifyContent: "center" }}>
                <Ionicons
                  name={iconName}
                  size={isFocused ? 22 : 21}
                  color={isFocused ? primaryColor : "#94A3B8"}
                />
              </View>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: isFocused ? "600" : "400",
                  color: isFocused ? primaryColor : "#94A3B8",
                  marginTop: 2,
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
