import { Buffer } from 'buffer';

const pinataJWT = import.meta.env.VITE_PINATA_JWT;

if (!pinataJWT) {
  throw new Error('Pinata JWT not found. Please check your environment variables.');
}

// Ensure Buffer is available in the browser environment
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

const PINATA_API_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const PINATA_GATEWAY = 'https://blush-adjacent-octopus-823.mypinata.cloud/ipfs';


export async function uploadToIPFS(file: File): Promise<string> {
  try {
    console.log('Starting Pinata upload...', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    // Validate file size (max 100MB)
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 100MB limit');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(PINATA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pinataJWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pinata API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });

      if (response.status === 401) {
        throw new Error('Invalid Pinata credentials');
      } else if (response.status === 413) {
        throw new Error('File is too large for Pinata to process');
      } else {
        throw new Error(`Upload failed: ${response.statusText} (${response.status})`);
      }
    }

    const data = await response.json();
    if (!data.IpfsHash) {
      throw new Error('No IPFS hash received from Pinata');
    }

    console.log('Pinata upload successful:', {
      ipfsHash: data.IpfsHash,
      timestamp: new Date().toISOString(),
      size: file.size
    });

    return data.IpfsHash;
  } catch (error) {
    console.error('Error uploading to Pinata:', error);
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error: Could not connect to Pinata. Please check your internet connection.');
      }
      throw error;
    }
    throw new Error('Upload failed: Unknown error');
  }
}

export async function getFromIPFS(hash: string): Promise<Uint8Array> {
  try {
    console.log('Making request to:', `${PINATA_GATEWAY}/${hash}`);
    const audio = new Audio();

    return new Promise((resolve, reject) => {
      const handleLoaded = () => {
        console.log('Audio data loaded successfully');
        resolve(new Uint8Array(0));
      };

      const handleError = () => {
        console.error('Audio loading error:', audio.error);
        reject(new Error('Failed to load audio'));
      };

      audio.addEventListener('loadeddata', handleLoaded, { once: true });
      audio.addEventListener('error', handleError, { once: true });

      // Load using direct Pinata gateway URL
      audio.src = `${PINATA_GATEWAY}/${hash}`;
      audio.load();
    });
  } catch (error) {
    console.error('Error getting file from Pinata:', error);
    if (error instanceof Error) {
      throw new Error(`Audio loading failed: ${error.message}`);
    }
    throw new Error('Audio loading failed: Unknown error');
  }
}