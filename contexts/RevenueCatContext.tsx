import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Purchases, LOG_LEVEL, CustomerInfo, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { useAuth } from './AuthContext';

interface RevenueCatContextType {
  isReady: boolean;
  isPremium: boolean;
  customerInfo: CustomerInfo | null;
  offerings: any | null;
  loading: boolean;
  error: string | null;
  refreshCustomerInfo: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<{ success: boolean; error?: string }>;
  restorePurchases: () => Promise<{ success: boolean; error?: string }>;
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(undefined);

export const useRevenueCat = () => {
  const context = useContext(RevenueCatContext);
  if (!context) {
    throw new Error('useRevenueCat must be used within RevenueCatProvider');
  }
  return context;
};

interface RevenueCatProviderProps {
  children: ReactNode;
}

export const RevenueCatProvider: React.FC<RevenueCatProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkEntitlement = (info: CustomerInfo): boolean => {
    return info.entitlements.active['BasketShot Pro'] !== undefined;
  };

  const initializeRevenueCat = async () => {
    try {
      setLoading(true);
      setError(null);

      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

      const configuration = {
        apiKey: 'test_CgvsSNJDWUbBzpVxNgxOdnEFiPE',
        appUserID: user?.id || undefined,
      };

      await Purchases.configure(configuration);

      const { customerInfo: info } = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      setIsPremium(checkEntitlement(info));

      const offeringsResult = await Purchases.getOfferings();
      setOfferings(offeringsResult);

      setIsReady(true);
    } catch (err: any) {
      console.error('RevenueCat initialization error:', err);
      setError(err.message || 'Failed to initialize RevenueCat');
    } finally {
      setLoading(false);
    }
  };

  const refreshCustomerInfo = async () => {
    try {
      setLoading(true);
      const { customerInfo: info } = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      setIsPremium(checkEntitlement(info));
    } catch (err: any) {
      console.error('Failed to refresh customer info:', err);
      setError(err.message || 'Failed to refresh customer info');
    } finally {
      setLoading(false);
    }
  };

  const purchasePackage = async (pkg: PurchasesPackage): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const { customerInfo: info } = await Purchases.purchasePackage({ aPackage: pkg });
      setCustomerInfo(info);
      setIsPremium(checkEntitlement(info));

      return { success: true };
    } catch (err: any) {
      console.error('Purchase error:', err);
      const errorMessage = err.message || 'Purchase failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const restorePurchases = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const { customerInfo: info } = await Purchases.restorePurchases();
      setCustomerInfo(info);
      setIsPremium(checkEntitlement(info));

      return { success: true };
    } catch (err: any) {
      console.error('Restore purchases error:', err);
      const errorMessage = err.message || 'Failed to restore purchases';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      initializeRevenueCat();
    }
  }, [user?.id]);

  useEffect(() => {
    const setupListener = async () => {
      if (!isReady) return;

      try {
        await Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
          setCustomerInfo(info);
          setIsPremium(checkEntitlement(info));
        });
      } catch (err) {
        console.error('Failed to setup customer info listener:', err);
      }
    };

    setupListener();
  }, [isReady]);

  const value: RevenueCatContextType = {
    isReady,
    isPremium,
    customerInfo,
    offerings,
    loading,
    error,
    refreshCustomerInfo,
    purchasePackage,
    restorePurchases,
  };

  return <RevenueCatContext.Provider value={value}>{children}</RevenueCatContext.Provider>;
};
