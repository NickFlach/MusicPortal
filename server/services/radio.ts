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

    if (!response.ok || !response.body) {
      console.error('IPFS fetch error:', {
        status: response.status,
        statusText: response.statusText
      });
      return res.status(response.status).json({ 
        error: `Failed to fetch audio: ${response.statusText}` 
      });
    }

    // Set up audio streaming headers
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Create a pass-through stream and handle errors
    const stream = response.body;
    stream.on('error', (error) => {
      console.error('Stream error:', error);
      res.status(500).end();
    });

    // Pipe the audio stream directly to the response
    stream.pipe(res);

    // Handle client disconnect
    req.on('close', () => {
      stream.destroy();
    });

  } catch (error) {
    console.error('Radio service error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  }
}