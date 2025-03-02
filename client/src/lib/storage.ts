import { Buffer } from 'buffer';
import { apiRequest } from './queryClient';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit

interface StorageMetadata {
  title: string;
  artist: string;
  fileSize: number;
  duration?: number;
  mimeType: string;
  uploadedBy: string;
}

export async function uploadFile(file: File, metadata: StorageMetadata) {
  try {
    console.log('Starting file upload...', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString()
    });

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    // Use fetch directly for FormData instead of apiRequest
    const walletAddress = window.ethereum?.selectedAddress;
    const response = await fetch('/api/ipfs/upload', {
      method: 'POST',
      headers: {
        'x-wallet-address': walletAddress || "",
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Upload failed with status: ${response.status}`);
    }

    const responseData = await response.json();

    if (!responseData || !responseData.Hash) {
      throw new Error('Invalid response from IPFS upload');
    }

    console.log('IPFS upload successful:', responseData);

    return {
      hash: responseData.Hash,
      metadata
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

export async function getFileBuffer(hash: string): Promise<ArrayBuffer> {
  try {
    if (!hash) {
      throw new Error('Missing IPFS hash');
    }

    // Use fetch directly for binary data
    const response = await fetch(`/api/ipfs/fetch/${hash}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/octet-stream',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error('File retrieval error:', error);
    throw error;
  }
}

// Helper to check file availability
export async function checkFileAvailability(hash: string): Promise<boolean> {
  try {
    if (!hash) {
      return false;
    }

    const response = await fetch(`/api/ipfs/fetch/${hash}`, {
      method: 'HEAD',
    });
    return response.ok;
  } catch {
    return false;
  }
}