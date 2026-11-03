import { LoginRequiredGate } from "@/components/ui/LoginRequiredGate";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getApiErrorMessage } from "@/services/apiResponse";
import { orderService } from "@/services/endpoints";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type TestResult = {
  id?: string | number;
  _id?: string | number;
  result_id?: string | number;
  request_id?: string | number;
  test_id?: string | number;
  testname?:
    | string
    | {
        id?: number;
        testname?: string;
        name?: string;
        category?: { testcategory?: string };
      };
  test_name?: string;
  test?: { testname?: string; name?: string; category?: { testcategory?: string } };
  result?: unknown;
  status?: string | number;
  amount?: number | string;
  created_at?: string | number | null;
  date?: string | number | null;
  date_reported?: string | number | null;
  date_uploaded?: string | number | null;
  order_reference?: string | null;
  report_file?: string | null;
};

function normalizeResults(payload: unknown): TestResult[] {
  const flatten = (entries: unknown[], parent?: Record<string, unknown>): TestResult[] =>
    entries.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const row = entry as Record<string, unknown>;
      const nested = Array.isArray(row.order_list)
        ? row.order_list
        : Array.isArray(row.data) && !row.testname && !row.test_name
          ? row.data
          : undefined;
      if (nested) {
        const inherited = {
          ...parent,
          order_reference:
            row.order_reference ?? row.title ?? parent?.order_reference ??
            (row.request_id !== undefined ? `Order #${row.request_id}` : undefined),
          request_id: row.request_id ?? parent?.request_id,
          date: row.date ?? row.created_at ?? parent?.date,
        };
        return flatten(nested, inherited);
      }
      const merged = { ...parent, ...row } as TestResult;
      if (!merged.testname && !merged.test_name && row.test && typeof row.test === "object") {
        merged.testname = row.test as TestResult["testname"];
      }
      return [merged];
    });

  if (Array.isArray(payload)) return flatten(payload);
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.order_list)) return flatten(record.order_list, record);
  if (Array.isArray(record.items)) return flatten(record.items);
  if (Array.isArray(record.results)) return flatten(record.results);
  if (Array.isArray(record.data)) return flatten(record.data);
  if (record.data !== undefined) return normalizeResults(record.data);
  return [];
}

function getTestName(result: TestResult) {
  if (typeof result.testname === "string") return result.testname;
  return (
    result.testname?.testname ||
    result.testname?.name ||
    result.test_name ||
    result.test?.testname ||
    result.test?.name ||
    (result.test_id !== undefined ? `Test ${result.test_id}` : "Test details unavailable")
  );
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "")
    return "Not available";
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  return JSON.stringify(value);
}

function resultDate(result: TestResult) {
  const raw =
    result.date_reported ??
    result.date_uploaded ??
    result.created_at ??
    result.date;
  if (raw === undefined || raw === null) return "Date unavailable";
  const date = new Date(raw);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function ResultsContent() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();
  // The custom tab bar floats above the screen content instead of reserving layout space.
  const listBottomPadding = Math.max(insets.bottom, 12) + 8 + 78 + 24;
  const [results, setResults] = useState<TestResult[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadResults = useCallback(async () => {
    try {
      const response = await orderService.getUserResults();
      const items = normalizeResults(response);
      items.sort(
        (a, b) =>
          new Date(
            b.date_reported ?? b.date_uploaded ?? b.created_at ?? b.date ?? 0,
          ).getTime() -
          new Date(
            a.date_reported ?? a.date_uploaded ?? a.created_at ?? a.date ?? 0,
          ).getTime(),
      );
      setResults(items);
      setError("");
    } catch (loadError) {
      setError(
        getApiErrorMessage(loadError, "Could not load your test results."),
      );
    }
  }, []);

  useEffect(() => {
    void loadResults().finally(() => setLoading(false));
  }, [loadResults]);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadResults();
    } finally {
      setRefreshing(false);
    }
  }, [loadResults]);

  const filteredResults = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return results;
    return results.filter((item) =>
      `${getTestName(item)} ${item.order_reference ?? ""} ${item.status ?? ""}`
        .toLowerCase()
        .includes(term),
    );
  }, [query, results]);

  const openResult = (result: TestResult, index: number) => {
    router.push({
      pathname: "/result-detail",
      params: {
        result: JSON.stringify(result),
        resultKey: String(
          result.result_id ?? result.id ?? result._id ?? result.test_id ?? index,
        ),
      },
    });
  };

  return (
    <SafeAreaView
      style={[
        styles.screen,
        {
          backgroundColor:
            colorScheme === "dark" ? colors.background : "#F8FAFC",
        },
      ]}
      edges={["top", "left", "right"]}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <View style={[styles.headerIcon, { backgroundColor: colors.accent }]}>
          <Ionicons
            name="document-text-outline"
            size={23}
            color={colors.primary}
          />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.navy }]}>
            Test results
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {results.length
              ? `${results.length} ${results.length === 1 ? "report" : "reports"}`
              : "Your diagnostic reports"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh results"
          onPress={() => void refresh()}
          style={[styles.refreshButton, { borderColor: colors.border }]}
        >
          <Ionicons name="refresh-outline" size={19} color={colors.primary} />
        </Pressable>
      </View>

      <View
        style={[
          styles.searchWrap,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Ionicons name="search-outline" size={19} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search results"
          placeholderTextColor={colors.muted}
          style={[styles.searchInput, { color: colors.navy }]}
          returnKeyType="search"
        />
        {query ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setQuery("")}
          >
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.stateText, { color: colors.muted }]}>
            Loading your reports…
          </Text>
        </View>
      ) : error && results.length === 0 ? (
        <View style={styles.state}>
          <View style={[styles.stateIcon, { backgroundColor: colors.peach }]}>
            <Ionicons
              name="cloud-offline-outline"
              size={25}
              color={colors.warning}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.navy }]}>
            Results unavailable
          </Text>
          <Text style={[styles.stateText, { color: colors.muted }]}>
            {error}
          </Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              void loadResults().finally(() => setLoading(false));
            }}
            style={[styles.retry, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredResults}
          keyExtractor={(item, index) =>
            String(
              item.result_id ??
                item.id ??
                item._id ??
                `${item.test_id ?? getTestName(item)}-${index}`,
            )
          }
          contentContainerStyle={[
            styles.list,
            { paddingBottom: listBottomPadding },
            filteredResults.length === 0 && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item, index }) => {
            const available =
              Boolean(item.report_file) ||
              Boolean(item.result) ||
              String(item.status) === "1" ||
              /ready|complete/i.test(String(item.status ?? ""));
            const statusLabel = available
              ? "Ready"
              : String(item.status || "Pending");
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View ${getTestName(item)} result`}
                onPress={() => openResult(item, index)}
                style={[
                  styles.resultCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.cardTop}>
                  <View
                    style={[
                      styles.testIcon,
                      { backgroundColor: colors.accent },
                    ]}
                  >
                    <Ionicons
                      name="flask-outline"
                      size={19}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.resultCopy}>
                    <Text
                      numberOfLines={2}
                      style={[styles.testName, { color: colors.navy }]}
                    >
                      {getTestName(item)}
                    </Text>
                    <Text style={[styles.resultMeta, { color: colors.muted }]}>
                      {resultDate(item)}
                      {item.order_reference
                        ? `  ·  ${item.order_reference}`
                        : ""}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: available
                          ? "#E8F8EF"
                          : colors.lavender,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: available
                            ? "#16A34A"
                            : colors.warning,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.status,
                        { color: available ? "#15803D" : colors.muted },
                      ]}
                    >
                      {statusLabel}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.resultValueRow,
                    { borderTopColor: colors.border },
                  ]}
                >
                  <View style={styles.valueCopy}>
                    <Text style={[styles.valueLabel, { color: colors.muted }]}>
                      REPORT
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.value, { color: colors.navy }]}
                    >
                      {available
                        ? item.report_file
                          ? "PDF report available"
                          : displayValue(item.result)
                        : "Report pending"}
                    </Text>
                  </View>
                  <View style={styles.viewLink}>
                    <Text style={[styles.viewText, { color: colors.primary }]}>
                      Details
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.primary}
                    />
                  </View>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View
                style={[styles.stateIcon, { backgroundColor: colors.accent }]}
              >
                <Ionicons
                  name={query ? "search-outline" : "document-text-outline"}
                  size={25}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.navy }]}>
                {query ? "No matching reports" : "No results yet"}
              </Text>
              <Text style={[styles.stateText, { color: colors.muted }]}>
                {query
                  ? "Try another test name or order reference."
                  : "Completed test reports will appear here."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

export default function ResultsScreen() {
  return (
    <LoginRequiredGate>
      <ResultsContent />
    </LoginRequiredGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1E7FF",
  },
  headerCopy: { flex: 1 },
  title: { fontSize: 19, fontWeight: "800" },
  subtitle: { fontSize: 11, marginTop: 3 },
  refreshButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderRadius: 15,
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 13,
  },
  searchInput: { flex: 1, fontSize: 13, paddingVertical: 0 },
  list: { padding: 16, paddingTop: 12, paddingBottom: 28, gap: 11 },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  resultCard: { borderWidth: 1, borderRadius: 18, padding: 14 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  testIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  resultCopy: { flex: 1 },
  testName: { fontSize: 13, fontWeight: "800", lineHeight: 18 },
  resultMeta: { fontSize: 10, marginTop: 4 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  status: { fontSize: 9, fontWeight: "800", textTransform: "capitalize" },
  resultValueRow: {
    minHeight: 46,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  valueCopy: { flex: 1 },
  valueLabel: { fontSize: 8, letterSpacing: 0.8, fontWeight: "800" },
  value: { fontSize: 12, fontWeight: "800", marginTop: 3 },
  viewLink: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewText: { fontSize: 11, fontWeight: "800" },
  state: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  stateIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", textAlign: "center" },
  stateText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
  },
  retry: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: 13,
    marginTop: 16,
  },
  retryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  emptyCard: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
  },
});
