import { memo, useEffect, useRef, useState } from "react";
import { Platform, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import type { DriverLocationSnapshot, DriverTripStop } from "@/types";
import { isValidCoord } from "@/utils/geo";

const DEFAULT_DELTA = 0.02;

interface TripMapViewProps {
  stops: DriverTripStop[];
  currentStopId: number | null;
  nextStopId: number | null;
  position: DriverLocationSnapshot | null;
}

function stopCoords(stop: DriverTripStop): { latitude: number; longitude: number } | null {
  if (!isValidCoord(stop.latitude, stop.longitude)) return null;
  return { latitude: stop.latitude as number, longitude: stop.longitude as number };
}

function buildRegion(
  position: DriverLocationSnapshot | null,
  stops: DriverTripStop[],
): { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } {
  if (position) {
    return {
      latitude: position.latitude,
      longitude: position.longitude,
      latitudeDelta: DEFAULT_DELTA,
      longitudeDelta: DEFAULT_DELTA,
    };
  }
  const first = stops.map(stopCoords).find((c): c is NonNullable<typeof c> => c !== null);
  if (first) {
    return { ...first, latitudeDelta: DEFAULT_DELTA, longitudeDelta: DEFAULT_DELTA };
  }
  return {
    latitude: 20.5937,
    longitude: 78.9629,
    latitudeDelta: 40,
    longitudeDelta: 40,
  };
}

const TripMapView = memo(function TripMapView({
  stops,
  currentStopId,
  nextStopId,
  position,
}: TripMapViewProps) {
  const mapRef = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const [follow, setFollow] = useState(true);
  const region = buildRegion(position, stops);

  useEffect(() => {
    if (!ready || !follow || !position) return;
    const timer = setTimeout(() => {
      mapRef.current?.animateToRegion(
        {
          latitude: position.latitude,
          longitude: position.longitude,
          latitudeDelta: DEFAULT_DELTA,
          longitudeDelta: DEFAULT_DELTA,
        },
        800,
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [position, ready, follow]);

  const polylineCoords = stops
    .map(stopCoords)
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const hasStopCoords = polylineCoords.length > 0;
  const hasPosition = Boolean(position);

  return (
    <View className="rounded-3xl overflow-hidden border border-slate-700 bg-slate-900">
      <MapView
        ref={mapRef}
        className="w-full"
        style={{ height: 240 }}
        initialRegion={region}
        region={follow ? region : undefined}
        showsUserLocation={hasPosition}
        followsUserLocation={follow}
        onMapReady={() => setReady(true)}
        onPanDrag={() => setFollow(false)}
        rotateEnabled={false}
      >
        {hasPosition && position ? (
          <Marker
            coordinate={{ latitude: position.latitude, longitude: position.longitude }}
            title="You"
            pinColor="#34D399"
            anchor={{ x: 0.5, y: 0.5 }}
          />
        ) : null}

        {hasStopCoords && (
          <Polyline coordinates={polylineCoords} strokeColor="#38BDF8" strokeWidth={3} />
        )}

        {stops.map((stop) => {
          const coords = stopCoords(stop);
          if (!coords) return null;
          const isCurrent = stop.id === currentStopId;
          const isNext = stop.id === nextStopId;
          return (
            <Marker
              key={stop.id}
              coordinate={coords}
              title={stop.name}
              pinColor={isCurrent ? "#10B981" : isNext ? "#F59E0B" : "#94A3B8"}
            />
          );
        })}
      </MapView>

      {!hasPosition && (
        <View className="absolute top-3 left-3 right-3">
          <View className="bg-slate-950/80 rounded-xl px-3 py-2 self-start">
            <Text className="text-amber-300 text-xs font-semibold">Waiting for GPS fix…</Text>
          </View>
        </View>
      )}

      {Platform.OS === "web" && (
        <View className="absolute inset-0 items-center justify-center bg-slate-950/90 px-6">
          <Text className="text-slate-300 text-sm text-center">
            Live map is only available on Android and iOS devices.
          </Text>
        </View>
      )}
    </View>
  );
});

export default TripMapView;
