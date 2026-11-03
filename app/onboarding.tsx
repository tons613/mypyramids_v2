import { GradientButton } from "@/components/ui/GradientButton";
import { markOnboardingSeen } from "@/constants/onboarding";
import { Gradient } from "@/constants/theme";
import { useAuthTheme } from "@/hooks/use-auth-theme";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SLIDES: { image: ImageSourcePropType; title: string; body: string }[] = [
  {
    image: require("@/assets/images/banners/banner2.jpeg"),
    title: "Molecular Precision",
    body: "Get access to our exclusive laboratory tests and analysis, carried out with precision and care.",
  },
  {
    image: require("@/assets/images/banners/ECG41.jpg"),
    title: "Excellent Service Delivery",
    body: "From booking your tests to receiving your results, we make every step simple and seamless.",
  },
  {
    image: require("@/assets/images/banners/b3.jpeg"),
    title: "Prompt and Passionate",
    body: "Our team is committed to prompt service and compassionate care, whenever you need us.",
  },
];
const SLIDE_DURATION = 5000;

export default function OnboardingScreen() {
  const router = useRouter();
  const auth = useAuthTheme();
  const scroller = useRef<ScrollViewInstance>(null);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const startTime = useRef(Date.now());
  const indexRef = useRef(index);
  const { width, height } = useWindowDimensions();
  const compact = height < 700;

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const nextProgress = Math.min(elapsed / SLIDE_DURATION, 1);
      setProgress(nextProgress);

      if (nextProgress >= 1) {
        const next = (indexRef.current + 1) % SLIDES.length;
        startTime.current = Date.now();
        setProgress(0);
        scroller.current?.scrollTo({ x: next * width, animated: true });
        indexRef.current = next;
        setIndex(next);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [width]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== indexRef.current) {
      indexRef.current = next;
      setIndex(next);
      startTime.current = Date.now();
      setProgress(0);
    }
  };

  const finish = async (path: "/(tabs)" | "/auth/login") => {
    await markOnboardingSeen();
    router.replace(path);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} style={{ width, flex: 1 }}>
            <Image
              source={slide.image}
              style={[styles.slideImage]}
              resizeMode="cover"
            />
            <LinearGradient
              colors={
                auth.isDark
                  ? ["rgba(120, 20, 150, 0.62)", "rgba(60, 25, 100, 0.62)", "rgba(10,8,16,0.9)"]
                  : ["rgba(169, 0, 206, 0.60)", "rgba(175, 79, 214, 0.54)", "rgba(255,255,255,0.72)"]
              }
              locations={[0, 0.55, 1]}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ))}
      </ScrollView>

      <SafeAreaView style={styles.bars} pointerEvents="none">
        <View style={styles.barRow}>
          {SLIDES.map((slide, i) => (
            <View key={slide.title} style={styles.barTrack}>
              <View
                style={[
                  styles.barProgress,
                  i < index && styles.barComplete,
                  i === index && { width: `${progress * 100}%` },
                ]}
              >
                {i <= index ? (
                  <LinearGradient
                    colors={[...Gradient]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>

      <View
        style={[styles.sheet, { maxHeight: height * (compact ? 0.52 : 0.43), backgroundColor: auth.surface }]}
      >
        <ScrollView
          contentContainerStyle={[
            styles.sheetContent,
            compact && styles.compactSheetContent,
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Text style={[styles.title, { color: auth.heading }, compact && styles.compactTitle]}>
            {SLIDES[index].title}
          </Text>
          <Text style={[styles.body, { color: auth.body }, compact && styles.compactBody]}>
            {SLIDES[index].body}
          </Text>
          <GradientButton
            label="Get Started"
            icon={null}
            onPress={() => finish("/(tabs)")}
          />
          <Pressable
            onPress={() => finish("/auth/login")}
            style={styles.signIn}
          >
            <Text style={[styles.signInText, { color: auth.muted }]}>
              Already have an account?{" "}
              <Text style={[styles.signInLink, { color: auth.link }]}>Sign in</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#4C1D95" },
  slideImage: {
    width: "100%",
    height: "100%",
    // transform: [{ scale: 0.82 }],
  },
  bars: { position: "absolute", top: 0, left: 0, right: 0 },
  barRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 26,
    paddingTop: 18,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.96)",
    overflow: "hidden",
  },
  barProgress: {
    width: "0%",
    height: "100%",
    borderRadius: 6,
    overflow: "hidden",
  },
  barComplete: { width: "100%", backgroundColor: "#6D28D9" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 42,
    borderTopRightRadius: 42,
    paddingHorizontal: 30,
    paddingTop: 28,
    paddingBottom: 0,
  },
  sheetContent: { paddingBottom: 34 },
  compactSheetContent: { paddingBottom: 20 },
  title: {
    fontSize: 25,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 18,
  },
  compactTitle: { fontSize: 22, marginBottom: 10 },
  body: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    minHeight: 48,
    marginBottom: 22,
  },
  compactBody: { fontSize: 14, lineHeight: 19, minHeight: 0, marginBottom: 14 },
  signIn: { marginTop: 16, alignItems: "center", paddingVertical: 4 },
  signInText: { fontSize: 14 },
  signInLink: { fontWeight: "500" },
});
