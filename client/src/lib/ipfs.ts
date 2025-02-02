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
    console.log('Starting Pinata upload...');

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
      throw new Error(`Pinata upload failed: ${error}`);
    }

    const data = await res.json();
    console.log('Pinata upload successful:', data.IpfsHash);
    return data.IpfsHash;
  } catch (error) {
    console.error('Error uploading to Pinata:', error);
    if (error instanceof Error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
    throw new Error('Upload failed: Unknown error');
  }
}

export async function getFromIPFS(hash: string): Promise<Uint8Array> {
  try {
    console.log('Fetching from IPFS gateway:', hash);
    const gateway = 'https://gateway.pinata.cloud/ipfs';
    const response = await fetch(`${gateway}/${hash}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    console.log('IPFS fetch successful');
    return new Uint8Array(buffer);
  } catch (error) {
    console.error('Error getting file from IPFS:', error);
    if (error instanceof Error) {
      throw new Error(`IPFS Fetch failed: ${error.message}`);
    }
    throw new Error('IPFS Fetch failed: Unknown error');
  }
}