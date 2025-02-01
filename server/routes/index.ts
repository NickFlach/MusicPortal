import { Express } from "express";
import { createServer } from "http";
import feedRoutes from './feed';
import metadataRoutes from './metadata';

export function registerRoutes(app: Express) {
  // Add a simple health check route
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Register the feed routes
  app.use(feedRoutes);

  // Register the metadata routes
  app.use(metadataRoutes);

  const server = createServer(app);
  return server;
}