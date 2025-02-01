import { Express } from "express";
import { createServer } from "http";
import feedRoutes from './feed';
import metadataRoutes from './metadata';
import userRoutes from './users';

export function registerRoutes(app: Express) {
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

  const server = createServer(app);
  return server;
}