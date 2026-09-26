import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.gadwly.app",
  appName: "جدولي",
  webDir: "public",
  server: {
    url: "https://gadwly.vercel.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
