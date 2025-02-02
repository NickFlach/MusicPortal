import { Express } from "express";
import { createServer } from "http";
import feedRoutes from './feed';
import metadataRoutes from './metadata';
import userRoutes from './users';
import roomRoutes from './rooms';
import { ListeningRoomService } from '../services/websocket';

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

export function registerRoutes(app: Express) {
  // Apply auth middleware to all API routes
  app.use('/api', authMiddleware);

  // Health check route
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Register the routes
  app.use('/api', roomRoutes);
  app.use('/api', feedRoutes);
  app.use('/api', metadataRoutes);
  app.use('/api', userRoutes);

  // Handle 404 for non-existent API routes
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  const server = createServer(app);

  // Initialize WebSocket service
  new ListeningRoomService(server);

  return server;
}