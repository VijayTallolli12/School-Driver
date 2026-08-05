import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchDocuments } from "@/services/api";
import type { StudentDocument } from "@/types";
import { OfflineState } from "@/components/ui/OfflineState";

function getVerificationStyle(isVerified: boolean): { label: string; color: string; bg: string; icon: string } {
  return isVerified
    ? { label: "Verified", color: "#16A34A", bg: "bg-green-50", icon: "checkmark-circle" }
    : { label: "Pending", color: "#F59E0B", bg: "bg-amber-50", icon: "time" };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function DocumentsScreen() {
  const parentUuid = useAuthStore((s) => s.parentUuid);
  const students = useAuthStore((s) => s.students);
  const selectedStudentUuid = useAuthStore((s) => s.selectedStudentUuid);
  const childUuid = selectedStudentUuid ?? students?.[0]?.uuid;

  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!parentUuid || !childUuid) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError(null);
      const result = await fetchDocuments(parentUuid, childUuid);
      setDocuments(result);
    } catch (err: any) {
      console.error("[Documents] load error:", err);
      setError(err?.response?.data?.message ?? "Failed to load documents");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [parentUuid, childUuid]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDocuments();
  }, [loadDocuments]);

  const handleViewDocument = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
    } catch {
      console.warn("[Documents] Failed to open document");
    }
  };

  const verificationSummary = {
    verified: documents.filter((d) => d.is_verified).length,
    pending: documents.filter((d) => !d.is_verified).length,
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      <View className="bg-white px-5 pt-3 pb-3 border-b border-slate-100">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-8 h-8 items-center justify-center -ml-1 mr-2"
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color="#475569" />
          </TouchableOpacity>
          <Text className="text-slate-900 text-lg font-bold tracking-tight">Documents</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-5"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />}
      >
        {loading ? (
          <View className="items-center justify-center pt-24">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-slate-400 text-sm mt-3">Loading documents...</Text>
          </View>
        ) : error ? (
          <OfflineState message={error} onRetry={onRefresh} />
        ) : documents.length === 0 ? (
          <EmptyState
            icon="folder-open-outline"
            title="No Documents"
            description="Uploaded documents will appear here once added by the school"
          />
        ) : (
          <>
            <View className="flex-row gap-2 mb-4">
              <Card padding="md" className="flex-1 items-center">
                <Text className="text-green-600 text-xl font-bold">{verificationSummary.verified}</Text>
                <Text className="text-slate-400 text-xs mt-1">Verified</Text>
              </Card>
              <Card padding="md" className="flex-1 items-center">
                <Text className="text-amber-600 text-xl font-bold">{verificationSummary.pending}</Text>
                <Text className="text-slate-400 text-xs mt-1">Pending</Text>
              </Card>
            </View>

            <View className="gap-3 mb-8">
              {documents.map((doc) => {
                const vs = getVerificationStyle(doc.is_verified);
                return (
                  <Card key={doc.id} padding="none" className="overflow-hidden">
                    <View className="px-4 py-3.5">
                      <View className="flex-row items-start">
                        <View className="w-10 h-10 bg-slate-50 rounded-xl items-center justify-center mr-3">
                          <Ionicons name="document-text-outline" size={22} color="#64748B" />
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center justify-between">
                            <Text className="text-slate-900 text-sm font-bold flex-1 mr-2" numberOfLines={1}>
                              {doc.title}
                            </Text>
                            <View className={`px-2.5 py-1 rounded-lg ${vs.bg} shrink-0`}>
                              <View className="flex-row items-center gap-1">
                                <Ionicons name={vs.icon as any} size={12} color={vs.color} />
                                <Text className="text-xs font-bold" style={{ color: vs.color }}>{vs.label}</Text>
                              </View>
                            </View>
                          </View>

                          <Text className="text-slate-500 text-xs mt-1.5">{doc.document_type_label || doc.document_type.replace(/_/g, " ")}</Text>

                          <View className="flex-row items-center mt-2 gap-4">
                            <View className="flex-row items-center">
                              <Ionicons name="calendar-outline" size={12} color="#94A3B8" />
                              <Text className="text-slate-400 text-xs ml-1">Uploaded: {formatDate(doc.created_at)}</Text>
                            </View>
                            {doc.expiry_date && (
                              <View className="flex-row items-center">
                                <Ionicons name="alert-circle-outline" size={12} color="#F59E0B" />
                                <Text className="text-amber-600 text-xs ml-1">Expires: {formatDate(doc.expiry_date)}</Text>
                              </View>
                            )}
                          </View>

                          {doc.remarks && (
                            <Text className="text-slate-400 text-xs mt-2 italic">{doc.remarks}</Text>
                          )}
                        </View>
                      </View>
                    </View>

                    {doc.download_url && (
                      <TouchableOpacity
                        className="bg-slate-50/50 px-4 py-3 flex-row items-center justify-center"
                        activeOpacity={0.7}
                        onPress={() => handleViewDocument(doc.download_url!)}
                      >
                        <Ionicons name="eye-outline" size={16} color="#3B82F6" />
                        <Text className="text-primary-600 text-sm font-semibold ml-2">View Document</Text>
                      </TouchableOpacity>
                    )}
                  </Card>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
