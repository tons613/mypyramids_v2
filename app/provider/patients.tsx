import { LoginRequiredGate } from "@/components/ui/LoginRequiredGate";
import { naira } from "@/constants/format";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getApiErrorMessage } from "@/services/apiResponse";
import { orderService } from "@/services/endpoints";
import { RootState } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

type DataRecord = Record<string, unknown>;

type PatientProfile = DataRecord & {
  id?: string | number;
  user_id?: string | number;
  firstname?: string;
  lastname?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  fullname?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
};

type TestCategory = DataRecord & {
  testcategory?: string;
};

type TestCatalogItem = DataRecord & {
  id?: string | number;
  testname?: string;
  name?: string;
  price?: string | number;
  category?: TestCategory;
};

type PatientOrder = DataRecord & {
  id?: string | number;
  request_id?: string | number;
  user_id?: string | number;
  patient_id?: string | number;
  order_reference?: string;
  created_at?: string | number | null;
  status?: string | number;
  netamount?: string | number;
  patient_name?: string;
  patient_firstname?: string;
  patient_lastname?: string;
  patient?: PatientProfile | string;
  user?: PatientProfile;
  order_list?: OrderLine[];
  orders?: PatientOrder[];
};

type OrderLine = DataRecord & {
  test_id?: string | number;
  testname?: string | TestCatalogItem;
  test_name?: string;
  test?: TestCatalogItem;
  report_file?: string | null;
  status?: string | number;
  amount?: string | number;
  date_reported?: string | number | null;
  date_uploaded?: string | number | null;
};

type PatientOrdersPage = {
  items: PatientOrder[];
  total?: number;
  nextCursor?: number | string | null;
  stopped?: boolean;
};

const PAGE_SIZE = 20;

function isRecord(value: unknown): value is DataRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function flattenPatientOrders(items: unknown[]): PatientOrder[] {
  return items.flatMap((item) => {
    if (!isRecord(item)) return [];
    const hasOrderIdentity =
      item.request_id !== undefined ||
      item.order_reference !== undefined ||
      item.order_list !== undefined;
    if (!hasOrderIdentity && Array.isArray(item.orders)) {
      const patient = isRecord(item.patient)
        ? item.patient
        : isRecord(item.user)
          ? item.user
          : item;
      return item.orders.flatMap((order) =>
        isRecord(order)
          ? [
              {
                ...order,
                patient: order.patient ?? patient,
                patient_id:
                  order.patient_id ??
                  item.patient_id ??
                  item.user_id ??
                  item.id,
              } as PatientOrder,
            ]
          : [],
      );
    }
    return [item as PatientOrder];
  });
}

function normalizePatientOrders(payload: unknown): PatientOrdersPage {
  if (Array.isArray(payload)) {
    return { items: flattenPatientOrders(payload) };
  }
  if (!isRecord(payload)) return { items: [] };

  const paging = isRecord(payload.paging) ? payload.paging : undefined;
  const items = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.orders)
      ? payload.orders
      : Array.isArray(payload.patients)
        ? payload.patients
        : undefined;

  if (items) {
    const total = Number(paging?.total ?? payload.total);
    const cursor = paging?.nextcursor ?? payload.nextcursor;
    const nextCursor =
      (typeof cursor === "number" || typeof cursor === "string") &&
      stringValue(cursor) !== "" &&
      stringValue(cursor) !== "0"
        ? cursor
        : null;
    return {
      items: flattenPatientOrders(items),
      total: Number.isFinite(total) ? total : undefined,
      nextCursor,
      stopped:
        paging?.stop === true || payload.stop === true || nextCursor === null,
    };
  }

  if (payload.data !== undefined) {
    return normalizePatientOrders(payload.data);
  }
  return { items: [] };
}

function getPatientName(order: PatientOrder): string {
  const patient =
    order.patient && typeof order.patient === "object"
      ? order.patient
      : order.user;
  const first =
    stringValue(order.patient_firstname) ||
    stringValue(order.patient_first_name) ||
    stringValue(order.firstname) ||
    stringValue(patient?.firstname) ||
    stringValue(patient?.first_name);
  const last =
    stringValue(order.patient_lastname) ||
    stringValue(order.patient_last_name) ||
    stringValue(order.lastname) ||
    stringValue(patient?.lastname) ||
    stringValue(patient?.last_name);
  const fullName =
    stringValue(order.patient_name) ||
    stringValue(order.patientName) ||
    stringValue(order.patient) ||
    stringValue(patient?.full_name) ||
    stringValue(patient?.fullname) ||
    stringValue(patient?.name) ||
    [first, last].filter(Boolean).join(" ");
  if (fullName) return fullName;

  const patientId =
    order.patient_id ?? order.user_id ?? patient?.id ?? patient?.user_id;
  return patientId !== undefined && patientId !== null
    ? `Patient #${patientId}`
    : "Patient";
}

function getOrderLines(order: PatientOrder): OrderLine[] {
  return Array.isArray(order.order_list) ? order.order_list : [];
}

function getTestName(line: OrderLine): string {
  const testName = line.testname;
  if (typeof testName === "string" && testName.trim()) return testName;
  if (isRecord(testName)) {
    const nestedName =
      stringValue(testName.testname) || stringValue(testName.name);
    if (nestedName) return nestedName;
  }
  if (stringValue(line.test_name)) return stringValue(line.test_name);
  if (isRecord(line.test)) {
    const nestedName =
      stringValue(line.test.testname) || stringValue(line.test.name);
    if (nestedName) return nestedName;
  }
  return line.test_id !== undefined
    ? `Test ${line.test_id}`
    : "Diagnostic test";
}

function getOrderStatus(value: PatientOrder["status"]): string {
  const status = Number(value);
  if (status === 0) return "Pending";
  if (status === 1) return "Accepted";
  if (status === 2) return "In progress";
  return stringValue(value) || "Status unavailable";
}

function formatDate(value: PatientOrder["created_at"]): string {
  if (value === undefined || value === null || value === "") {
    return "Date unavailable";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function orderKey(order: PatientOrder, index: number): string {
  return String(
    order.request_id ?? order.id ?? order.order_reference ?? `order-${index}`,
  );
}

function ProviderPatientsContent() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const user = useSelector((state: RootState) => state.auth.user);
  const isProvider = user?.role?.toLowerCase() === "provider";
  const [orders, setOrders] = useState<PatientOrder[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [paginationError, setPaginationError] = useState("");
  const [total, setTotal] = useState<number>();
  const [nextCursor, setNextCursor] = useState<number | string | null>(null);
  const loadingMoreRef = useRef(false);

  const loadOrders = useCallback(
    async (cursor: number | string = 1, append = false) => {
      if (append && loadingMoreRef.current) return;
      if (append) {
        loadingMoreRef.current = true;
        setLoadingMore(true);
        setPaginationError("");
      }
      try {
        const response = await orderService.getMyPatients(cursor, PAGE_SIZE);
        const page = normalizePatientOrders(response);
        setOrders((current) => {
          if (!append) return page.items;
          const seen = new Set(
            current.map((item, index) => orderKey(item, index)),
          );
          return [
            ...current,
            ...page.items.filter(
              (item, index) => !seen.has(orderKey(item, index)),
            ),
          ];
        });
        setTotal(page.total);
        setNextCursor(
          page.stopped
            ? null
            : (page.nextCursor ??
                (page.items.length >= PAGE_SIZE
                  ? (Number(cursor) || 1) + 1
                  : null)),
        );
        setError("");
      } catch (loadError) {
        const message = getApiErrorMessage(
          loadError,
          "Could not load your patient orders.",
        );
        if (append) setPaginationError(message);
        else setError(message);
      } finally {
        if (append) {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!isProvider) return;
    void (async () => {
      await loadOrders(1);
      setLoading(false);
    })();
  }, [isProvider, loadOrders]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setPaginationError("");
    try {
      await loadOrders(1);
    } finally {
      setRefreshing(false);
    }
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((order) => {
      const tests = getOrderLines(order).map(getTestName).join(" ");
      return `${getPatientName(order)} ${order.order_reference ?? ""} ${
        order.request_id ?? ""
      } ${order.status ?? ""} ${tests}`
        .toLowerCase()
        .includes(term);
    });
  }, [orders, query]);

  const openOrder = (order: PatientOrder) => {
    router.push({
      pathname: "/order/history-detail",
      params: {
        order: JSON.stringify({
          ...order,
          patient_name: getPatientName(order),
        }),
      },
    });
  };

  const openResult = (order: PatientOrder, line: OrderLine) => {
    const report = stringValue(line.report_file);
    if (!/^https:\/\//i.test(report)) return;
    router.push({
      pathname: "/result-detail",
      params: {
        result: JSON.stringify({
          ...line,
          request_id: order.request_id ?? order.id,
          order_reference: order.order_reference,
          order_created_at: order.created_at,
          patient_name: getPatientName(order),
        }),
      },
    });
  };

  if (!isProvider) {
    return (
      <SafeAreaView
        style={[styles.screen, { backgroundColor: colors.background }]}
        edges={["top", "left", "right"]}
      >
        <View style={styles.centerState}>
          <View style={[styles.stateIcon, { backgroundColor: colors.accent }]}>
            <Ionicons
              name="lock-closed-outline"
              size={25}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.navy }]}>
            Provider access only
          </Text>
          <Text style={[styles.stateCopy, { color: colors.muted }]}>
            Patient orders are available to provider accounts.
          </Text>
          <Pressable
            onPress={() => router.replace("/(tabs)")}
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.actionText}>Back to home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)")
          }
          style={[styles.backButton, { borderColor: colors.border }]}
        >
          <Ionicons name="arrow-back" size={21} color={colors.navy} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.navy }]}>My Patient</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {total !== undefined
              ? `${total} ${total === 1 ? "order" : "orders"}`
              : "Patient orders and results"}
          </Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: colors.accent }]}>
          <Ionicons name="people-outline" size={20} color={colors.primary} />
        </View>
      </View>

      <View
        style={[
          styles.searchWrap,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Ionicons name="search-outline" size={19} color={colors.muted} />
        <TextInput
          accessibilityLabel="Search patient orders"
          placeholder="Search patients, tests or orders"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          style={[styles.searchInput, { color: colors.navy }]}
        />
        {query ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setQuery("")}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={19} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.stateCopy, { color: colors.muted }]}>
            Loading patient orders…
          </Text>
        </View>
      ) : error && orders.length === 0 ? (
        <View style={styles.centerState}>
          <View style={[styles.stateIcon, { backgroundColor: colors.peach }]}>
            <Ionicons
              name="cloud-offline-outline"
              size={27}
              color={colors.warning}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.navy }]}>
            Couldn’t load patient orders
          </Text>
          <Text style={[styles.stateCopy, { color: colors.muted }]}>
            {error}
          </Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              void loadOrders(1).finally(() => setLoading(false));
            }}
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.actionText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={orderKey}
          contentContainerStyle={[
            styles.list,
            filteredOrders.length === 0 && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (nextCursor !== null && !loadingMore) {
              void loadOrders(nextCursor, true);
            }
          }}
          onEndReachedThreshold={0.45}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => {
            const lines = getOrderLines(item);
            const status = getOrderStatus(item.status);
            const statusColor =
              Number(item.status) > 0 ? colors.primary : colors.muted;
            const orderReference =
              stringValue(item.order_reference) ||
              `Order #${item.request_id ?? item.id ?? ""}`;

            return (
              <View
                style={[
                  styles.orderCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.orderTop}>
                  <View
                    style={[
                      styles.patientIcon,
                      { backgroundColor: colors.accent },
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={19}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.orderHeading}>
                    <Text
                      numberOfLines={1}
                      style={[styles.patientName, { color: colors.navy }]}
                    >
                      {getPatientName(item)}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.orderReference, { color: colors.muted }]}
                    >
                      {orderReference}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: colors.accent },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {status}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderMeta}>
                  <Text style={[styles.metaText, { color: colors.muted }]}>
                    {formatDate(item.created_at)}
                  </Text>
                  {item.netamount !== undefined ? (
                    <Text style={[styles.amount, { color: colors.navy }]}>
                      {naira(item.netamount)}
                    </Text>
                  ) : null}
                </View>

                {lines.length ? (
                  <View
                    style={[styles.tests, { borderTopColor: colors.border }]}
                  >
                    {lines.map((line, index) => {
                      const report = stringValue(line.report_file);
                      const hasValidReport = /^https:\/\//i.test(report);
                      return (
                        <View
                          key={`${line.test_id ?? index}-${index}`}
                          style={[
                            styles.testRow,
                            index > 0 && {
                              borderTopColor: colors.border,
                              borderTopWidth: StyleSheet.hairlineWidth,
                            },
                          ]}
                        >
                          <View style={styles.testCopy}>
                            <Text
                              numberOfLines={2}
                              style={[styles.testName, { color: colors.navy }]}
                            >
                              {getTestName(line)}
                            </Text>
                            <Text
                              style={[
                                styles.reportStatus,
                                {
                                  color: hasValidReport
                                    ? colors.success
                                    : colors.muted,
                                },
                              ]}
                            >
                              {hasValidReport
                                ? "Result available"
                                : "Result not available yet"}
                            </Text>
                          </View>
                          {hasValidReport ? (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`View ${getTestName(line)} result for ${getPatientName(item)}`}
                              onPress={() => openResult(item, line)}
                              style={[
                                styles.resultButton,
                                { backgroundColor: colors.accent },
                              ]}
                            >
                              <Ionicons
                                name="document-text-outline"
                                size={15}
                                color={colors.primary}
                              />
                              <Text
                                style={[
                                  styles.resultButtonText,
                                  { color: colors.primary },
                                ]}
                              >
                                View result
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={[styles.noTests, { color: colors.muted }]}>
                    Test details are not available for this order.
                  </Text>
                )}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Manage order ${orderReference} for ${getPatientName(item)}`}
                  onPress={() => openOrder(item)}
                  style={[
                    styles.detailsButton,
                    { borderTopColor: colors.border },
                  ]}
                >
                  <Text style={[styles.detailsText, { color: colors.primary }]}>
                    View order details
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={17}
                    color={colors.primary}
                  />
                </Pressable>
              </View>
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
                  name={query ? "search-outline" : "people-outline"}
                  size={26}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.navy }]}>
                {query ? "No matching orders" : "No patient orders yet"}
              </Text>
              <Text style={[styles.stateCopy, { color: colors.muted }]}>
                {query
                  ? "Try another patient name, test or order reference."
                  : "Orders you place for patients will appear here."}
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.listFooter}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : paginationError ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (nextCursor !== null) {
                    void loadOrders(nextCursor, true);
                  }
                }}
                style={styles.listFooter}
              >
                <Text style={[styles.footerError, { color: colors.primary }]}>
                  Couldn’t load more orders. Tap to retry.
                </Text>
              </Pressable>
            ) : undefined
          }
        />
      )}
    </SafeAreaView>
  );
}

export default function ProviderPatientsScreen() {
  return (
    <LoginRequiredGate>
      <ProviderPatientsContent />
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
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1 },
  title: { fontSize: 19, fontWeight: "800" },
  subtitle: { fontSize: 11, marginTop: 3 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderRadius: 14,
  },
  searchInput: { flex: 1, minHeight: 46, fontSize: 12 },
  list: { padding: 16, paddingTop: 13, paddingBottom: 28, gap: 11 },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  orderCard: { borderWidth: 1, borderRadius: 18, padding: 14 },
  orderTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  patientIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  orderHeading: { flex: 1 },
  patientName: { fontSize: 14, fontWeight: "800" },
  orderReference: { fontSize: 10, marginTop: 4 },
  statusPill: { borderRadius: 11, paddingHorizontal: 9, paddingVertical: 5 },
  statusText: { fontSize: 10, fontWeight: "800" },
  orderMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  metaText: { fontSize: 10 },
  amount: { fontSize: 12, fontWeight: "800" },
  tests: {
    marginTop: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  testRow: {
    minHeight: 51,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 8,
  },
  testCopy: { flex: 1 },
  testName: { fontSize: 11, fontWeight: "700" },
  reportStatus: { fontSize: 10, marginTop: 3 },
  resultButton: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: 10,
  },
  resultButtonText: { fontSize: 10, fontWeight: "700" },
  noTests: { fontSize: 11, lineHeight: 17, marginTop: 12 },
  detailsButton: {
    minHeight: 42,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 5,
    paddingTop: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailsText: { fontSize: 11, fontWeight: "800" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  stateIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", textAlign: "center" },
  stateCopy: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 7,
  },
  actionButton: {
    minHeight: 43,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingHorizontal: 18,
    borderRadius: 13,
  },
  actionText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  emptyCard: {
    alignItems: "center",
    padding: 24,
    borderWidth: 1,
    borderRadius: 19,
  },
  listFooter: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  footerError: { fontSize: 11, fontWeight: "700" },
});
