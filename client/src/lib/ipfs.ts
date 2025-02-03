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

    // Create audio element with streaming URL
    const audio = new Audio();
    let isLoaded = false;

    return new Promise((resolve, reject) => {
      // Set up event listeners before setting src
      const onCanPlay = () => {
        if (!isLoaded) {
          console.log('Audio loaded and ready to play');
          isLoaded = true;
          cleanup();
          resolve(new Uint8Array(0)); // We don't need the actual bytes anymore
        }
      };

      const onError = (e: Event) => {
        const error = (e.target as HTMLAudioElement).error;
        console.error('Audio loading error:', error?.message || 'Unknown error');
        cleanup();
        reject(new Error(error?.message || 'Failed to load audio'));
      };

      const onTimeout = () => {
        if (!isLoaded) {
          console.error('Audio loading timeout');
          cleanup();
          reject(new Error('Audio loading timeout'));
        }
      };

      const cleanup = () => {
        audio.removeEventListener('canplaythrough', onCanPlay);
        audio.removeEventListener('error', onError);
        clearTimeout(timeoutId);
      };

      // Add event listeners
      audio.addEventListener('canplaythrough', onCanPlay);
      audio.addEventListener('error', onError);

      // Set timeout for loading
      const timeoutId = setTimeout(onTimeout, 30000); // 30 second timeout

      // Set source and start loading
      audio.src = `/api/radio/stream/${hash}`;
      audio.load();
    });
  } catch (error) {
    console.error('Error getting file from radio service:', error);
    if (error instanceof Error) {
      throw new Error(`Audio streaming failed: ${error.message}`);
    }
    throw new Error('Audio streaming failed: Unknown error');
  }
}