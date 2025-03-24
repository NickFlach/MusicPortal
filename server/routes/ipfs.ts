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

    // Parse metadata from multiple possible sources
    let metadata: Record<string, string> = {};
    
    console.log('Available request body fields:', req.body ? Object.keys(req.body) : 'no body');
    
    // Extract individual fields first (direct form fields)
    if (req.body) {
      if (req.body.title) {
        metadata.title = req.body.title;
        console.log('Found title in form data:', req.body.title);
      }
      if (req.body.artist) {
        metadata.artist = req.body.artist;
        console.log('Found artist in form data:', req.body.artist);
      }
      
      // Try to get metadata from the metadata field
      if (req.body.metadata) {
        try {
          // If metadata is already an object
          if (typeof req.body.metadata === 'object' && req.body.metadata !== null) {
            metadata = {...metadata, ...req.body.metadata};
            console.log('Metadata parsed from object:', req.body.metadata);
          }
          // If metadata is a string, try to parse it
          else if (typeof req.body.metadata === 'string') {
            const parsedMetadata = JSON.parse(req.body.metadata);
            metadata = {...metadata, ...parsedMetadata};
            console.log('Metadata parsed from string:', parsedMetadata);
          }
        } catch (e) {
          console.warn('Failed to parse metadata JSON:', e);
        }
      }
    }
    
    // If we have a wallet address header, use it
    if (req.headers['x-wallet-address']) {
      metadata.uploadedBy = req.headers['x-wallet-address'] as string;
    }
    
    // Default values for missing metadata
    if (!metadata.title) {
      metadata.title = req.file.originalname;
    }
    if (!metadata.artist) {
      metadata.artist = 'Unknown Artist';
    }
    
    console.log('Final metadata for upload:', metadata);

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
  } catch (error: any) {
    console.error('Pinata upload error:', error);

    // Detailed error logging
    if (error.response) {
      console.error('Pinata error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
      
      // Check for specific pinata error codes
      if (error.response.data?.error?.details) {
        return res.status(400).json({
          error: 'Invalid IPFS upload request',
          code: 'PINATA_VALIDATION_ERROR',
          details: error.response.data.error.details,
          userMessage: 'The file could not be uploaded due to a validation error. Please check the file format and try again.'
        });
      }
      
      if (error.response.status === 401 || error.response.status === 403) {
        return res.status(error.response.status).json({
          error: 'Authentication failed with IPFS service',
          code: 'PINATA_AUTH_ERROR',
          details: error.response.data || error.message,
          userMessage: 'Could not authenticate with IPFS storage. Please try again later.'
        });
      }
    }

    // Network or other errors
    res.status(500).json({ 
      error: 'Failed to upload to IPFS via Pinata',
      code: 'IPFS_UPLOAD_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
      userMessage: 'The file upload failed. Please check your file and try again.'
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
  } catch (error: any) {
    console.error('IPFS fetch error:', error);
    
    // Enhanced error logging with request details
    const errorContext = {
      cid: req.params.cid,
      requestHeaders: {
        'user-agent': req.headers['user-agent'],
        'x-wallet-address': req.headers['x-wallet-address'] || 'not provided'
      },
      timestamp: new Date().toISOString()
    };
    
    console.error('IPFS fetch error context:', errorContext);

    // Try a fallback public gateway if Pinata fails
    try {
      console.log('Trying fallback IPFS gateway for:', { cid: req.params.cid });
      const fallbackResponse = await axios.get(`https://ipfs.io/ipfs/${req.params.cid}`, {
        responseType: 'arraybuffer'
      });

      console.log('Fallback gateway successful, sending data');
      res.set('Content-Type', 'application/octet-stream');
      res.send(fallbackResponse.data);
      return;
    } catch (fallbackError: any) {
      console.error('Fallback gateway also failed:', 
        fallbackError.message || 'Unknown error with fallback gateway');
    }

    // Detailed error logging
    if (error.response) {
      console.error('Gateway error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers
      });
      
      // Handle specific error types
      if (error.response.status === 404) {
        return res.status(404).json({
          error: 'File not found on IPFS',
          code: 'IPFS_FILE_NOT_FOUND',
          cid: req.params.cid,
          userMessage: 'The requested file could not be found on IPFS. It may have been removed or was never uploaded.'
        });
      } else if (error.response.status === 401 || error.response.status === 403) {
        return res.status(error.response.status).json({
          error: 'Authentication failed with IPFS gateway',
          code: 'IPFS_AUTH_ERROR',
          userMessage: 'Could not authenticate with IPFS storage. Please try again later.'
        });
      }
    }

    res.status(500).json({
      error: 'Failed to fetch from IPFS',
      code: 'IPFS_FETCH_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
      userMessage: 'There was a problem retrieving the file. Please try again later.'
    });
  }
});

export default router;