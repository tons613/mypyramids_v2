import Constants from "expo-constants";
import { Platform } from "react-native";

const host =
  Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost ?? "";

const lan = host.split(":")[0];

const devHost =
  Platform.OS === "android" && !lan ? "10.0.2.2" : lan || "127.0.0.1";

const ENV = {
  dev: {
    apiUrl: `http://${devHost}:8000`,
  },
  prod: {
    apiUrl: "https://api.pyramidsdiagnostics.com",
  },
};

const getEnvVars = (env = process.env.NODE_ENV || "development") => {
  if (env === "production") {
    return ENV.prod;
  }
  return ENV.dev;
};

export default getEnvVars;
