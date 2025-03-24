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
      console.log('Fetching file from IPFS via proxy:', cid);

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
          
          console.log('IPFS file retrieved successfully, size:', fetchResponse.data.byteLength);
          return fetchResponse.data;
        } catch (error: any) {
          // Enhanced error reporting
          if (error.response) {
            console.error('IPFS server error:', {
              status: error.response.status,
              statusText: error.response.statusText,
              data: typeof error.response.data === 'string' ? error.response.data : 'Binary data'
            });
            
            // More descriptive error for debugging
            if (error.response.status === 401 || error.response.status === 403) {
              throw new Error(`Authorization error retrieving file: ${error.response.statusText}`);
            } else if (error.response.status === 404) {
              throw new Error(`File not found on IPFS (CID: ${cid})`);
            } else if (error.response.status >= 500) {
              throw new Error(`IPFS server error: ${error.response.status}`);
            } else {
              throw new Error(`IPFS error: ${error.response.status} ${error.response.statusText}`);
            }
          }
          
          // Network or other errors
          throw new Error(`Failed to retrieve file: ${error.message || 'Unknown error'}`);
        }
      });

      return response;
    } catch (error) {
      console.error('File retrieval error:', error);
      throw error instanceof Error 
        ? error 
        : new Error('Unknown error retrieving file from IPFS');
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
        
        // Create a proper document structure for metadata
        const docMetadata = {
          title: metadata.title || '',
          artist: metadata.artist || '',
          type: 'audio',
          created: new Date().toISOString(),
          description: `${metadata.title || 'Unknown Title'} by ${metadata.artist || 'Unknown Artist'}`
        };
        
        // Also include as JSON for server-side parsing
        const metadataJson = JSON.stringify(docMetadata);
        formData.append('metadata', metadataJson);
        formData.append('docMetadata', new Blob([metadataJson], { type: 'application/json' }));
        
        console.log('Added metadata to form data:', metadataJson);
      }

      // Add wallet address through headers instead of form data
      const response = await this.retry(async () => {
        try {
          // Safe way to iterate over FormData entries
          const formDataKeys: string[] = [];
          formData.forEach((value, key) => {
            formDataKeys.push(`${key}: ${typeof value === 'string' ? value : '[File/Blob]'}`);
          });
          const formDataSummary = formDataKeys.join(', ');
            
          console.log('Sending IPFS upload request with FormData containing:', formDataSummary);
          
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
        } catch (uploadError: any) {
          console.error('IPFS upload network error:', uploadError);
          
          if (uploadError.response) {
            console.error('IPFS upload response error:', {
              status: uploadError.response.status,
              statusText: uploadError.response.statusText,
              data: uploadError.response.data
            });
            
            // Handle specific error types from server for better user feedback
            if (uploadError.response.data?.code === 'PINATA_VALIDATION_ERROR') {
              throw new Error(`File validation failed: ${uploadError.response.data?.userMessage || 'Please check file format and try again'}`);
            } else if (uploadError.response.data?.code === 'PINATA_AUTH_ERROR') {
              throw new Error(`Authentication error: ${uploadError.response.data?.userMessage || 'Could not authenticate with IPFS service'}`);
            } else if (uploadError.response.status === 413) {
              throw new Error('The file is too large. Please choose a smaller file (under 100MB).');
            } else {
              throw new Error(`IPFS upload failed: ${uploadError.response.data?.userMessage || uploadError.response.data?.error || uploadError.response.statusText}`);
            }
          }
          
          // Generic network errors
          if (uploadError.code === 'ECONNABORTED') {
            throw new Error('Upload timed out. Please try again with a smaller file or check your network connection.');
          } else if (uploadError.message && uploadError.message.includes('Network Error')) {
            throw new Error('Network error. Please check your internet connection and try again.');
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