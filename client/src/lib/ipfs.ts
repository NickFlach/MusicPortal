import { Buffer } from 'buffer';
import axios from 'axios';

export class IPFSManager {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;
  private walletAddress: string;

  constructor(walletAddress: string) {
    this.walletAddress = walletAddress;
  }

  private async retry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError;
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        console.warn(`Attempt ${attempt + 1} failed:`, error);
        lastError = error;
        if (attempt < this.MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * (attempt + 1)));
        }
      }
    }
    throw lastError;
  }

  async getFile(cid: string): Promise<ArrayBuffer> {
    // Skip empty CIDs
    if (!cid || cid.trim() === '') {
      console.warn('Empty CID provided, cannot fetch file');
      throw new Error('Invalid CID: empty or undefined');
    }
    
    try {
      console.log('Fetching audio data for track:', cid);

      // Use the server-side proxy instead of direct Pinata access
      const response = await this.retry(async () => {
        try {
          const fetchResponse = await axios.get(`/api/ipfs/fetch/${cid}`, {
            headers: {
              'X-Wallet-Address': this.walletAddress,
            },
            responseType: 'arraybuffer'
          });

          if (!fetchResponse.data) {
            throw new Error('No data received from IPFS');
          }

          return fetchResponse.data;
        } catch (error: any) {
          // Enhanced error reporting
          if (error.response) {
            console.error('IPFS server error:', {
              status: error.response.status,
              statusText: error.response.statusText,
              data: error.response.data
            });
            throw new Error(`IPFS server error: ${error.response.status} ${error.response.statusText}`);
          }
          throw error;
        }
      });

      return response;
    } catch (error) {
      console.error('File retrieval error:', error);
      throw error instanceof Error ? error : new Error('Unknown fetch error');
    }
  }

  async uploadFile(file: File, metadata?: { title?: string; artist?: string }): Promise<string> {
    try {
      console.log('Starting IPFS upload...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        metadata: metadata || 'none',
        timestamp: new Date().toISOString()
      });

      const formData = new FormData();
      formData.append('file', file);
      
      // Add metadata if available
      if (metadata) {
        // Store metadata both as individual fields and as a JSON string
        formData.append('title', metadata.title || '');
        formData.append('artist', metadata.artist || '');
        
        // Also include as JSON for server-side parsing
        const metadataJson = JSON.stringify(metadata);
        formData.append('metadata', metadataJson);
        
        console.log('Added metadata to form data:', metadataJson);
      }

      // Add wallet address through headers instead of form data
      const response = await this.retry(async () => {
        try {
          console.log('Sending IPFS upload request with FormData containing:', 
            [...formData.entries()].map(([key, value]) => `${key}: ${typeof value === 'string' ? value : '[File/Blob]'}`));
          
          const uploadResponse = await axios.post('/api/ipfs/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              'X-Wallet-Address': this.walletAddress,
            }
          });

          if (!uploadResponse.data?.Hash) {
            console.error('Invalid IPFS response format:', uploadResponse.data);
            throw new Error('Invalid IPFS upload response: missing Hash');
          }

          return uploadResponse.data;
        } catch (uploadError) {
          console.error('IPFS upload network error:', uploadError);
          
          if (uploadError.response) {
            console.error('IPFS upload response error:', {
              status: uploadError.response.status,
              statusText: uploadError.response.statusText,
              data: uploadError.response.data
            });
            throw new Error(`IPFS upload failed: ${uploadError.response.data?.error || uploadError.response.statusText}`);
          }
          
          throw uploadError;
        }
      });

      console.log('IPFS upload successful:', response);
      return response.Hash;
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw error instanceof Error ? error : new Error('Unknown upload error');
    }
  }
}

export function createIPFSManager(walletAddress: string) {
  return new IPFSManager(walletAddress);
}