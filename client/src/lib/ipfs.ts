import { Buffer } from 'buffer';

const pinataJWT = import.meta.env.VITE_PINATA_JWT;

if (!pinataJWT) {
  throw new Error('Pinata JWT not found. Please check your environment variables.');
}

// Ensure Buffer is available in the browser environment
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

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

    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pinataJWT}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('Pinata API error:', error);
      if (res.status === 401) {
        throw new Error('Invalid Pinata credentials. Please check your JWT token.');
      } else if (res.status === 413) {
        throw new Error('File is too large for Pinata to process.');
      } else {
        throw new Error(`Pinata upload failed (${res.status}): ${error}`);
      }
    }

    const data = await res.json();
    console.log('Pinata upload successful:', {
      ipfsHash: data.IpfsHash,
      timestamp: new Date().toISOString()
    });
    return data.IpfsHash;
  } catch (error) {
    console.error('Error uploading to Pinata:', error);
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error: Could not connect to Pinata. Please check your internet connection.');
      }
      throw new Error(`Upload failed: ${error.message}`);
    }
    throw new Error('Upload failed: Unknown error');
  }
}

export async function getFromIPFS(hash: string): Promise<Uint8Array> {
  try {
    console.log('Fetching from radio service:', hash);

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

      // Load the audio file
      audio.src = `/api/radio/stream/${hash}`;
      audio.load();
    });
  } catch (error) {
    console.error('Error getting file from radio service:', error);
    if (error instanceof Error) {
      throw new Error(`Audio loading failed: ${error.message}`);
    }
    throw new Error('Audio loading failed: Unknown error');
  }
}