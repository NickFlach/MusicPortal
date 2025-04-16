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

  constructor() {
    super();
    this.initialize();
  }

  /**
   * Initialize the connection manager
   */
  public initialize() {
    // Get keys from environment
    this.apiKey = process.env.VITE_PINATA_API_KEY || null;
    this.apiSecret = process.env.VITE_PINATA_API_SECRET || null;

    if (!this.apiKey || !this.apiSecret) {
      console.warn('IPFS Connection Manager: Missing Pinata API keys');
      this.status.connected = false;
      this.emit('status', { ...this.status });
      return;
    }

    // Start connection
    this.connect();
  }

  /**
   * Connect to IPFS/Pinata
   */
  private async connect() {
    if (this.status.isRetrying) return;

    try {
      this.status.isRetrying = true;
      console.log('IPFS Connection Manager: Connecting to Pinata...');

      const response = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
        headers: {
          'pinata_api_key': this.apiKey,
          'pinata_secret_api_key': this.apiSecret
        }
      });

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
      
      console.error('IPFS Connection Manager: Connection error:', error);
      
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
        await axios.get('https://api.pinata.cloud/data/testAuthentication', {
          headers: {
            'pinata_api_key': this.apiKey,
            'pinata_secret_api_key': this.apiSecret
          }
        });
        
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
    return {
      'pinata_api_key': this.apiKey || '',
      'pinata_secret_api_key': this.apiSecret || ''
    };
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