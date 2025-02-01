import { WalletConnect } from "@/components/WalletConnect";
import { Navigation } from "@/components/Navigation";
import { MusicPlayer } from "@/components/MusicPlayer";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background relative">
      {/* Background image with overlay */}
      <div 
        className="fixed inset-0 -z-10 bg-[url('/background.jpg')] bg-cover bg-center"
        style={{
          backgroundImage: "url('/neo_token_logo_flaukowski.png')",
          opacity: 0.1
        }}
      />

      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto py-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex items-center gap-2">
              <img 
                src="/neo_token_logo_flaukowski.png" 
                alt="NEO Token"
                className="w-8 h-8"
              />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                Music Portal
              </h1>
            </div>
            <Navigation />
          </div>
          <WalletConnect />
        </div>
      </header>
      <main className="container mx-auto pt-24 pb-40">
        {children}
      </main>
      <MusicPlayer />
    </div>
  );
}