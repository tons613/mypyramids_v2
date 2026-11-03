import { LoginRequiredGate } from "@/components/ui/LoginRequiredGate";
import { auth } from "@/config/firebase";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { File, Paths } from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import Pdf from "react-native-pdf";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

function PdfViewerContent() {
  const router = useRouter();
  const params = useLocalSearchParams<{ uri?: string; title?: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const uri = Array.isArray(params.uri) ? params.uri[0] : params.uri ?? "";
  const title = Array.isArray(params.title) ? params.title[0] : params.title ?? "Lab report";
  const validUri = /^https:\/\//i.test(uri);
  const [token, setToken] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let active = true;
    const loadToken = async () => {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (active && idToken) setToken(idToken);
      } catch {
        if (active) setToken("");
      } finally {
        if (active) setAuthReady(true);
      }
    };
    void loadToken();
    return () => { active = false; };
  }, []);

  const source = useMemo(() => {
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};
    return { uri, cache: true, expiration: 60 * 60, headers };
  }, [uri, token]);

  const sharePdf = async () => {
    if (!validUri || !authReady || sharing) return;
    setSharing(true);
    let localFile: File | undefined;
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Sharing unavailable", "This device cannot share files right now.");
        return;
      }
      const name = `mypyramids-report-${Date.now()}.pdf`;
      const destination = new File(Paths.cache, name);
      localFile = await File.downloadFileAsync(uri, destination, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      await Sharing.shareAsync(localFile.uri, {
        mimeType: "application/pdf",
        dialogTitle: `Share ${title}`,
        UTI: "com.adobe.pdf",
      });
    } catch {
      Alert.alert("Could not share report", "Please check your connection and try again.");
    } finally {
      try { localFile?.delete(); } catch { /* temporary cache cleanup is best effort */ }
      setSharing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={["top", "bottom", "left", "right"]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to result details" onPress={() => router.back()} style={[styles.headerButton, { borderColor: colors.border }]}>
          <Ionicons name="arrow-back" size={21} color={colors.navy} />
        </Pressable>
        <Text numberOfLines={1} style={[styles.title, { color: colors.navy }]}>{title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Share PDF report" disabled={!validUri || !authReady || sharing} onPress={() => void sharePdf()} style={[styles.shareButton, { backgroundColor: colors.primary, opacity: sharing || !authReady ? 0.65 : 1 }]}>
          {sharing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="share-outline" size={19} color="#FFFFFF" />}
          <Text style={styles.shareText}>{sharing ? "Sharing" : "Share"}</Text>
        </Pressable>
      </View>

      {!validUri ? (
        <View style={styles.state}><Ionicons name="alert-circle-outline" size={32} color={colors.warning} /><Text style={[styles.stateTitle, { color: colors.navy }]}>Report link unavailable</Text><Text style={[styles.stateCopy, { color: colors.muted }]}>Return to the result details and try again.</Text></View>
      ) : loadError ? (
        <View style={styles.state}><Ionicons name="document-outline" size={32} color={colors.warning} /><Text style={[styles.stateTitle, { color: colors.navy }]}>Could not load PDF</Text><Text style={[styles.stateCopy, { color: colors.muted }]}>Check your connection or contact support if the issue continues.</Text><Pressable onPress={() => { setLoadError(false); setLoading(true); }} style={[styles.retry, { backgroundColor: colors.primary }]}><Text style={styles.retryText}>Try again</Text></Pressable></View>
      ) : !authReady ? (
        <View style={styles.state}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.stateCopy, { color: colors.muted }]}>Preparing secure report…</Text></View>
      ) : (
        <View style={styles.pdfContainer}>
          {loading ? <View pointerEvents="none" style={styles.loadingOverlay}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.stateCopy, { color: colors.muted }]}>Loading report…</Text></View> : null}
          <Pdf
            source={source}
            trustAllCerts={false}
            fitPolicy={0}
            onLoadComplete={() => setLoading(false)}
            onError={() => { setLoading(false); setLoadError(true); }}
            style={styles.pdf}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

export default function PdfViewerScreen() { return <LoginRequiredGate><PdfViewerContent /></LoginRequiredGate>; }

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerButton: { width: 40, height: 40, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 14, fontWeight: "800" },
  shareButton: { minWidth: 74, height: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 11, borderRadius: 13 },
  shareText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  pdfContainer: { flex: 1 },
  pdf: { flex: 1, width: "100%" },
  loadingOverlay: { ...StyleSheet.absoluteFill, zIndex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  state: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 8 },
  stateTitle: { fontSize: 17, fontWeight: "800", textAlign: "center", marginTop: 6 },
  stateCopy: { fontSize: 12, lineHeight: 18, textAlign: "center" },
  retry: { minHeight: 42, borderRadius: 13, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", marginTop: 10 },
  retryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
});
