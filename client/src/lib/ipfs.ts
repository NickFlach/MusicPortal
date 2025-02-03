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
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

export async function uploadToIPFS(file: File): Promise<string> {
  try {
    console.log('Starting Pinata upload...');

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
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.IpfsHash) {
      throw new Error('No IPFS hash received from Pinata');
    }

    console.log('Upload successful:', data.IpfsHash);
    return data.IpfsHash;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

export async function getFromIPFS(hash: string): Promise<Uint8Array> {
  try {
    console.log('Fetching from Pinata:', hash);
    const audio = new Audio();

    return new Promise((resolve, reject) => {
      const handleLoaded = () => {
        console.log('Audio loaded');
        resolve(new Uint8Array(0));
      };

      const handleError = () => {
        reject(new Error('Failed to load audio'));
      };

      audio.addEventListener('loadeddata', handleLoaded, { once: true });
      audio.addEventListener('error', handleError, { once: true });

      audio.src = `${PINATA_GATEWAY}/${hash}`;
      audio.load();
    });
  } catch (error) {
    console.error('IPFS fetch failed:', error);
    throw error;
  }
}