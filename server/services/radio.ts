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

    // Fetch audio metadata first to get content length
    const response = await fetch(`${GATEWAY_URL}/${ipfsHash}`, {
      method: 'HEAD',
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

    const contentLength = response.headers.get('content-length');

    // Set proper headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Fetch and stream the actual audio data
    const audioResponse = await fetch(`${GATEWAY_URL}/${ipfsHash}`, {
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`
      }
    });

    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio stream: ${audioResponse.statusText}`);
    }

    if (!audioResponse.body) {
      throw new Error('No response body received from Pinata');
    }

    // Stream the response directly to the client
    audioResponse.body.pipe(res);

    // Handle errors during streaming
    audioResponse.body.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream error occurred' });
      }
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