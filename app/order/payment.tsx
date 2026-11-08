import { LoginRequiredGate } from "@/components/ui/LoginRequiredGate";
import { naira } from "@/constants/format";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { RootState } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useSelector } from "react-redux";

function PaymentContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    amount?: string;
    collectionType?: string;
    address?: string;
    landmark?: string;
    clinicalInfo?: string;
    quantity?: string;
  }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const items = useSelector((state: RootState) => state.cart.items);
  const recipient = useSelector((state: RootState) => state.checkout.recipient);
  const user = useSelector((state: RootState) => state.auth.user);
  const amount = Number(params.amount || 0);
  const collection =
    params.collectionType === "home"
      ? "Home collection"
      : "At a collection centre";
  const quantity = Number(
    params.quantity || items.reduce((sum, item) => sum + item.quantity, 0),
  );

  const handleBack = () =>
    router.canGoBack() ? router.back() : router.replace("/order/checkout");

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
          accessibilityLabel="Back to checkout"
          onPress={handleBack}
          style={[styles.backButton, { borderColor: colors.border }]}
        >
          <Ionicons name="arrow-back" size={21} color={colors.navy} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.headerTitle, { color: colors.navy }]}>
            Order summary
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
            Review one last time before payment
          </Text>
        </View>
        <View style={[styles.stepBadge, { backgroundColor: colors.accent }]}>
          <Text style={[styles.stepText, { color: colors.primary }]}>
            2 of 3
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.amountCard, { backgroundColor: colors.primary }]}>
          <View style={styles.amountCardTop}>
            <View style={styles.amountIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.amountCaption}>TOTAL TO PAY</Text>
          </View>
          <Text style={styles.amountValue}>{naira(amount)}</Text>
          <Text style={styles.amountFootnote}>
            Includes your selected collection option
          </Text>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.cardHeading}>
            <View
              style={[styles.headingIcon, { backgroundColor: colors.accent }]}
            >
              <Ionicons
                name="receipt-outline"
                size={18}
                color={colors.primary}
              />
            </View>
            <View style={styles.headerCopy}>
              <Text style={[styles.cardTitle, { color: colors.navy }]}>
                Order summary
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
                {quantity}{" "}
                {quantity === 1 ? "test or package" : "tests or packages"}
              </Text>
            </View>
          </View>
          {items.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <View style={styles.itemCopy}>
                <Text
                  numberOfLines={2}
                  style={[styles.itemName, { color: colors.navy }]}
                >
                  {item.name}
                </Text>
                <Text style={[styles.itemDetail, { color: colors.muted }]}>
                  {item.type === "package" ? "Package" : "Test"}
                </Text>
              </View>
              <Text style={[styles.itemPrice, { color: colors.navy }]}>
                {naira(item.price * item.quantity)}
              </Text>
            </View>
          ))}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SummaryLine
            label="Collection"
            value={params.collectionType === "home" ? "₦1,500" : "Free"}
            colors={colors}
          />
          <SummaryLine
            label="Total"
            value={naira(amount)}
            colors={colors}
            strong
          />
        </View>
        {/* only show this section if role==provider */}
        {user?.role?.toLowerCase() === "provider" && (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.cardHeading}>
              <View
                style={[styles.headingIcon, { backgroundColor: colors.accent }]}
              >
                <Ionicons
                  name={
                    recipient?.type === "existing" || recipient?.type === "new"
                      ? "people-outline"
                      : "person-outline"
                  }
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={styles.headerCopy}>
                <Text style={[styles.cardTitle, { color: colors.navy }]}>
                  Order for
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
                  {recipient?.type === "existing" || recipient?.type === "new"
                    ? recipient.patientName
                    : "Myself"}
                </Text>
              </View>
            </View>
          </View>
        )}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.cardHeading}>
            <View
              style={[styles.headingIcon, { backgroundColor: colors.accent }]}
            >
              <Ionicons
                name={
                  params.collectionType === "home"
                    ? "home-outline"
                    : "business-outline"
                }
                size={18}
                color={colors.primary}
              />
            </View>
            <View style={styles.headerCopy}>
              <Text style={[styles.cardTitle, { color: colors.navy }]}>
                {collection}
              </Text>
              {params.collectionType === "home" ? (
                <Text style={[styles.addressText, { color: colors.muted }]}>
                  {[
                    params.address,
                    params.landmark && `Near ${params.landmark}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Address not provided"}
                </Text>
              ) : (
                <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
                  Provide your sample at a Pyramids centre
                </Text>
              )}
            </View>
          </View>
          {params.clinicalInfo ? (
            <View
              style={[
                styles.notesPreview,
                { backgroundColor: colors.lavender },
              ]}
            >
              <Text style={[styles.notesLabel, { color: colors.muted }]}>
                Clinical notes
              </Text>
              <Text style={[styles.notesText, { color: colors.navy }]}>
                {params.clinicalInfo}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.trustNote}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.muted} />
          <Text style={[styles.trustCopy, { color: colors.muted }]}>
            Your payment details are handled securely by Paystack.
          </Text>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <View style={styles.footerTotal}>
          <Text style={[styles.footerLabel, { color: colors.muted }]}>
            Amount due
          </Text>
          <Text style={[styles.footerAmount, { color: colors.navy }]}>
            {naira(amount)}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: amount <= 0 }}
          disabled={amount <= 0}
          onPress={() =>
            router.push({
              pathname: "/order/payment-method",
              params: { ...params, amount: String(amount) },
            })
          }
          style={({ pressed }) => [
            styles.primaryButton,
            styles.footerButton,
            { backgroundColor: colors.primary },
            pressed && styles.pressed,
            amount <= 0 && styles.disabled,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            Continue to payment method
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function SummaryLine({
  label,
  value,
  colors,
  strong = false,
}: {
  label: string;
  value: string;
  colors: typeof Colors.light;
  strong?: boolean;
}) {
  return (
    <View style={styles.summaryLine}>
      <Text
        style={[
          styles.summaryLabel,
          { color: colors.muted },
          strong && { color: colors.navy, fontWeight: "800" },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.summaryValue,
          { color: colors.navy },
          strong && styles.strongValue,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export default function PaymentScreen() {
  return (
    <LoginRequiredGate>
      <PaymentContent />
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
  headerTitle: { fontSize: 19, fontWeight: "800" },
  headerSubtitle: { marginTop: 3, fontSize: 11 },
  stepBadge: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 },
  stepText: { fontSize: 11, fontWeight: "800" },
  content: { padding: 18, paddingTop: 20, paddingBottom: 28, gap: 14 },
  amountCard: { borderRadius: 20, padding: 19 },
  amountCardTop: { flexDirection: "row", alignItems: "center", gap: 9 },
  amountIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  amountCaption: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  amountValue: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 17,
  },
  amountFootnote: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    marginTop: 3,
  },
  card: { borderWidth: 1, borderRadius: 18, padding: 15 },
  cardHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  headingIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 14, fontWeight: "800" },
  cardSubtitle: { marginTop: 3, fontSize: 11, lineHeight: 16 },
  orderItem: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  itemCopy: { flex: 1 },
  itemName: { fontSize: 12, fontWeight: "700", lineHeight: 17 },
  itemDetail: { marginTop: 2, fontSize: 10 },
  itemPrice: { fontSize: 12, fontWeight: "700" },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  summaryLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 12, fontWeight: "700" },
  strongValue: { fontSize: 14 },
  addressText: { marginTop: 4, fontSize: 11, lineHeight: 16 },
  notesPreview: { marginTop: 13, padding: 11, borderRadius: 12 },
  notesLabel: { fontSize: 10, fontWeight: "700" },
  notesText: { marginTop: 4, fontSize: 11, lineHeight: 16 },
  trustNote: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trustCopy: { fontSize: 10 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerTotal: { minWidth: 90 },
  footerLabel: { fontSize: 10 },
  footerAmount: { marginTop: 3, fontSize: 16, fontWeight: "800" },
  footerButton: { flex: 1 },
  primaryButton: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.6 },
});
