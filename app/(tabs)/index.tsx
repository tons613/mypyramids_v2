import HomeTestArtwork from "@/components/ui/HomeTestArtwork";
import { Colors, Gradient } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getApiErrorMessage } from "@/services/apiResponse";
import { testService } from "@/services/endpoints";
import { HealthPackage, readHealthPackages } from "@/services/healthPackages";
import { RootState } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Avatar, Badge, Text } from "react-native-paper";
import { useReducedMotion } from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useSelector } from "react-redux";

type CatalogItem = Record<string, any>;
type ThemeColors = typeof Colors.light | typeof Colors.dark;
const RECOMMENDATION_WIDTH = 194;
const RECOMMENDATION_GAP = 12;
const PACKAGE_ROW_HEIGHT = 92;
const PACKAGE_ROW_GAP = 10;

function getDisplayText(value: unknown, fallback: string): string {
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (Array.isArray(value)) {
    const labels: string[] = value
      .map((item) => getDisplayText(item, ""))
      .filter(Boolean);
    return labels.join(", ") || fallback;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of [
      "testcategory",
      "name",
      "title",
      "label",
      "category_name",
      "description",
      "value",
    ]) {
      const label = getDisplayText(record[key], "");
      if (label) return label;
    }
  }
  return fallback;
}

function getList(value: any, keys: string[]): CatalogItem[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const key of keys) {
    if (Array.isArray(value[key])) return value[key];
  }
  return value.data && value.data !== value ? getList(value.data, keys) : [];
}

function getPrice(value: unknown) {
  if (value && typeof value === "object") {
    const price = value as Record<string, unknown>;
    return getPrice(
      price.amount ?? price.price ?? price.value ?? price.formatted,
    );
  }
  if (value === undefined || value === null || value === "")
    return "View details";
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₦${amount.toLocaleString("en-NG")}`
    : String(value);
}

function getInitial(user: RootState["auth"]["user"]) {
  const name = user?.firstname || user?.email?.split("@")[0] || "U";
  return name.trim().charAt(0).toUpperCase() || "U";
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour > 16) return "Good evening";
  return "Good afternoon";
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth,
  );
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const isProvider = user?.role?.toLowerCase() === "provider";
  const { width, fontScale } = useWindowDimensions();
  const stackCards = width < 360 || fontScale > 1.3;
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const colors = {
    ...theme,
    navy: colorScheme === "dark" ? theme.text : "#241B40",
  };
  const [recommendedTests, setRecommendedTests] = useState<CatalogItem[]>([]);
  const [healthPackages, setHealthPackages] = useState<HealthPackage[]>([]);
  const packageScroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const packageRowHeight = PACKAGE_ROW_HEIGHT * Math.max(1, fontScale);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [packageError, setPackageError] = useState("");
  const [timeGreeting, setTimeGreeting] = useState(getTimeGreeting);
  const recommendationScroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const recommendationScroll = useRef({
    offset: 0,
    viewport: 0,
    content: 0,
    interacting: false,
    resumeAt: 0,
  });
  const reduceMotion = useReducedMotion();

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated || reduceMotion || recommendedTests.length < 2) return;
      const interval = setInterval(() => {
        const scroll = recommendationScroll.current;
        const maxOffset = Math.max(0, scroll.content - scroll.viewport);
        if (
          AppState.currentState !== "active" ||
          scroll.interacting ||
          Date.now() < scroll.resumeAt ||
          scroll.viewport === 0 ||
          maxOffset === 0
        ) return;
        const nextOffset = scroll.offset >= maxOffset - 1
          ? 0
          : Math.min(scroll.offset + RECOMMENDATION_WIDTH + RECOMMENDATION_GAP, maxOffset);
        recommendationScroller.current?.scrollTo({ x: nextOffset, animated: true });
      }, 4000);
      return () => clearInterval(interval);
    }, [isAuthenticated, recommendedTests.length, reduceMotion]),
  );

  const pauseRecommendations = () => {
    recommendationScroll.current.interacting = true;
  };
  const resumeRecommendations = () => {
    recommendationScroll.current.interacting = false;
    recommendationScroll.current.resumeAt = Date.now() + 8000;
  };

  useEffect(() => {
    const interval = setInterval(
      () => setTimeGreeting(getTimeGreeting()),
      60_000,
    );
    return () => clearInterval(interval);
  }, []);

  const loadRecommendations = useCallback(async () => {
    const [testsResult, packagesResult] = await Promise.allSettled([
      testService.getRecommendations(),
      testService.getHealthPackages().then(readHealthPackages),
    ]);
    let succeeded = false;
    if (testsResult.status === "fulfilled") {
      setRecommendedTests(
        getList(testsResult.value, ["items", "tests", "results"]).slice(0, 8),
      );
      succeeded = true;
    }
    if (packagesResult.status === "fulfilled") {
      setHealthPackages(packagesResult.value);
      setPackageError("");
      succeeded = true;
    } else {
      setPackageError(getApiErrorMessage(packagesResult.reason, "Health packages are unavailable right now."));
    }

    if (!succeeded) {
      setCatalogError(
        getApiErrorMessage(
          testsResult.status === "rejected"
            ? testsResult.reason
            : packagesResult.status === "rejected"
              ? packagesResult.reason
              : undefined,
          "Recommendations are unavailable right now.",
        ),
      );
    } else {
      setCatalogError("");
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void (async () => {
      await loadRecommendations();
      setLoadingCatalog(false);
    })();
  }, [isAuthenticated, loadRecommendations]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecommendations();
    setRefreshing(false);
  }, [loadRecommendations]);

  const firstName =
    user?.firstname?.trim() || user?.email?.split("@")[0] || "there";
  const openBooking = () => router.push("/order");
  const openSearch = () => router.push("/order/search");
  const showNotifications = () =>
    Alert.alert(
      "Notifications",
      "You’re all caught up. New notifications will appear here.",
    );

  if (!isAuthenticated) {
    return (
      <SafeAreaView
        style={[styles.guestScreen, { backgroundColor: colors.lavender }]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.guestContent, { paddingBottom: Math.max(insets.bottom, 12) + 100 }]}
        >
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.guestLogo}
            resizeMode="contain"
          />
          <LinearGradient
            colors={["#5326B7", "#7939E8", "#A471EF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.hero, styles.guestHero, stackCards && styles.stackedHero]}
          >
            <View style={styles.heroDecoration} pointerEvents="none" />
            <View style={styles.heroCopy}>
              <View style={styles.heroPill}>
                <Ionicons name="heart-outline" size={15} color="#FFFFFF" />
                <Text style={styles.heroPillText}>YOUR HEALTH, IN FOCUS</Text>
              </View>
              <Text style={styles.heroTitle}>A little clarity.{"\n"}A healthier you.</Text>
              <Text style={styles.heroSubtitle}>Find the right test. Book with confidence.</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Browse diagnostic tests"
                onPress={openBooking}
                style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}
              >
                <Text style={styles.heroButtonText}>Browse tests</Text>
                <Ionicons name="arrow-forward" size={17} color="#5B21B6" />
              </Pressable>
            </View>
            {!stackCards ? (
              <View style={styles.heroArtwork} pointerEvents="none"><HomeTestArtwork /></View>
            ) : null}
          </LinearGradient>
          <Text style={[styles.guestSubtitle, { color: colors.muted }]}>
            Book diagnostic tests, follow your orders, and find your results in
            one place.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/auth/login")}
            style={styles.guestButtonWrap}
          >
            <LinearGradient
              colors={[...Gradient]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Sign in</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/auth/category")}
            style={styles.guestRegister}
          >
            <Text style={{ color: colors.muted }}>New to Pyramids? </Text>
            <Text style={[styles.linkText, { color: colors.primary }]}>
              Create account
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor:
            colorScheme === "dark" ? colors.background : "#FCFAFF",
        },
      ]}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 12) + 100 },
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
      >
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Image
              source={require("@/assets/images/logo.png")}
              accessibilityLabel="Pyramids Diagnostic Services"
              resizeMode="contain"
              style={styles.dashboardLogo}
            />
            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                onPress={showNotifications}
                style={[
                  styles.headerButton,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name="notifications-outline"
                  size={21}
                  color={colors.primary}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open cart"
                onPress={() => router.push("/order/cart")}
                style={[
                  styles.headerButton,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name="bag-handle-outline"
                  size={21}
                  color={colors.navy}
                />
                {cartItems.length > 0 ? (
                  <Badge
                    style={[
                      styles.cartBadge,
                      { backgroundColor: colors.primary },
                    ]}
                    size={16}
                  >
                    {cartItems.length}
                  </Badge>
                ) : null}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open account"
                onPress={() => router.push("/(tabs)/account")}
                style={styles.accountButton}
              >
                <Avatar.Text
                  size={34}
                  label={getInitial(user)}
                  color="#FFFFFF"
                  style={{ backgroundColor: colors.primary }}
                />
              </Pressable>
            </View>
          </View>
          <View style={styles.greeting}>
            <Text style={[styles.greetingEyebrow, { color: colors.muted }]}>
              {timeGreeting}
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[styles.greetingLine, { color: colors.navy }]}
            >
              Hi,{" "}
              <Text style={[styles.greetingName, { color: colors.primary }]}>
                {firstName} 👋
              </Text>
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.greetingSubtitle, { color: colors.muted }]}
            >
              {isProvider ? "Your patients and their care, in one place." : "Your tests, orders and results, in one place."}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search tests and packages"
          onPress={openSearch}
          style={({ pressed }) => [
            styles.searchBox,
            pressed && styles.pressed,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <Ionicons name="search-outline" size={21} color="#B66BE8" />
          <Text style={[styles.searchPlaceholder, { color: colors.muted }]}>
            Search tests or health packages
          </Text>
        </Pressable>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.navy }]}>
                Your care, one tap away
              </Text>
            </View>
          </View>
          <View style={styles.actionGrid}>
            <View style={[styles.actionRow, stackCards && styles.stackedRow]}>
              <QuickLink
                icon="flask-outline"
                title="Order a test"
                subtitle="Find the right lab test"
                tone="booking"
                onPress={openBooking}
                colors={colors}
              />
              {isProvider ? (
                <QuickLink
                  icon="people-outline"
                  title="My Patient"
                  subtitle="Patient orders and results"
                  tone="patients"
                  onPress={() => router.push("/provider/patients")}
                  colors={colors}
                />
              ) : (
                <QuickLink
                  icon="chatbubbles-outline"
                  title="Health assistant"
                  subtitle="Ask about symptoms and tests"
                  tone="assistant"
                  onPress={() => router.push("/chat")}
                  colors={colors}
                />
              )}
            </View>
            <View style={[styles.actionRow, stackCards && styles.stackedRow]}>
              <QuickLink
                icon="time-outline"
                title="Order history"
                subtitle="All your orders, in one place"
                tone="history"
                onPress={() => router.push("/order/history")}
                colors={colors}
              />
              <QuickLink
                icon="document-text-outline"
                title="My test results"
                subtitle={isProvider ? "Your personal reports" : "View your reports"}
                tone="results"
                onPress={() => router.push("/(tabs)/results")}
                colors={colors}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Recommended for you"
            subtitle="Suggestions selected for you"
            action="Browse tests"
            onAction={openBooking}
            colors={colors}
          />
          {loadingCatalog && recommendedTests.length === 0 ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Finding tests for you…
              </Text>
            </View>
          ) : recommendedTests.length ? (
            <ScrollView
              ref={recommendationScroller}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalContent}
              onLayout={(event) => {
                recommendationScroll.current.viewport = event.nativeEvent.layout.width;
              }}
              onContentSizeChange={(contentWidth) => {
                recommendationScroll.current.content = contentWidth;
              }}
              onScroll={(event) => {
                recommendationScroll.current.offset = event.nativeEvent.contentOffset.x;
              }}
              scrollEventThrottle={16}
              onTouchStart={pauseRecommendations}
              onTouchEnd={resumeRecommendations}
              onTouchCancel={resumeRecommendations}
              onScrollBeginDrag={pauseRecommendations}
              onScrollEndDrag={resumeRecommendations}
            >
              {recommendedTests.map((item, index) => {
                const name = getDisplayText(
                  item.testname || item.test_name || item.name || item.title,
                  "Diagnostic test",
                );
                const id = item.id ?? item.test_id ?? `${name}-${index}`;
                const category = getDisplayText(
                  item.category ?? item.testcategory,
                  "LAB TEST",
                );
                return (
                  <Pressable
                    key={String(id)}
                    onPress={() => {
                      const testId = item.id ?? item.test_id;
                      if (
                        (typeof testId !== "number" && typeof testId !== "string") ||
                        (typeof testId === "string" && !testId.trim())
                      ) {
                        Alert.alert("Test unavailable", "This recommendation is missing its test ID. Please browse the test catalog.");
                        return;
                      }
                      router.push({ pathname: "/order/test-detail", params: { testId: String(testId) } });
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${name} details`}
                    style={({ pressed }) => [
                      styles.recommendationCard,
                      pressed && styles.pressed,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={
                        colorScheme === "dark"
                          ? [colors.accent, colors.card]
                          : index % 2 === 0
                            ? ["#F3ECFE", "#FAF7FF"]
                            : ["#F1EDFF", "#FAF7FF"]
                      }
                      style={styles.recommendationArtwork}
                    >
                      <View style={styles.recommendationIcon}>
                        <Ionicons
                          name="flask-outline"
                          size={25}
                          color={colors.primary}
                        />
                      </View>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.categoryTag,
                          { color: colors.secondary },
                        ]}
                      >
                        {category}
                      </Text>
                    </LinearGradient>
                    <View style={styles.recommendationInfo}>
                      <Text
                        numberOfLines={2}
                        style={[
                          styles.recommendationName,
                          { color: colors.navy },
                        ]}
                      >
                        {name}
                      </Text>
                      <View style={styles.recommendationBottom}>
                        <Text
                          style={[
                            styles.recommendationPrice,
                            { color: colors.primary },
                          ]}
                        >
                          {getPrice(
                            item.private_price ?? item.price ?? item.amount,
                          )}
                        </Text>
                        <View
                          style={[
                            styles.recommendationCta,
                            { backgroundColor: colors.accent },
                          ]}
                        >
                          <Text style={[styles.recommendationCtaText, { color: colors.primary }]}>
                            View details
                          </Text>
                          <Ionicons
                            name="arrow-forward"
                            size={15}
                            color={colors.primary}
                          />
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <EmptySection
              message={
                catalogError ||
                "New tests will appear here as they become available."
              }
              colors={colors}
            />
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Health packages"
            subtitle="Thoughtful checkups, grouped for you"
            action={healthPackages.length > 3 ? "Scroll for more" : undefined}
            onAction={() => packageScroller.current?.scrollTo({ y: packageRowHeight + PACKAGE_ROW_GAP, animated: true })}
            colors={colors}
          />
          {healthPackages.length ? (
            <ScrollView
              ref={packageScroller}
              nestedScrollEnabled
              style={{ height: packageRowHeight * Math.min(3, healthPackages.length) + PACKAGE_ROW_GAP * Math.max(0, Math.min(3, healthPackages.length) - 1) }}
              contentContainerStyle={styles.packageList}
              accessibilityLabel="Health packages. Scroll to see more packages"
            >
              {healthPackages.map((pkg) => {
                const name = pkg.name;
                const subtitle = pkg.subheading || `${pkg.test_count} ${pkg.test_count === 1 ? "test" : "tests"} included`;
                return (
                  <Pressable
                    key={String(pkg.id)}
                    onPress={() => router.push({ pathname: "/order/package-detail", params: { packageId: String(pkg.id) } })}
                    accessibilityRole="button"
                    accessibilityLabel={`Explore ${name}`}
                    style={({ pressed }) => [
                      styles.packageCard,
                      { height: packageRowHeight },
                      pressed && styles.pressed,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.packageIcon,
                        { backgroundColor: colors.accent },
                      ]}
                    >
                      <Ionicons
                        name="gift-outline"
                        size={21}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.packageCopy}>
                      <Text
                        numberOfLines={1}
                        style={[styles.packageName, { color: colors.navy }]}
                      >
                        {name}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.packageSubtitle,
                          { color: colors.muted },
                        ]}
                      >
                        {subtitle}
                      </Text>
                    </View>
                    <View style={styles.packageEnd}>
                      <Text
                        style={[styles.packagePrice, { color: colors.primary }]}
                      >
                        {pkg.price === null ? "Price unavailable" : getPrice(pkg.price)}
                      </Text>
                      <View
                        style={[
                          styles.packageArrow,
                          { backgroundColor: colors.accent },
                        ]}
                      >
                        <Ionicons
                          name="arrow-forward"
                          size={14}
                          color={colors.primary}
                        />
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <EmptySection
              message={
                loadingCatalog
                  ? "Loading packages…"
                  : packageError ||
                    "Health packages will appear here when available."
              }
              colors={colors}
            />
          )}
          {healthPackages.length > 0 && packageError ? (
            <Text accessibilityRole="alert" style={[styles.packageError, { color: colors.muted }]}>{packageError}</Text>
          ) : null}
        </View>

        {isProvider ? <Pressable
          accessibilityRole="button"
          accessibilityLabel="Health assistant. AI guidance on symptoms and tests"
          onPress={() => router.push("/chat")}
          style={({ pressed }) => [
            styles.supportRow,
            { backgroundColor: colors.card, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="chatbubbles-outline" size={23} color={colors.primary} />
          <View style={styles.sectionText}>
            <Text style={[styles.quickLinkTitle, { color: colors.navy }]}>Health assistant</Text>
            <Text style={[styles.quickLinkSubtitle, { color: colors.muted }]}>AI guidance on symptoms and tests</Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color={colors.primary} />
        </Pressable> : null}

        <View style={styles.section}>
          <SectionHeader
            title="News & updates"
            action="View all"
            onAction={() => router.push("/news")}
            colors={colors}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View news and updates"
            onPress={() => router.push("/news")}
            style={({ pressed }) => [
              styles.newsCard,
              {
                backgroundColor:
                  colorScheme === "dark" ? colors.peach : "#FFFAF5",
                borderColor: colorScheme === "dark" ? colors.border : "#F0E8E2",
              },
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.newsIcon,
                {
                  backgroundColor:
                    colorScheme === "dark" ? "#422D22" : "#FCE9D7",
                },
              ]}
            >
              <Ionicons
                name="newspaper-outline"
                size={27}
                color={colorScheme === "dark" ? "#FDBA74" : "#CD8251"}
              />
            </View>
            <View style={styles.newsCopy}>
              <Text
                style={[
                  styles.newsEyebrow,
                  { color: colorScheme === "dark" ? "#FDBA74" : "#AC7755" },
                ]}
              >
                FROM PYRAMIDS
              </Text>
              <Text style={[styles.newsTitle, { color: colors.navy }]}>
                Your next step to better health starts with staying informed.
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={17} color={colors.muted} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
  onAction,
  colors,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionText}>
        <Text style={[styles.sectionTitle, { color: colors.navy }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${action} ${title}`}
          onPress={onAction}
          style={styles.sectionAction}
        >
          <Text style={[styles.sectionActionText, { color: colors.primary }]}>
            {action}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

function QuickLink({
  icon,
  title,
  subtitle,
  onPress,
  colors,
  tone,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  onPress: () => void;
  colors: ThemeColors;
  tone: "booking" | "results" | "history" | "patients" | "assistant";
}) {
  const isDark = useColorScheme() === "dark";
  const palette = {
    booking: {
      background: isDark ? "#192B3D" : "#EDF6FF",
      border: isDark ? "#2D4B68" : "#DCEBFA",
      icon: isDark ? "#93C5FD" : "#3979BC",
    },
    results: {
      background: isDark ? "#25203D" : "#F1EDFF",
      border: isDark ? "#40365F" : "#E9E1FF",
      icon: isDark ? "#C4B5FD" : "#8952DF",
    },
    history: {
      background: isDark ? "#30231E" : "#FFF3E9",
      border: isDark ? "#51382B" : "#FAE9DC",
      icon: isDark ? "#FDBA74" : "#BC7445",
    },
    patients: {
      background: isDark ? "#18312E" : "#EAF8F4",
      border: isDark ? "#28514A" : "#D5EEE7",
      icon: isDark ? "#6EE7B7" : "#18856A",
    },
    assistant: {
      background: isDark ? "#18312E" : "#EAF8F4",
      border: isDark ? "#28514A" : "#D5EEE7",
      icon: isDark ? "#6EE7B7" : "#18856A",
    },
  }[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${tone === "assistant" ? "AI guidance. " : ""}${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickLink,
        pressed && styles.pressed,
        { backgroundColor: palette.background, borderColor: palette.border },
      ]}
    >
      <View
        style={[
          styles.quickLinkIcon,
          {
            backgroundColor: colors.card,
          },
        ]}
      >
        <Ionicons name={icon} size={23} color={palette.icon} />
      </View>
      <View style={styles.quickLinkCopy}>
        <Text
          style={[
            styles.quickLinkTitle,
            { color: colors.navy },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.quickLinkSubtitle,
            { color: colors.muted },
          ]}
        >
          {subtitle}
        </Text>
      </View>
      {tone === "assistant" ? (
        <View style={[styles.assistantBadge, { backgroundColor: colors.card }]}>
          <Text style={[styles.assistantBadgeText, { color: palette.icon }]}>AI</Text>
        </View>
      ) : <View
        style={[
          styles.quickLinkArrow,
          {
            backgroundColor: colors.card,
          },
        ]}
      >
        <Ionicons name="arrow-forward" size={16} color={palette.icon} />
      </View>}
    </Pressable>
  );
}

function EmptySection({
  message,
  colors,
}: {
  message: string;
  colors: ThemeColors;
}) {
  return (
    <View
      style={[
        styles.emptyCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Ionicons name="flask-outline" size={19} color={colors.primary} />
      <Text style={[styles.emptyText, { color: colors.muted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {},
  header: {
    flexDirection: "column",
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 18,
  },
  brandRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: { marginTop: 16 },
  greetingEyebrow: { fontSize: 13, marginBottom: 6 },
  dashboardLogo: { width: 112, height: 42, alignSelf: "flex-start" },
  greetingLine: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  greetingName: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700",
    letterSpacing: -0.7,
  },
  greetingSubtitle: { marginTop: 8, fontSize: 13 },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginLeft: 8,
  },
  accountButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EDE9FE",
    shadowColor: "#3B1A73",
    shadowOpacity: 0.08,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cartBadge: { position: "absolute", top: -2, right: -2, color: "#FFFFFF" },
  searchBox: {
    minHeight: 52,
    marginHorizontal: 24,
    marginBottom: 0,
    paddingLeft: 15,
    paddingRight: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderRadius: 17,
    shadowColor: "#4C1D95",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  searchPlaceholder: { flex: 1, fontSize: 13, paddingVertical: 12 },
  guestHero: { width: "100%" },
  stackedHero: { flexDirection: "column", alignItems: "stretch" },
  hero: {
    minHeight: 215,
    borderRadius: 24,
    padding: 22,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
  },
  heroDecoration: {
    position: "absolute",
    right: -68,
    top: -112,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  heroCopy: { flex: 1, zIndex: 1, paddingRight: 2 },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginBottom: 12,
  },
  heroPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  heroTitle: {
    maxWidth: 230,
    color: "#FFFFFF",
    fontSize: 25,
    lineHeight: 29,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  heroSubtitle: {
    maxWidth: 225,
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
    marginBottom: 15,
  },
  heroButton: {
    alignSelf: "flex-start",
    minHeight: 44,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 13,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  heroButtonText: { color: "#5B21B6", fontSize: 14, fontWeight: "700" },
  heroArtwork: {
    width: "32%",
    maxWidth: 129,
    height: 151,
    alignSelf: "flex-end",
  },
  section: { marginTop: 26 },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 13,
  },
  sectionText: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: "700", letterSpacing: -0.4 },
  sectionSubtitle: { fontSize: 13, marginTop: 6 },
  sectionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
    minHeight: 44,
    paddingVertical: 10,
    paddingLeft: 8,
  },
  sectionActionText: { fontSize: 13, fontWeight: "700" },
  actionGrid: { gap: 12, paddingHorizontal: 24 },
  actionRow: { flexDirection: "row", gap: 12 },
  stackedRow: { flexDirection: "column" },
  supportRow: { margin: 24, marginBottom: 4, padding: 16, minHeight: 76, flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 18, borderWidth: 1 },
  quickLink: {
    flex: 1,
    minWidth: 0,
    minHeight: 132,
    padding: 16,
    paddingBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickLinkIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLinkCopy: { marginTop: 10 },
  assistantBadge: {
    position: "absolute",
    right: 12,
    top: 16,
    minHeight: 26,
    paddingHorizontal: 8,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  assistantBadgeText: { fontSize: 11, fontWeight: "800" },
  quickLinkTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  quickLinkSubtitle: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  quickLinkArrow: {
    position: "absolute",
    right: 12,
    top: 16,
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  horizontalContent: { paddingHorizontal: 20, paddingBottom: 3 },
  recommendationCard: {
    width: RECOMMENDATION_WIDTH,
    marginRight: RECOMMENDATION_GAP,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  recommendationArtwork: {
    height: 68,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 12,
  },
  recommendationIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTag: {
    flex: 1,
    textAlign: "right",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
  },
  recommendationInfo: {
    minHeight: 98,
    justifyContent: "space-between",
    paddingHorizontal: 13,
    paddingTop: 13,
    paddingBottom: 13,
  },
  recommendationName: {
    minHeight: 36,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  recommendationBottom: {
    alignItems: "flex-start",
    gap: 8,
    marginTop: 7,
  },
  recommendationPrice: {
    fontSize: 13,
    fontWeight: "700",
  },
  recommendationCta: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  recommendationCtaText: { fontSize: 12, fontWeight: "700" },
  loadingRow: {
    minHeight: 94,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyCard: {
    minHeight: 68,
    marginHorizontal: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 17,
    borderWidth: 1,
  },
  emptyText: { flex: 1, fontSize: 12, lineHeight: 17 },
  packageList: { paddingHorizontal: 24, gap: PACKAGE_ROW_GAP },
  packageError: { paddingHorizontal: 24, marginTop: 8, fontSize: 13 },
  packageCard: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  packageIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  packageCopy: { flex: 1 },
  packageName: { fontSize: 13, fontWeight: "800" },
  packageSubtitle: { fontSize: 13, marginTop: 4 },
  packageEnd: { alignItems: "flex-end", gap: 7 },
  packagePrice: { fontSize: 12, fontWeight: "800" },
  packageArrow: {
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  newsCard: {
    marginHorizontal: 24,
    minHeight: 86,
    padding: 13,
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  newsCopy: { flex: 1 },
  newsEyebrow: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  newsTitle: { fontSize: 12, lineHeight: 18, fontWeight: "600" },
  newsIcon: {
    width: 51,
    height: 54,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  guestScreen: { flex: 1 },
  guestContent: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingTop: 24 },
  guestLogo: { width: 180, height: 68, marginBottom: 24 },
  guestSubtitle: {
    maxWidth: 300,
    marginTop: 22,
    marginBottom: 26,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
  },
  guestButtonWrap: { width: "100%" },
  primaryButton: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 28,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  guestRegister: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", minHeight: 44, alignItems: "center", marginTop: 12 },
  linkText: { fontWeight: "800" },
});
