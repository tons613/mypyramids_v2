import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { RootState } from "@/store";
import { clearCart, removeFromCart } from "@/store/cartSlice";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Button, Divider, IconButton, Surface, Text } from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

export default function CartScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { items, total } = useSelector((state: RootState) => state.cart);
  const colorScheme = useColorScheme();
  const customColors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/order");
  };

  const handleRemove = (id: string) => {
    dispatch(removeFromCart(id));
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.itemContainer}>
      <View style={{ flex: 1 }}>
        <Text variant="titleMedium">{item.name}</Text>
        <Text variant="bodySmall" style={{ color: customColors.icon }}>
          {item.type === "package" ? "Package" : "Test"}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text variant="titleMedium" style={{ fontWeight: "bold" }}>
          ₦{item.price * item.quantity}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <IconButton
            icon="delete"
            size={20}
            iconColor={customColors.error}
            onPress={() => handleRemove(item.id)}
          />
        </View>
      </View>
    </View>
  );

  if (items.length === 0) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: customColors.background,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <Text variant="headlineSmall" style={{ color: customColors.icon }}>
          Your cart is empty
        </Text>
        <Button
          mode="contained"
          onPress={handleBack}
          style={{ marginTop: 20, backgroundColor: customColors.primary }}
        >
          Go Back
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.container, { backgroundColor: customColors.background }]}
    >
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={handleBack}
            style={[styles.backButton, { borderColor: customColors.border, backgroundColor: customColors.card }]}
          >
            <Ionicons name="arrow-back" size={20} color={customColors.text} />
          </Pressable>
          <Text
            variant="headlineSmall"
            style={{ fontWeight: "bold", color: customColors.text }}
          >
            My Cart
          </Text>
        </View>
        <Button
          mode="text"
          textColor={customColors.error}
          onPress={() => dispatch(clearCart())}
        >
          Clear All
        </Button>
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <Divider />}
      />

      <Surface
        style={[
          styles.footer,
          {
            paddingBottom: 20 + insets.bottom,
            backgroundColor: customColors.background,
          },
        ]}
        elevation={4}
      >
        <View style={styles.totalRow}>
          <Text variant="titleMedium">Total Amount</Text>
          <Text
            variant="headlineSmall"
            style={{ fontWeight: "bold", color: customColors.primary }}
          >
            ₦{total}
          </Text>
        </View>
        <Button
          mode="contained"
          onPress={() => router.push("/order/checkout")}
          style={{
            backgroundColor: customColors.primary,
            borderRadius: 8,
            marginTop: 8,
            width: "100%",
          }}
          contentStyle={{ paddingVertical: 6 }}
        >
          Proceed to Checkout
        </Button>
      </Surface>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  listContent: {
    paddingHorizontal: 20,
  },
  itemContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  footer: {
    paddingTop: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: "100%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
});
