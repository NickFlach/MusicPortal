import { create } from 'zustand';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';

interface WalletState {
  address: string | null;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  setAddress: (address: string | null) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  isConnecting: false,
  error: null,
  connect: async () => {
    set({ isConnecting: true, error: null });
    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed');
      }

      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      const address = accounts[0];
      if (!address) {
        throw new Error('No accounts found');
      }

      set({ address: address.toLowerCase(), isConnecting: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
        isConnecting: false,
        address: null
      });
      throw error;
    }
  },
  disconnect: () => {
    set({ address: null, error: null });
  },
  setAddress: (address) => set({ address: address?.toLowerCase() ?? null }),
}));

export function useWallet() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const state = useWalletStore();

  useEffect(() => {
    // Check for existing connection
    async function checkConnection() {
      try {
        if (typeof window.ethereum === 'undefined') return;

        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts' 
        });

        state.setAddress(accounts[0] || null);
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }

    checkConnection();

    // Listen for account changes
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts: string[]) => {
        const newAccount = accounts[0] || null;
        state.setAddress(newAccount);
        if (!newAccount) {
          setLocation('/landing');
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, [state.setAddress, setLocation]);

  // Register user when wallet is connected
  useEffect(() => {
    async function registerUser() {
      if (!state.address) return;

      try {
        const response = await apiRequest("POST", "/api/users/register");
        const userData = await response.json();
        console.log('User registered:', userData);
      } catch (error) {
        console.error('User registration error:', error);
        toast({
          title: "Registration Error",
          description: error instanceof Error ? error.message : "Failed to register user",
          variant: "destructive",
        });
      }
    }

    if (state.address) {
      registerUser();
    }
  }, [state.address, toast]);

  return {
    address: state.address,
    isConnected: !!state.address,
    isConnecting: state.isConnecting,
    error: state.error,
    connect: state.connect,
    disconnect: state.disconnect,
  };
}

// Add window.ethereum type
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: any) => void;
      removeListener: (event: string, callback: any) => void;
      selectedAddress: string | null;
    };
  }
}