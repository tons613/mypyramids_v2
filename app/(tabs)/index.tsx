import HomeTestArtwork from "@/components/ui/HomeTestArtwork";
import { Colors, Gradient } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getApiErrorMessage } from "@/services/apiResponse";
import { testService } from "@/services/endpoints";
import { RootState } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  View,
} from "react-native";
import { Avatar, Badge, Text } from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useSelector } from "react-redux";

type CatalogItem = Record<string, any>;
type ThemeColors = typeof Colors.light | typeof Colors.dark;

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
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const colors = {
    ...theme,
    navy: colorScheme === "dark" ? theme.text : "#241B40",
  };
  const [recommendedTests, setRecommendedTests] = useState<CatalogItem[]>([]);
  const [healthPackages, setHealthPackages] = useState<CatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [timeGreeting, setTimeGreeting] = useState(getTimeGreeting);
  const recommendationsScrollRef = useRef<ScrollViewInstance>(null);
  const recommendationIndexRef = useRef(0);
  const recommendationViewportWidthRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(
      () => setTimeGreeting(getTimeGreeting()),
      60_000,
    );
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    recommendationIndexRef.current = 0;
    if (recommendedTests.length < 2) return;

    const interval = setInterval(() => {
      const nextIndex =
        (recommendationIndexRef.current + 1) % recommendedTests.length;
      recommendationIndexRef.current = nextIndex;
      const itemStep = 206;
      const contentWidth = 40 + recommendedTests.length * itemStep;
      const maxOffset = Math.max(
        0,
        contentWidth - recommendationViewportWidthRef.current,
      );
      recommendationsScrollRef.current?.scrollTo({
        x: Math.min(nextIndex * itemStep, maxOffset),
        animated: true,
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [recommendedTests]);

  const loadRecommendations = useCallback(async () => {
    const [testsResult, packagesResult] = await Promise.allSettled([
      testService.getTests(undefined, 1, 8),
      testService.getHealthPackages(),
    ]);
    let succeeded = false;
    if (testsResult.status === "fulfilled") {
      setRecommendedTests(
        getList(testsResult.value, ["items", "tests", "results"]).slice(0, 8),
      );
      succeeded = true;
    }
    if (packagesResult.status === "fulfilled") {
      setHealthPackages(
        getList(packagesResult.value, [
          "items",
          "packages",
          "health_packages",
        ]).slice(0, 6),
      );
      succeeded = true;
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
    if (!isAuthenticated) {
      setLoadingCatalog(false);
      return;
    }
    void loadRecommendations().finally(() => setLoadingCatalog(false));
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
        <Image
          source={require("@/assets/images/banners/login.jpeg")}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        <View
          style={[
            styles.guestTint,
            {
              backgroundColor:
                colorScheme === "dark"
                  ? "rgba(18,16,26,0.88)"
                  : "rgba(243,236,255,0.84)",
            },
          ]}
        />
        <View style={styles.guestContent}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.guestLogo}
            resizeMode="contain"
          />
          <Text
            variant="headlineMedium"
            style={[styles.guestTitle, { color: colors.navy }]}
          >
            Care that starts with clarity
          </Text>
          <Text style={[styles.guestSubtitle, { color: colors.muted }]}>
            Book diagnostic tests, follow your orders, and find your results in
            one place.
          </Text>
          <Pressable
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
            onPress={() => router.push("/auth/category")}
            style={styles.guestRegister}
          >
            <Text style={{ color: colors.muted }}>New to Pyramids? </Text>
            <Text style={[styles.linkText, { color: colors.primary }]}>
              Create account
            </Text>
          </Pressable>
        </View>
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
              Let’s take care of you today.
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
          <View
            style={[styles.searchFilter, { backgroundColor: colors.accent }]}
          >
            <Ionicons name="options-outline" size={20} color={colors.primary} />
          </View>
        </Pressable>

        <View style={styles.heroWrap}>
          <LinearGradient
            colors={["#5326B7", "#7939E8", "#A471EF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroDecoration} />
            <View style={styles.heroCopy}>
              <View style={styles.heroPill}>
                <Ionicons name="heart-outline" size={13} color="#FFFFFF" />
                <Text style={styles.heroPillText}>YOUR HEALTH, IN FOCUS</Text>
              </View>
              <Text style={styles.heroTitle}>
                A little clarity.{"\n"}A healthier you.
              </Text>
              <Text style={styles.heroSubtitle}>
                Find the right test.{"\n"}Book with confidence.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Book a test"
                onPress={openBooking}
                style={({ pressed }) => [
                  styles.heroButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.heroButtonText}>Book a test</Text>
                <Ionicons name="arrow-forward" size={17} color="#5B21B6" />
              </Pressable>
            </View>
            <View style={styles.heroArtwork} pointerEvents="none">
              <HomeTestArtwork />
            </View>
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.navy }]}>
                Your care, one tap away
              </Text>
            </View>
          </View>
          <View style={styles.actionGrid}>
            <View style={styles.actionRow}>
              <QuickLink
                icon="flask-outline"
                title="Order a test"
                subtitle="Find the right lab test"
                tone="booking"
                onPress={openBooking}
                colors={colors}
              />
              <QuickLink
                icon="document-text-outline"
                title="My test results"
                subtitle="View your reports"
                tone="results"
                onPress={() => router.push("/(tabs)/results")}
                colors={colors}
              />
            </View>
            <View style={styles.actionRow}>
              <QuickLink
                icon="time-outline"
                title="Order history"
                subtitle="All your orders, in one place"
                tone="history"
                onPress={() => router.push("/order/history")}
                colors={colors}
              />
              <QuickLink
                icon="headset-outline"
                title="Need a hand?"
                subtitle="We’re here to help"
                tone="support"
                onPress={() => router.push("/chat")}
                colors={colors}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Recommended for you"
            subtitle="Popular tests to help you get started"
            action="See all"
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
              ref={recommendationsScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalContent}
              onLayout={(event) => {
                recommendationViewportWidthRef.current =
                  event.nativeEvent.layout.width;
              }}
              onMomentumScrollEnd={(event) => {
                recommendationIndexRef.current = Math.round(
                  event.nativeEvent.contentOffset.x / 206,
                );
              }}
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
                    onPress={openBooking}
                    accessibilityRole="button"
                    accessibilityLabel={`Book ${name}`}
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
            action="Browse"
            onAction={openBooking}
            colors={colors}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Explore health packages"
            onPress={openBooking}
            style={({ pressed }) => [
              styles.packagePromo,
              {
                backgroundColor:
                  colorScheme === "dark" ? colors.card : "#F3EDFF",
                borderColor: colors.border,
              },
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.packagePromoArt,
                { backgroundColor: colors.accent },
              ]}
            >
              <Ionicons
                name="shield-checkmark"
                size={48}
                color={colors.primary}
              />
            </View>
            <View style={styles.packagePromoCopy}>
              <Text
                style={[styles.packagePromoEyebrow, { color: colors.primary }]}
              >
                A MORE COMPLETE PICTURE
              </Text>
              <Text style={[styles.packagePromoTitle, { color: colors.navy }]}>
                Small steps. Better health.
              </Text>
              <Text style={[styles.packagePromoBody, { color: colors.muted }]}>
                Discover checkups that bring the right tests together.
              </Text>
              <View style={styles.packagePromoCta}>
                <Text
                  style={[
                    styles.packagePromoCtaText,
                    { color: colors.primary },
                  ]}
                >
                  Explore packages
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={15}
                  color={colors.primary}
                />
              </View>
            </View>
          </Pressable>
          {healthPackages.length ? (
            <View style={styles.packageList}>
              {healthPackages.slice(0, 3).map((pkg, index) => {
                const name = getDisplayText(
                  pkg.name ||
                    pkg.package_name ||
                    pkg.healthpackage ||
                    pkg.title,
                  "Health package",
                );
                const subtitle = getDisplayText(
                  pkg.includes ||
                    pkg.description ||
                    pkg.tests_count ||
                    pkg.subtitle,
                  "Explore this package",
                );
                const id = pkg.id ?? pkg.package_id ?? `${name}-${index}`;
                return (
                  <Pressable
                    key={String(id)}
                    onPress={openBooking}
                    accessibilityRole="button"
                    accessibilityLabel={`Explore ${name}`}
                    style={({ pressed }) => [
                      styles.packageCard,
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
                        {getPrice(pkg.price ?? pkg.amount ?? pkg.package_price)}
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
            </View>
          ) : (
            <EmptySection
              message={
                loadingCatalog
                  ? "Loading packages…"
                  : catalogError ||
                    "Health packages will appear here when available."
              }
              colors={colors}
            />
          )}
        </View>

        <View style={[styles.section, styles.lastSection]}>
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
  tone: "booking" | "results" | "history" | "support";
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
    support: {
      background: isDark ? "#30204D" : "#231747",
      border: isDark ? "#503575" : "#231747",
      icon: "#D0B6FF",
    },
  }[tone];
  const isSupport = tone === "support";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
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
            backgroundColor: isSupport ? "rgba(255,255,255,0.09)" : colors.card,
          },
        ]}
      >
        <Ionicons name={icon} size={23} color={palette.icon} />
      </View>
      <View style={styles.quickLinkCopy}>
        <Text
          style={[
            styles.quickLinkTitle,
            { color: isSupport ? "#FFFFFF" : colors.navy },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.quickLinkSubtitle,
            { color: isSupport ? "#C9BCDF" : colors.muted },
          ]}
        >
          {subtitle}
        </Text>
      </View>
      <View
        style={[
          styles.quickLinkArrow,
          {
            backgroundColor: isSupport ? "rgba(255,255,255,0.09)" : colors.card,
          },
        ]}
      >
        <Ionicons name="arrow-forward" size={16} color={palette.icon} />
      </View>
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
    paddingBottom: 22,
  },
  brandRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: { marginTop: 24 },
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
  headerButton: {
    width: 40,
    height: 40,
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
    marginBottom: 20,
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
  searchFilter: {
    width: 33,
    height: 33,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  heroWrap: {
    paddingHorizontal: 24,
    shadowColor: "#7538D8",
    shadowOpacity: 0.17,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
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
    fontSize: 9,
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
    fontSize: 11,
    lineHeight: 16,
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
  heroButtonText: { color: "#5B21B6", fontSize: 11, fontWeight: "700" },
  heroArtwork: {
    width: "32%",
    maxWidth: 129,
    height: 151,
    alignSelf: "flex-end",
  },
  section: { marginTop: 26 },
  lastSection: { marginBottom: 4 },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 13,
  },
  sectionText: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: "700", letterSpacing: -0.4 },
  sectionSubtitle: { fontSize: 11, marginTop: 6 },
  sectionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
    minHeight: 44,
    paddingVertical: 10,
    paddingLeft: 8,
  },
  sectionActionText: { fontSize: 11, fontWeight: "700" },
  actionGrid: { gap: 12, paddingHorizontal: 24 },
  actionRow: { flexDirection: "row", gap: 12 },
  quickLink: {
    flex: 1,
    minWidth: 0,
    minHeight: 154,
    padding: 16,
    paddingBottom: 42,
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
  quickLinkCopy: { marginTop: 13 },
  quickLinkTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  quickLinkSubtitle: { fontSize: 11, lineHeight: 16, marginTop: 5 },
  quickLinkArrow: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  horizontalContent: { paddingHorizontal: 20, paddingBottom: 3 },
  recommendationCard: {
    width: 194,
    marginRight: 12,
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
    fontSize: 8,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 7,
  },
  recommendationPrice: {
    flex: 1,
    marginRight: 6,
    fontSize: 13,
    fontWeight: "700",
  },
  recommendationCta: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
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
  packageList: { paddingHorizontal: 24, gap: 10 },
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
  packageSubtitle: { fontSize: 11, marginTop: 4 },
  packageEnd: { alignItems: "flex-end", gap: 7 },
  packagePrice: { fontSize: 12, fontWeight: "800" },
  packageArrow: {
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  packagePromo: {
    minHeight: 134,
    marginHorizontal: 24,
    marginBottom: 13,
    padding: 18,
    borderRadius: 21,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  packagePromoCopy: { flex: 1 },
  packagePromoEyebrow: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  packagePromoTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  packagePromoCta: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  packagePromoBody: { fontSize: 11, lineHeight: 17 },
  packagePromoCtaText: { fontSize: 11, fontWeight: "700" },
  packagePromoArt: {
    width: 64,
    height: 70,
    borderRadius: 20,
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
  guestScreen: { flex: 1, justifyContent: "center" },
  guestTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(243,236,255,0.84)",
  },
  guestContent: { alignItems: "center", paddingHorizontal: 30 },
  guestLogo: { width: 230, height: 88, marginBottom: 22 },
  guestTitle: {
    textAlign: "center",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
  },
  guestSubtitle: {
    maxWidth: 300,
    marginTop: 10,
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
  guestRegister: { flexDirection: "row", marginTop: 20 },
  linkText: { fontWeight: "800" },
});
