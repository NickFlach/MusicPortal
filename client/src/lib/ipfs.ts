import { create } from 'ipfs-http-client';
import { Buffer } from 'buffer';

const projectId = import.meta.env.VITE_INFURA_PROJECT_ID;
const projectSecret = import.meta.env.VITE_INFURA_PROJECT_SECRET;

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
    const added = await ipfs.add(file);
    return added.path;
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw error;
  }
}

export async function getFromIPFS(hash: string): Promise<Uint8Array> {
  try {
    const chunks = [];
    for await (const chunk of ipfs.cat(hash)) {
      chunks.push(chunk);
    }
    return new Uint8Array(Buffer.concat(chunks));
  } catch (error) {
    console.error('Error getting file from IPFS:', error);
    throw error;
  }
}