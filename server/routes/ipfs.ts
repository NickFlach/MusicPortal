import { Router } from 'express';
import multer from 'multer';
import axios from 'axios';
import { ipfsConnectionManager } from '../services/ipfs-connection';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Add a health check route for IPFS connectivity
router.get('/health', async (req, res) => {
  try {
    // Get connection status from manager
    const connectionStatus = ipfsConnectionManager.getStatus();
    const credentials = ipfsConnectionManager.getCredentials();
    
    // Check if we're in fallback mode
    if (credentials.usePublicGateways) {
      return res.json({
        status: 'partial',
        message: 'Using public IPFS gateways (no Pinata authentication)',
        fallbackMode: true,
        publicGateways: true,
        customGateway: 'blush-adjacent-octopus-823.mypinata.cloud',
        connectionStatus
      });
    }
    
    // Check if credentials are set
    if (!credentials.apiKey || !credentials.apiSecret) {
      return res.status(500).json({
        status: 'error',
        message: 'Pinata credentials are not configured',
        hasApiKey: !!credentials.apiKey,
        hasApiSecret: !!credentials.apiSecret
      });
    }

    // Test connection to Pinata API
    console.log('Testing Pinata authentication with connection manager');
    
    if (connectionStatus.connected) {
      return res.json({
        status: 'ok',
        message: 'Pinata connection successful',
        authenticated: true,
        lastConnected: connectionStatus.lastConnected,
        connectionStatus
      });
    } else {
      // Force a connection attempt if not connected
      try {
        const response = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
          headers: ipfsConnectionManager.getHeaders()
        });
        
        console.log('Pinata authentication response:', response.data);
        
        // Reinitialize connection manager
        ipfsConnectionManager.initialize();
        
        return res.json({
          status: 'ok',
          message: 'Pinata connection successful',
          authenticated: response.data?.authenticated || false,
          responseData: response.data
        });
      } catch (error) {
        // Type assertion and error handling
        const authError = error as Error & { 
          response?: { 
            data?: any; 
            status?: number;
            statusText?: string;
          } 
        };
        
        const errorMessage = authError.response?.data 
          ? JSON.stringify(authError.response.data)
          : authError.message || String(error);
          
        console.error('Pinata authentication specific error:', errorMessage);
        
        return res.json({
          status: 'partial',
          message: 'Pinata connection successful but authentication failed',
          error: errorMessage,
          authenticated: false,
          connectionStatus
        });
      }
    }
  } catch (error) {
    console.error('Pinata health check error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to connect to Pinata',
      error: error instanceof Error ? error.message : 'Unknown error',
      connectionStatus: ipfsConnectionManager.getStatus()
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

    // Get credentials from connection manager
    const credentials = ipfsConnectionManager.getCredentials();
    
    // Check if we're in fallback mode
    if (credentials.usePublicGateways) {
      console.warn('IPFS upload requested while in fallback mode - uploads may not persist long-term');
      // We'll still try to upload through public gateways, but warn the client
    }
    else if (!credentials.apiKey || !credentials.apiSecret) {
      console.error('Missing Pinata credentials');
      return res.status(500).json({ 
        error: 'Server configuration error: Missing Pinata credentials',
        code: 'PINATA_CREDENTIALS_MISSING',
        userMessage: 'The server is not properly configured for IPFS storage. Please contact the administrator.'
      });
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
            try {
              const parsedMetadata = JSON.parse(req.body.metadata);
              metadata = {...metadata, ...parsedMetadata};
              console.log('Metadata parsed from string:', parsedMetadata);
            } catch (parseError) {
              console.warn('Failed to parse metadata JSON string:', parseError);
              // Still add the string as title if nothing else is available
              if (!metadata.title) {
                metadata.title = req.body.metadata;
              }
            }
          }
        } catch (e) {
          console.warn('Failed to process metadata:', e);
        }
      }
      
      // Check for docMetadata field (added in newer client versions)
      if (req.body.docMetadata) {
        try {
          console.log('Found docMetadata field');
          
          if (typeof req.body.docMetadata === 'object' && req.body.docMetadata !== null) {
            // Extract from blob or direct object
            if (req.body.docMetadata.type === 'application/json') {
              // It's a blob, we need to read it
              console.log('docMetadata appears to be a Blob');
              const text = req.body.docMetadata.toString();
              try {
                const docData = JSON.parse(text);
                metadata = {...metadata, ...docData};
                console.log('Parsed docMetadata from Blob:', docData);
              } catch (blobError) {
                console.warn('Failed to parse docMetadata Blob:', blobError);
              }
            } else {
              // It's a direct object
              metadata = {...metadata, ...req.body.docMetadata};
              console.log('Used docMetadata as object');
            }
          } else if (typeof req.body.docMetadata === 'string') {
            try {
              const docData = JSON.parse(req.body.docMetadata);
              metadata = {...metadata, ...docData};
              console.log('Parsed docMetadata from string:', docData);
            } catch (stringError) {
              console.warn('Failed to parse docMetadata string:', stringError);
            }
          }
        } catch (docError) {
          console.warn('Error processing docMetadata:', docError);
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

    // Get headers from connection manager
    const headers = ipfsConnectionManager.getHeaders();
    
    const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      headers: {
        ...headers,
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

    // Get connection status and credentials from manager
    const connectionStatus = ipfsConnectionManager.getStatus();
    const credentials = ipfsConnectionManager.getCredentials();

    // Get the best gateway URL to use
    const gatewayUrl = ipfsConnectionManager.getGatewayUrl(cid);
    console.log(`Using IPFS gateway: ${gatewayUrl}`);
    
    // Try fetching from gateway
    let response;
    const headers = ipfsConnectionManager.getHeaders();
    if (Object.keys(headers).length > 0) {
      console.log('Using authenticated Pinata gateway');
      response = await axios.get(gatewayUrl, {
        responseType: 'arraybuffer',
        headers: headers
      });
    } else {
      console.log('Using public IPFS gateway');
      response = await axios.get(gatewayUrl, {
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
      const fallbackResponse = await axios.get(`https://blush-adjacent-octopus-823.mypinata.cloud/ipfs/${req.params.cid}`, {
        responseType: 'arraybuffer'
      });

      console.log('Fallback gateway successful, sending data');
      res.set('Content-Type', 'application/octet-stream');
      res.send(fallbackResponse.data);
      return;
    } catch (fallbackError: any) {
      console.error('Primary fallback gateway failed:', 
        fallbackError.message || 'Unknown error with fallback gateway');
      
      // Try another fallback gateway
      try {
        console.log('Trying secondary fallback IPFS gateway for:', { cid: req.params.cid });
        const secondaryFallbackResponse = await axios.get(`https://ipfs.io/ipfs/${req.params.cid}`, {
          responseType: 'arraybuffer'
        });

        console.log('Secondary fallback gateway successful, sending data');
        res.set('Content-Type', 'application/octet-stream');
        res.send(secondaryFallbackResponse.data);
        return;
      } catch (secondaryFallbackError: any) {
        console.error('All fallback gateways failed:', 
          secondaryFallbackError.message || 'Unknown error with secondary fallback gateway');
      }
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