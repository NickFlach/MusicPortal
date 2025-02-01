import { create } from 'ipfs-http-client';
import { Buffer } from 'buffer';

const projectId = import.meta.env.VITE_INFURA_PROJECT_ID;
const projectSecret = import.meta.env.VITE_INFURA_PROJECT_SECRET;

if (!projectId || !projectSecret) {
  throw new Error('IPFS credentials not found. Please check your environment variables.');
}

// Ensure Buffer is available in the browser environment
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

export const ipfs = create({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: auth,
  },
});

export async function uploadToIPFS(file: File): Promise<string> {
  try {
    console.log('Starting IPFS upload...');
    const buffer = await file.arrayBuffer();
    const added = await ipfs.add(Buffer.from(buffer));
    console.log('IPFS upload successful:', added.path);
    return added.path;
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    if (error instanceof Error) {
      throw new Error(`IPFS Upload failed: ${error.message}`);
    }
    throw new Error('IPFS Upload failed: Unknown error');
  }
}

export async function getFromIPFS(hash: string): Promise<Uint8Array> {
  try {
    console.log('Fetching from IPFS:', hash);
    const chunks = [];
    for await (const chunk of ipfs.cat(hash)) {
      chunks.push(chunk);
    }
    const result = new Uint8Array(Buffer.concat(chunks));
    console.log('IPFS fetch successful');
    return result;
  } catch (error) {
    console.error('Error getting file from IPFS:', error);
    if (error instanceof Error) {
      throw new Error(`IPFS Fetch failed: ${error.message}`);
    }
    throw new Error('IPFS Fetch failed: Unknown error');
  }
}