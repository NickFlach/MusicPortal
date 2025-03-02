// This file has been disabled as part of removing NEOFS functionality
// and simplifying our system to use IPFS direct pinning only.
// If you need to restore NEOFS functionality, uncomment the code below.

/*
import { WebSocket } from 'ws';
import { getClients } from './stats';

interface NeoStorageConfig {
  gasRecipient: string;
  defaultGasLimit: string;
}

export interface SongMetadata {
  title: string;
  artist: string;
  uploadedBy: string;
  ipfsHash: string;
  neoContainerId?: string;
  createdAt: Date;
}

// Configuration for NEO FS interactions
const config: NeoStorageConfig = {
  gasRecipient: process.env.GAS_RECIPIENT_ADDRESS || '',
  defaultGasLimit: '1000000',
};

// Calculation functions and storage operations are commented out as they are no longer used
*/

// Placeholder versions of the essential functions that return meaningful errors
export function calculateRequiredGas(fileSize: number, duration: number): string {
  console.warn('NEOFS functionality has been disabled');
  return '0';
}

export async function prepareNeoContainer(metadata: any): Promise<string> {
  console.warn('NEOFS functionality has been disabled');
  throw new Error('NEOFS functionality has been disabled');
}

export async function storeInNeoFS(
  fileData: Buffer,
  metadata: any
): Promise<{ containerId: string; objectId: string }> {
  console.warn('NEOFS functionality has been disabled');
  throw new Error('NEOFS functionality has been disabled');
}

export function broadcastStorageStatus(message: Record<string, unknown>): void {
  console.warn('NEOFS functionality has been disabled');
  // No-op
}

export async function updateSongMetadata(
  songId: number,
  metadata: any
): Promise<void> {
  console.warn('NEOFS functionality has been disabled');
  throw new Error('NEOFS functionality has been disabled');
}

// Define the minimum type needed to maintain compatibility
export interface SongMetadata {
  title: string;
  artist: string;
  uploadedBy: string;
  ipfsHash: string;
  createdAt: Date;
}