import { useAccount } from 'wagmi';
import { WalletConnect } from "@/components/WalletConnect";
import { useLocation } from 'wouter';

export default function Landing() {
  const { address } = useAccount();
  const [, setLocation] = useLocation();

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

        {/* Centered Logo with Link */}
        <div className="flex justify-center items-center mt-24">
          <a 
            href="https://app.pitchforks.social/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-lg"
          >
            <img 
              src="/neo_token_logo_flaukowski.png" 
              alt="NEO Token"
              className="w-64 h-64 object-contain hover:animate-pulse"
            />
          </a>
        </div>
      </div>
    </div>
  );
}