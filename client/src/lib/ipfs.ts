import { create } from 'ipfs-http-client';

const projectId = import.meta.env.VITE_INFURA_PROJECT_ID;
const projectSecret = import.meta.env.VITE_INFURA_PROJECT_SECRET;

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
  const chunks = [];
  for await (const chunk of ipfs.cat(hash)) {
    chunks.push(chunk);
  }
  return new Uint8Array(Buffer.concat(chunks));
}
