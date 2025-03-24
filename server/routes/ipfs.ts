import { Router } from 'express';
import multer from 'multer';
import axios from 'axios';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Pinata configuration
const PINATA_API_KEY = process.env.VITE_PINATA_API_KEY;
const PINATA_API_SECRET = process.env.VITE_PINATA_API_SECRET;

// Add a health check route for IPFS connectivity
router.get('/health', async (req, res) => {
  try {
    // Check if credentials are set
    if (!PINATA_API_KEY || !PINATA_API_SECRET) {
      return res.status(500).json({
        status: 'error',
        message: 'Pinata credentials are not configured',
        hasApiKey: !!PINATA_API_KEY,
        hasApiSecret: !!PINATA_API_SECRET
      });
    }

    // Test connection to Pinata API
    console.log('Testing Pinata authentication with:', {
      hasApiKey: !!PINATA_API_KEY,
      apiKeyLength: PINATA_API_KEY?.length,
      hasApiSecret: !!PINATA_API_SECRET,
      apiSecretLength: PINATA_API_SECRET?.length,
    });
    
    try {
      const response = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
        headers: {
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_API_SECRET
        }
      });
      
      console.log('Pinata authentication response:', response.data);
      
      return res.json({
        status: 'ok',
        message: 'Pinata connection successful',
        authenticated: response.data?.authenticated || false,
        responseData: response.data
      });
    } catch (authError) {
      console.error('Pinata authentication specific error:', authError.response?.data || authError.message);
      
      return res.json({
        status: 'partial',
        message: 'Pinata connection successful but authentication failed',
        error: authError.response?.data || authError.message,
        authenticated: false
      });
    }
  } catch (error) {
    console.error('Pinata health check error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to connect to Pinata',
      error: error instanceof Error ? error.message : 'Unknown error',
      hasApiKey: !!PINATA_API_KEY,
      hasApiSecret: !!PINATA_API_SECRET
    });
  }
});

// Proxy route for IPFS uploads
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    console.log('IPFS upload request received:', {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      walletAddress: req.headers['x-wallet-address']
    });

    if (!PINATA_API_KEY || !PINATA_API_SECRET) {
      console.error('Missing Pinata credentials');
      return res.status(500).json({ error: 'Server configuration error: Missing Pinata credentials' });
    }

    // Parse metadata if included
    let metadata = {};
    if (req.body.metadata) {
      try {
        metadata = JSON.parse(req.body.metadata);
      } catch (e) {
        console.warn('Failed to parse metadata:', e);
      }
    }

    // Create form data for Pinata
    const formData = new FormData();
    formData.append('file', new Blob([req.file.buffer]), req.file.originalname);

    // Add metadata as pinataMetadata
    formData.append('pinataMetadata', JSON.stringify({
      name: req.file.originalname,
      keyvalues: {
        artist: metadata.artist || 'Unknown',
        title: metadata.title || req.file.originalname,
        uploadedBy: metadata.uploadedBy || req.headers['x-wallet-address'] || 'anonymous',
        mimeType: req.file.mimetype
      }
    }));

    // Add pinataOptions for controlling pinning behavior
    formData.append('pinataOptions', JSON.stringify({
      cidVersion: 0
    }));

    console.log('Sending request to Pinata IPFS with auth');

    const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_API_SECRET,
        'Content-Type': 'multipart/form-data',
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    console.log('Pinata upload response:', response.data);
    res.json({ Hash: response.data.IpfsHash });
  } catch (error) {
    console.error('Pinata upload error:', error);

    // Detailed error logging
    if (error.response) {
      console.error('Pinata error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }

    res.status(500).json({ 
      error: 'Failed to upload to IPFS via Pinata',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Proxy route for IPFS downloads
router.get('/fetch/:cid', async (req, res) => {
  try {
    const { cid } = req.params;

    console.log('Fetching from IPFS gateway:', { cid });

    // Try authenticated Pinata gateway first
    let response;
    if (PINATA_API_KEY && PINATA_API_SECRET) {
      console.log('Using authenticated Pinata gateway');
      response = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`, {
        responseType: 'arraybuffer',
        headers: {
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_API_SECRET
        }
      });
    } else {
      console.log('No Pinata credentials, using public gateway');
      response = await axios.get(`https://ipfs.io/ipfs/${cid}`, {
        responseType: 'arraybuffer'
      });
    }

    res.set('Content-Type', 'application/octet-stream');
    res.send(response.data);
  } catch (error) {
    console.error('IPFS fetch error:', error);

    // Try a fallback public gateway if Pinata fails
    try {
      console.log('Trying fallback IPFS gateway for:', { cid: req.params.cid });
      const fallbackResponse = await axios.get(`https://ipfs.io/ipfs/${req.params.cid}`, {
        responseType: 'arraybuffer'
      });

      res.set('Content-Type', 'application/octet-stream');
      res.send(fallbackResponse.data);
      return;
    } catch (fallbackError) {
      console.error('Fallback gateway also failed:', fallbackError);
    }

    // Detailed error logging
    if (error.response) {
      console.error('Gateway error response:', {
        status: error.response.status,
        statusText: error.response.statusText
      });
    }

    res.status(500).json({
      error: 'Failed to fetch from IPFS',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;