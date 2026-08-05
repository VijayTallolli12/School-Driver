import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { Card } from "@/components/ui/Card";
import { fetchFees } from "@/services/api";
import type { StudentFee } from "@/types";
import { OfflineState } from "@/components/ui/OfflineState";

export default function FeesScreen() {
  const [activeTab, setActiveTab] = useState<"overview" | "history">("overview");
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parentUuid = useAuthStore((s) => s.parentUuid);
  const students = useAuthStore((s) => s.students);
  const selectedStudentUuid = useAuthStore((s) => s.selectedStudentUuid);
  const childUuid = selectedStudentUuid ?? students?.[0]?.uuid;

  const loadFees = useCallback(async () => {
    if (!parentUuid || !childUuid) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError(null);
      const result = await fetchFees(parentUuid, childUuid);
      setFees(result);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load fees");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [parentUuid, childUuid]);

  useEffect(() => {
    loadFees();
  }, [loadFees]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFees();
  }, [loadFees]);

  const totalAmount = fees.reduce((s, f) => s + (f.total_amount ?? 0), 0);
  const totalPaid = fees.reduce((s, f) => s + (f.total_paid ?? 0), 0);
  const totalDue = fees.reduce((s, f) => s + (f.total_balance ?? 0), 0);
  const paidPercentage = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;

  const unpaidFees = fees.filter((f) => f.status === "unpaid" || f.status === "partial");
  const paidFees = fees.filter((f) => f.status === "paid");

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
          <Text className="text-slate-900 text-lg font-bold tracking-tight">Fees</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-5"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" colors={["#10B981"]} />}
      >
        {loading ? (
          <View className="items-center justify-center pt-24">
            <ActivityIndicator size="large" color="#10B981" />
            <Text className="text-slate-400 text-sm mt-3">Loading fees...</Text>
          </View>
        ) : error ? (
          <OfflineState message={error} onRetry={onRefresh} />
        ) : fees.length === 0 ? (
          <View className="items-center justify-center pt-16 px-8">
            <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="wallet-outline" size={28} color="#94A3B8" />
            </View>
            <Text className="text-slate-700 text-base font-semibold text-center">No Fee Records</Text>
            <Text className="text-slate-400 text-sm text-center mt-1.5 leading-5">Fee information will appear here once published by the school</Text>
          </View>
        ) : (
          <>
            <Card padding="lg" className="mb-4">
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total Fees</Text>
                  <Text className="text-slate-900 text-3xl font-bold mt-1">₹{totalAmount.toLocaleString()}</Text>
                </View>
                <View className="w-12 h-12 bg-green-50 rounded-2xl items-center justify-center">
                  <Ionicons name="wallet-outline" size={24} color="#16A34A" />
                </View>
              </View>

              <View className="bg-slate-100 rounded-full h-2.5 mb-4 overflow-hidden">
                <View className="h-full rounded-full bg-green-500" style={{ width: `${paidPercentage}%` }} />
              </View>

              <View className="flex-row justify-between">
                <View className="items-center flex-1">
                  <Text className="text-green-600 text-lg font-bold">₹{totalPaid.toLocaleString()}</Text>
                  <Text className="text-slate-400 text-xs mt-0.5">Paid</Text>
                </View>
                <View className="w-px bg-slate-100" />
                <View className="items-center flex-1">
                  <Text className="text-amber-600 text-lg font-bold">₹{totalDue.toLocaleString()}</Text>
                  <Text className="text-slate-400 text-xs mt-0.5">Due</Text>
                </View>
              </View>
            </Card>

            {unpaidFees.length > 0 && (
              <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-amber-100 rounded-xl items-center justify-center mr-3">
                    <Ionicons name="alert-circle" size={22} color="#F59E0B" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-amber-800 text-sm font-bold">{unpaidFees.length} Payments Due</Text>
                    <Text className="text-amber-600 text-xs mt-0.5">Total due: ₹{totalDue.toLocaleString()}</Text>
                  </View>
                  <TouchableOpacity className="px-3 py-2 bg-amber-500 rounded-lg">
                    <Text className="text-white text-xs font-bold">Pay Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View className="flex-row bg-slate-100 rounded-xl p-1 mb-4">
              <TouchableOpacity
                className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === "overview" ? "bg-white" : ""}`}
                onPress={() => setActiveTab("overview")}
              >
                <Text className={`text-sm font-semibold ${activeTab === "overview" ? "text-primary-600" : "text-slate-500"}`}>
                  Fee Structure
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === "history" ? "bg-white" : ""}`}
                onPress={() => setActiveTab("history")}
              >
                <Text className={`text-sm font-semibold ${activeTab === "history" ? "text-primary-600" : "text-slate-500"}`}>
                  Payment History
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === "overview" && (
              <View className="gap-3 mb-8">
                {fees.map((fee) => {
                  const items = fee.items ?? [];
                  const dueDate = items.find((i) => i.due_date)?.due_date ?? fee.assigned_at;
                  const statusColor = fee.status === "paid" ? "#16A34A" : fee.status === "partial" ? "#D97706" : "#DC2626";
                  const statusBg = fee.status === "paid" ? "bg-green-50" : fee.status === "partial" ? "bg-amber-50" : "bg-red-50";
                  const statusText = fee.status === "paid" ? "text-green-700" : fee.status === "partial" ? "text-amber-700" : "text-red-700";
                  return (
                    <Card key={fee.id} padding="none" className="overflow-hidden">
                      <View className="flex-row items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                        <Text className="text-slate-800 text-sm font-semibold">
                          {dueDate ? `Due: ${new Date(dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : `Fee #${fee.id}`}
                        </Text>
                        <View className={`px-2.5 py-1 rounded-lg ${statusBg}`}>
                          <Text className={`text-xs font-bold ${statusText}`}>
                            {fee.status === "paid" ? "Paid" : fee.status === "partial" ? "Partial" : "Unpaid"}
                          </Text>
                        </View>
                      </View>
                      {items.map((item) => (
                        <View key={item.id} className="flex-row items-center px-4 py-3 border-b border-slate-50">
                          <View className="w-2 h-2 rounded-full bg-slate-300 mr-3" />
                          <Text className="flex-1 text-slate-600 text-sm">{item.fee_category ?? `Item #${item.id}`}</Text>
                          <Text className="text-slate-800 text-sm font-semibold mr-3">₹{item.amount.toLocaleString()}</Text>
                          <Text className={`text-sm font-medium ${item.paid > 0 ? "text-green-600" : "text-slate-400"}`}>
                            {item.paid > 0 ? `₹${item.paid.toLocaleString()}` : "—"}
                          </Text>
                        </View>
                      ))}
                      <View className="flex-row items-center px-4 py-3 bg-slate-50/50">
                        <Text className="flex-1 text-slate-500 text-xs">
                          <Text className="font-semibold">Total:</Text> ₹{fee.total_amount.toLocaleString()}
                        </Text>
                        <Text className="text-amber-600 text-xs">
                          <Text className="font-semibold">Balance:</Text> ₹{fee.total_balance.toLocaleString()}
                        </Text>
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}

            {activeTab === "history" && (
              <Card padding="none" className="overflow-hidden mb-8">
                {paidFees.length > 0 ? (
                  paidFees.map((fee, index) => {
                    const items = fee.items ?? [];
                    return (
                      <View key={fee.id} className={`flex-row items-center px-4 py-3.5 ${index < paidFees.length - 1 ? "border-b border-slate-50" : ""}`}>
                        <View className="w-10 h-10 bg-green-50 rounded-xl items-center justify-center mr-3">
                          <Ionicons name="receipt-outline" size={20} color="#16A34A" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-slate-800 text-sm font-semibold">{items[0]?.fee_category ?? `Fee #${fee.id}`}</Text>
                          <Text className="text-slate-400 text-xs mt-0.5">
                            {fee.assigned_at ? `Paid on ${new Date(fee.assigned_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                          </Text>
                        </View>
                        <TouchableOpacity className="px-3 py-1.5 bg-slate-100 rounded-lg mr-2">
                          <Text className="text-slate-600 text-xs font-semibold">Receipt</Text>
                        </TouchableOpacity>
                        <Text className="text-green-600 text-sm font-bold">₹{fee.total_paid.toLocaleString()}</Text>
                      </View>
                    );
                  })
                ) : (
                  <View className="items-center justify-center py-12 px-8">
                    <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mb-4">
                      <Ionicons name="receipt-outline" size={28} color="#94A3B8" />
                    </View>
                    <Text className="text-slate-700 text-base font-semibold text-center">No Payment History</Text>
                    <Text className="text-slate-400 text-sm text-center mt-1.5">Your payment records will appear here</Text>
                  </View>
                )}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
