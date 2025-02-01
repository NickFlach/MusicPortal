import { WalletConnect } from "@/components/WalletConnect";
import { Navigation } from "@/components/Navigation";
import { MusicPlayer } from "@/components/MusicPlayer";
import { Link } from "wouter";
import { DynamicBackground } from "@/components/DynamicBackground";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="relative min-h-screen">
      {/* Background layer */}
      <div className="fixed inset-0 bg-background/95" />

      {/* Dynamic background layer */}
      <DynamicBackground />

      {/* Content layers */}
      <header className="relative z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img 
                src="/neo_token_logo_flaukowski.png" 
                alt="NEO Token"
                className="w-8 h-8"
              />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                Music Portal
              </h1>
            </Link>
            <Navigation />
          </div>
          <WalletConnect />
        </div>
      </header>

      <main className="relative z-10 container mx-auto pt-24 pb-40">
        {children}
      </main>

      <MusicPlayer />
    </div>
  );
}