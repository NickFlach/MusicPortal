import { Request, Response } from 'express';
import { Buffer } from 'buffer';
import fetch from 'node-fetch';

const PINATA_JWT = process.env.VITE_PINATA_JWT;
const GATEWAY_URL = 'https://gateway.pinata.cloud/ipfs';

export async function streamAudio(req: Request, res: Response) {
  try {
    const { ipfsHash } = req.params;

    if (!ipfsHash) {
      return res.status(400).json({ error: 'IPFS hash is required' });
    }

    if (!PINATA_JWT) {
      return res.status(500).json({ error: 'Pinata configuration missing' });
    }

    // Fetch audio from IPFS
    const response = await fetch(`${GATEWAY_URL}/${ipfsHash}`, {
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`
      }
    });

    if (!response.ok) {
      console.error('IPFS fetch error:', {
        status: response.status,
        statusText: response.statusText
      });
      return res.status(response.status).json({ 
        error: `Failed to fetch audio: ${response.statusText}` 
      });
    }

    // Get the audio data as a buffer
    const audioData = await response.arrayBuffer();

    // Set response headers
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioData.byteLength);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Send the complete audio file
    res.send(Buffer.from(audioData));

  } catch (error) {
    console.error('Radio service error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  }
}