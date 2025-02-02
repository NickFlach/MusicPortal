import { Express } from "express";
import { createServer } from "http";
import feedRoutes from './feed';
import metadataRoutes from './metadata';
import userRoutes from './users';

// Middleware to check for internal token or user authentication
const authMiddleware = (req: any, res: any, next: any) => {
  const internalToken = req.headers['x-internal-token'];

  // Allow internal access from landing page
  if (internalToken === 'landing-page') {
    return next();
  }

  // Otherwise require wallet address
  if (!req.body?.address) {
    return res.status(400).json({ message: "Wallet address is required" });
  }

  next();
};

let server: any = null;

export function registerRoutes(app: Express) {
  // Apply auth middleware to all API routes
  app.use('/api', authMiddleware);

  // Health check route
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Register the feed routes
  app.use(feedRoutes);

  // Register the metadata routes
  app.use(metadataRoutes);

  // Register the user routes
  app.use(userRoutes);

  // Handle 404 for non-existent API routes
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Cleanup old server if it exists
  if (server) {
    server.close();
  }

  // Create new server
  server = createServer(app);

  // Error handling for server
  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      console.error('Port 5000 is in use, retrying...');
      setTimeout(() => {
        server.close();
        server.listen(5000, '0.0.0.0');
      }, 1000);
    }
  });

  return server;
}