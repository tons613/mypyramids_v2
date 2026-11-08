import { LoginRequiredGate } from "@/components/ui/LoginRequiredGate";
import { naira } from "@/constants/format";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

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
  test?: {
    testname?: string;
    name?: string;
    category?: { testcategory?: string };
  };
  amount?: number | string;
  result?: unknown;
  status?: string | number;
  created_at?: string | number | null;
  order_created_at?: string | number | null;
  date?: string | number | null;
  date_reported?: string | number | null;
  date_uploaded?: string | number | null;
  order_reference?: string | null;
  report_file?: string | null;
  patient_name?: string | null;
};

function humanize(value?: string | number) {
  if (value === undefined || value === null || value === "")
    return "Status unavailable";
  const status = String(value).toLowerCase();
  if (status === "completed" || status === "ready" || status === "1")
    return "Ready";
  if (status === "pending" || status === "0") return "Pending";
  if (status.includes("process") || status === "2") return "In progress";
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string | number | null) {
  if (value === undefined || value === null) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

function ResultDetailContent() {
  const router = useRouter();
  const { result: resultParam } = useLocalSearchParams<{ result?: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const result = useMemo<TestResult | null>(() => {
    const serialized = Array.isArray(resultParam)
      ? resultParam[0]
      : resultParam;
    if (!serialized) return null;
    try {
      return JSON.parse(serialized) as TestResult;
    } catch {
      return null;
    }
  }, [resultParam]);
  const name =
    typeof result?.testname === "string"
      ? result.testname
      : result?.testname?.testname ||
        result?.testname?.name ||
        result?.test_name ||
        result?.test?.testname ||
        result?.test?.name ||
        (result?.test_id !== undefined
          ? `Test ${result.test_id}`
          : "Test result");
  const category =
    typeof result?.testname === "object"
      ? result.testname?.category?.testcategory
      : result?.test?.category?.testcategory;
  const isReady =
    Boolean(result?.report_file) ||
    String(result?.status) === "1" ||
    /ready|complete/i.test(String(result?.status ?? ""));
  const reportUrl = result?.report_file?.trim() ?? "";
  const validReportUrl = /^https:\/\//i.test(reportUrl);

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
          accessibilityLabel="Back to test results"
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tabs)/results")
          }
          style={[styles.backButton, { borderColor: colors.border }]}
        >
          <Ionicons name="arrow-back" size={21} color={colors.navy} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.navy }]}>
            Result details
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.subtitle, { color: colors.muted }]}
          >
            {name || "Diagnostic report"}
          </Text>
        </View>
      </View>

      {!result ? (
        <View style={styles.missingState}>
          <View style={[styles.icon, { backgroundColor: colors.peach }]}>
            <Ionicons
              name="document-text-outline"
              size={27}
              color={colors.warning}
            />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.navy }]}>
            Report unavailable
          </Text>
          <Text style={[styles.copy, { color: colors.muted }]}>
            Return to Test Results and select a report to view its details.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.hero, { backgroundColor: colors.primary }]}>
            <View style={styles.heroTop}>
              <View style={styles.heroIcon}>
                <Ionicons name="flask-outline" size={21} color="#FFFFFF" />
              </View>
              <View style={styles.heroStatus}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: isReady ? "#4ADE80" : "#FCD34D" },
                  ]}
                />
                <Text style={styles.heroStatusText}>
                  {humanize(result.status ?? (isReady ? "ready" : "pending"))}
                </Text>
              </View>
            </View>
            <Text style={styles.heroLabel}>TEST RESULT</Text>
            <Text style={styles.heroName}>{name || "Diagnostic test"}</Text>
            {category ? (
              <Text style={styles.heroCategory}>{category}</Text>
            ) : null}
            <Text style={styles.heroDate}>
              Order date:{" "}
              {formatDate(result.order_created_at)}
            </Text>
            {result.date_reported || result.date_uploaded ? (
              <Text style={styles.heroDate}>
                Reported{" "}
                {formatDate(
                  result.date_reported ??
                    result.date_uploaded
                )}
              </Text>
            ) : null}
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.documentHeading}>
              <View
                style={[
                  styles.documentIcon,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={styles.documentCopy}>
                <Text style={[styles.sectionTitle, { color: colors.navy }]}>
                  Laboratory report
                </Text>
                <Text style={[styles.copy, { color: colors.muted }]}>
                  {reportUrl
                    ? result.patient_name
                      ? `PDF report for ${result.patient_name} is ready to view.`
                      : "Your PDF report is ready to view."
                    : "The report document has not been uploaded yet."}
                </Text>
              </View>
            </View>
            {reportUrl ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open PDF report"
                disabled={!validReportUrl}
                onPress={() =>
                  router.push({
                    pathname: "/pdf-viewer",
                    params: { uri: reportUrl, title: name || "Lab report" },
                  })
                }
                style={[
                  styles.pdfButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: validReportUrl ? 1 : 0.55,
                  },
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.pdfButtonText}>Open report PDF</Text>
                <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
              </Pressable>
            ) : null}
          </View>
          <View
            style={[
              styles.noteCard,
              { backgroundColor: colors.accent, borderColor: colors.border },
            ]}
          >
            <Ionicons name="medical-outline" size={19} color={colors.primary} />
            <Text style={[styles.note, { color: colors.navy }]}>
              {result.patient_name
                ? `${result.patient_name}’s results should be interpreted by a qualified healthcare professional in the context of their symptoms and medical history.`
                : "Your results should be interpreted by a qualified healthcare professional in the context of your symptoms and medical history."}
            </Text>
          </View>

          <View
            style={[
              styles.metaCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {result.patient_name ? (
              <MetaRow
                label="PATIENT"
                value={result.patient_name}
                colors={colors}
              />
            ) : null}
            {result.order_reference ? (
              <MetaRow
                label="ORDER REFERENCE"
                value={result.order_reference}
                colors={colors}
              />
            ) : null}
            {/* {result.result_id !== undefined || result.id !== undefined ? (
              <MetaRow
                label="RESULT ID"
                value={String(result.result_id ?? result.id)}
                colors={colors}
              />
            ) : null}
            {result.request_id !== undefined ? (
              <MetaRow
                label="REQUEST ID"
                value={String(result.request_id)}
                colors={colors}
              />
            ) : null} */}
            {result.amount !== undefined ? (
              <MetaRow
                label="TEST AMOUNT"
                value={naira(result.amount)}
                colors={colors}
              />
            ) : null}
            {result.date_reported ? (
              <MetaRow
                label="DATE REPORTED"
                value={formatDate(result.date_reported)}
                colors={colors}
              />
            ) : null}
            {result.date_uploaded ? (
              <MetaRow
                label="UPLOADED"
                value={formatDate(result.date_uploaded)}
                colors={colors}
              />
            ) : null}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function MetaRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.metaRow}>
      <Text style={[styles.metaLabel, { color: colors.muted }]}>{label}</Text>
      <Text selectable style={[styles.metaValue, { color: colors.navy }]}>
        {value}
      </Text>
    </View>
  );
}

export default function ResultDetailScreen() {
  return (
    <LoginRequiredGate>
      <ResultDetailContent />
    </LoginRequiredGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    minHeight: 72,
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
  content: { padding: 16, paddingBottom: 30, gap: 12 },
  hero: { padding: 18, borderRadius: 19 },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  heroStatusText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  heroLabel: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 19,
  },
  heroName: {
    color: "#FFFFFF",
    fontSize: 20,
    lineHeight: 27,
    fontWeight: "900",
    marginTop: 5,
  },
  heroCategory: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  heroDate: { color: "rgba(255,255,255,0.82)", fontSize: 11, marginTop: 6 },
  card: { borderRadius: 17, borderWidth: 1, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: "800" },
  resultValue: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "800",
    marginTop: 8,
  },
  documentHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  documentCopy: { flex: 1 },
  pdfButton: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 13,
    padding: 12,
    marginTop: 14,
  },
  pdfButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  valueLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 16,
  },
  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderRadius: 15,
    padding: 14,
  },
  note: { flex: 1, fontSize: 11, lineHeight: 17 },
  metaCard: { borderRadius: 15, borderWidth: 1, padding: 14 },
  metaRow: { marginBottom: 11 },
  metaLabel: { fontSize: 8, letterSpacing: 0.8, fontWeight: "800" },
  metaValue: { fontSize: 13, fontWeight: "700", marginTop: 5 },
  missingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  copy: { fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 7 },
});
