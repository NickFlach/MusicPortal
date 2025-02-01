import { useLocation } from 'wouter';
import { WalletConnect } from "@/components/WalletConnect";
import { useState, useEffect } from 'react';

export default function Landing() {
  const [, setLocation] = useLocation();
  const [address, setAddress] = useState<string | null>(null);

  // Check for wallet connection on mount and address changes
  useEffect(() => {
    const checkWallet = () => {
      const currentAddress = window.ethereum?.selectedAddress;
      setAddress(currentAddress || null);

      if (currentAddress) {
        setLocation('/');
      }
    };

    checkWallet();
    window.ethereum?.on('accountsChanged', checkWallet);

    return () => {
      window.ethereum?.removeListener('accountsChanged', checkWallet);
    };
  }, [setLocation]);

  if (address) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("/neo_token_logo_flaukowski.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(8px)',
          transform: 'scale(1.1)',
          opacity: '0.15'
        }}
      />

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-2">
            <img 
              src="/neo_token_logo_flaukowski.png" 
              alt="NEO Token"
              className="w-12 h-12"
            />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              Music Portal
            </h1>
          </div>
          <WalletConnect />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mt-24">
          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight">
              Your Music, <br />
              <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                Truly Decentralized
              </span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Store and share your music on the blockchain. Create playlists, vote on songs, and be part of a decentralized music community.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-2 text-lg">
                • Upload and own your music on IPFS
              </li>
              <li className="flex items-center gap-2 text-lg">
                • Create and share playlists with the community
              </li>
              <li className="flex items-center gap-2 text-lg">
                • Earn PFORK tokens through community participation
              </li>
            </ul>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute -inset-4 rounded-lg bg-gradient-to-r from-primary/20 to-purple-500/20 blur-3xl" />
            <div className="relative aspect-square rounded-lg bg-card p-4 shadow-xl">
              <img 
                src="/neo_token_logo_flaukowski.png" 
                alt="NEO Token Logo"
                className="w-full h-full object-contain animate-pulse"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}