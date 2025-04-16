import axios from 'axios';
import { EventEmitter } from 'events';

interface ConnectionStatus {
  connected: boolean;
  lastConnected: Date | null;
  lastError: Error | null;
  retryCount: number;
  isRetrying: boolean;
}

/**
 * IPFSConnectionManager
 * Manages persistent connections to IPFS/Pinata
 */
class IPFSConnectionManager extends EventEmitter {
  private status: ConnectionStatus = {
    connected: false,
    lastConnected: null,
    lastError: null,
    retryCount: 0,
    isRetrying: false
  };
  private retryTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private readonly MAX_RETRIES = 10;
  private readonly RETRY_DELAY = 5000; // 5 seconds
  private readonly PING_INTERVAL = 60000; // 1 minute

  private apiKey: string | null = null;
  private apiSecret: string | null = null;
  private jwtToken: string | null = null;
  private useJwt: boolean = false;
  private useFallbackGateways: boolean = false;
  private readonly PUBLIC_GATEWAYS = [
    'https://ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://gateway.pinata.cloud/ipfs/'
  ];

  constructor() {
    super();
    this.initialize();
  }

  /**
   * Helper method to try different tokens
   */
  private async tryDifferentTokens(): Promise<boolean> {
    console.log('IPFS Connection Manager: Attempting to authenticate with different tokens');
    
    // Try all combinations of tokens
    const jwtTokens = [
      process.env.PINATA_JWT,
      process.env.VITE_PINATA_JWT
    ].filter(Boolean) as string[];
    
    // Create interfaces for type-safety
    interface ApiKeyPair {
      key: string;
      secret: string;
    }
    
    // Filter to ensure we only keep pairs where both key and secret are defined
    const apiKeysRaw = [
      { 
        key: process.env.PINATA_API_KEY || undefined, 
        secret: process.env.PINATA_API_SECRET || undefined 
      },
      { 
        key: process.env.VITE_PINATA_API_KEY || undefined, 
        secret: process.env.VITE_PINATA_API_SECRET || undefined 
      }
    ];
    
    // Filter and cast to ensure we have valid pairs
    const apiKeys: ApiKeyPair[] = apiKeysRaw
      .filter((creds): creds is ApiKeyPair => 
        typeof creds.key === 'string' && typeof creds.secret === 'string'
      );
    
    // Create an axios instance with longer timeout
    const client = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Try each JWT token
    for (let i = 0; i < jwtTokens.length; i++) {
      const token = jwtTokens[i];
      const maskedToken = `${token.substring(0, 8)}...${token.substring(token.length - 8)}`;
      
      try {
        console.log(`IPFS Connection Manager: Testing JWT token ${i+1} - ${maskedToken}`);
        const response = await client.get('https://api.pinata.cloud/data/testAuthentication', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data?.authenticated) {
          console.log(`IPFS Connection Manager: JWT Token ${i+1} works!`);
          this.jwtToken = token;
          this.useJwt = true;
          return true;
        }
      } catch (err) {
        console.error(`IPFS Connection Manager: JWT Token ${i+1} failed:`, err instanceof Error ? err.message : String(err));
      }
    }
    
    // Try each API key/secret pair
    for (let i = 0; i < apiKeys.length; i++) {
      const { key, secret } = apiKeys[i];
      // Safe to access substring now since we've verified key is a string
      const maskedKey = `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
      
      try {
        console.log(`IPFS Connection Manager: Testing API key/secret ${i+1} - ${maskedKey}`);
        const response = await client.get('https://api.pinata.cloud/data/testAuthentication', {
          headers: {
            'pinata_api_key': key,
            'pinata_secret_api_key': secret
          }
        });
        
        if (response.data?.authenticated) {
          console.log(`IPFS Connection Manager: API key/secret ${i+1} works!`);
          this.apiKey = key;
          this.apiSecret = secret;
          this.useJwt = false;
          return true;
        }
      } catch (err) {
        console.error(`IPFS Connection Manager: API key/secret ${i+1} failed:`, err instanceof Error ? err.message : String(err));
      }
    }
    
    return false;
  }

  /**
   * Initialize the connection manager
   */
  public async initialize() {
    // Log available credentials for debugging
    console.log('IPFS Connection Manager: Available Pinata credential types:', {
      hasJwt: !!process.env.PINATA_JWT,
      hasApiKey: !!process.env.PINATA_API_KEY,
      hasApiSecret: !!process.env.PINATA_API_SECRET
    });
    
    // Use the environment variables directly - no fallback to VITE_ prefixed versions
    this.apiKey = process.env.PINATA_API_KEY || null;
    this.apiSecret = process.env.PINATA_API_SECRET || null;
    this.jwtToken = process.env.PINATA_JWT || null;
    
    // Try all available tokens and find one that works
    const tokenTestSuccess = await this.tryDifferentTokens();
    
    if (tokenTestSuccess) {
      this.connect();
      return;
    }
    
    if (this.jwtToken) {
      console.log('IPFS Connection Manager: Defaulting to JWT auth despite test failure');
      this.useJwt = true;
      this.connect();
      return;
    }
    
    // Use direct API key/secret
    this.apiKey = process.env.PINATA_API_KEY || null;
    this.apiSecret = process.env.PINATA_API_SECRET || null;

    if (!this.apiKey || !this.apiSecret) {
      console.warn('IPFS Connection Manager: Missing Pinata credentials (no JWT or API keys found)');
      this.status.connected = false;
      this.emit('status', { ...this.status });
      return;
    }

    console.log('IPFS Connection Manager: Found API key credentials');
    
    // Start connection
    this.connect();
  }

  /**
   * Connect to IPFS/Pinata
   */
  private async connect(): Promise<void> {
    if (this.status.isRetrying) return;

    try {
      this.status.isRetrying = true;
      const timestamp = new Date().toISOString();
      console.log(`IPFS Connection Manager: Connecting to Pinata at ${timestamp}...`);

      // Choose authentication method based on available credentials
      let response;
      
      if (this.useJwt && this.jwtToken) {
        // Log masked token for debugging (not showing the full token for security)
        const maskedToken = this.jwtToken ? 
          `${this.jwtToken.substring(0, 8)}...${this.jwtToken.substring(this.jwtToken.length - 8)}` : 
          'not set';
        
        console.log(`IPFS Connection Manager: Using JWT authentication - Token: ${maskedToken}`);
        
        response = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
          headers: {
            'Authorization': `Bearer ${this.jwtToken}`
          }
        });
      }
      else if (this.apiKey && this.apiSecret) {
        // Log partial API key for debugging (not showing the full key for security)
        const maskedKey = this.apiKey ? 
          `${this.apiKey.substring(0, 4)}...${this.apiKey.substring(this.apiKey.length - 4)}` : 
          'not set';
        const maskedSecret = this.apiSecret ? 
          `${this.apiSecret.substring(0, 4)}...${this.apiSecret.substring(this.apiSecret.length - 4)}` : 
          'not set';
        
        console.log(`IPFS Connection Manager: Using API Key authentication - Key: ${maskedKey}, Secret: ${maskedSecret}`);
        
        response = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
          headers: {
            'pinata_api_key': this.apiKey,
            'pinata_secret_api_key': this.apiSecret
          }
        });
      }
      else {
        throw new Error('No valid authentication credentials available');
      }

      if (response.data?.authenticated) {
        this.status.connected = true;
        this.status.lastConnected = new Date();
        this.status.lastError = null;
        this.status.retryCount = 0;
        console.log('IPFS Connection Manager: Connected to Pinata');
        
        // Start ping interval to keep connection alive
        this.startPing();
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      this.status.connected = false;
      this.status.lastError = error instanceof Error ? error : new Error(String(error));
      this.status.retryCount++;
      
      // Provide more detailed error information
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error('IPFS Connection Manager: Server error:', {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            headers: JSON.stringify(error.response.headers)
          });
          
          // If status is 401 or 403, this is an authentication issue
          if (error.response.status === 401 || error.response.status === 403) {
            console.error('IPFS Connection Manager: Authentication failed. Your API keys or JWT token may have expired or been revoked.');
          }
          
          // If we're using JWT and it failed, try falling back to API key auth as a backup
          if (this.useJwt && this.jwtToken && this.apiKey && this.apiSecret) {
            console.log('IPFS Connection Manager: JWT auth failed, switching to API key authentication');
            this.useJwt = false;
            this.status.retryCount = 0; // Reset retry count for new auth method
            return this.connect();
          }
        } else if (error.request) {
          // The request was made but no response was received
          console.error('IPFS Connection Manager: No response received from server');
        } else {
          // Something happened in setting up the request
          console.error('IPFS Connection Manager: Request error:', error.message);
        }
      } else {
        console.error('IPFS Connection Manager: Connection error:', error);
      }
      
      // Schedule retry if under max retries
      if (this.status.retryCount <= this.MAX_RETRIES) {
        console.log(`IPFS Connection Manager: Retrying in ${this.RETRY_DELAY / 1000}s (attempt ${this.status.retryCount}/${this.MAX_RETRIES})`);
        
        if (this.retryTimeout) {
          clearTimeout(this.retryTimeout);
        }
        
        this.retryTimeout = setTimeout(() => {
          this.status.isRetrying = false;
          this.connect();
        }, this.RETRY_DELAY);
      } else {
        console.error(`IPFS Connection Manager: Max retries (${this.MAX_RETRIES}) reached`);
        this.status.isRetrying = false;
      }
    } finally {
      this.status.isRetrying = false;
      this.emit('status', { ...this.status });
    }
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(async () => {
      try {
        // Use same authentication method as in connect
        if (this.useJwt && this.jwtToken) {
          await axios.get('https://api.pinata.cloud/data/testAuthentication', {
            headers: {
              'Authorization': `Bearer ${this.jwtToken}`
            }
          });
        } else if (this.apiKey && this.apiSecret) {
          await axios.get('https://api.pinata.cloud/data/testAuthentication', {
            headers: {
              'pinata_api_key': this.apiKey,
              'pinata_secret_api_key': this.apiSecret
            }
          });
        } else {
          throw new Error('No valid credentials for ping');
        }
        
        // If we get here, the ping was successful
        if (!this.status.connected) {
          console.log('IPFS Connection Manager: Reconnected via ping');
          this.status.connected = true;
          this.status.lastConnected = new Date();
          this.emit('status', { ...this.status });
        }
      } catch (error) {
        console.warn('IPFS Connection Manager: Ping failed, attempting reconnect');
        this.status.connected = false;
        this.emit('status', { ...this.status });
        this.connect();
      }
    }, this.PING_INTERVAL);
  }

  /**
   * Get the current connection status
   */
  public getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.status.connected;
  }

  /**
   * Get authenticated headers for Pinata API
   */
  public getHeaders(): Record<string, string> {
    if (this.useJwt && this.jwtToken) {
      return {
        'Authorization': `Bearer ${this.jwtToken}`
      };
    } else {
      return {
        'pinata_api_key': this.apiKey || '',
        'pinata_secret_api_key': this.apiSecret || ''
      };
    }
  }

  /**
   * Get API key and secret
   */
  public getCredentials(): { apiKey: string | null, apiSecret: string | null } {
    return {
      apiKey: this.apiKey,
      apiSecret: this.apiSecret
    };
  }

  /**
   * Clean up resources
   */
  public shutdown() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.removeAllListeners();
  }
}

// Export singleton instance
export const ipfsConnectionManager = new IPFSConnectionManager();