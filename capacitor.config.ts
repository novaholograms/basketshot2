import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.basketshotai.app',
  appName: 'BasketShot AI',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
