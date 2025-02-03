import { Router } from 'express';
import { streamAudio } from '../services/radio';

const router = Router();

router.get('/api/radio/stream/:ipfsHash', streamAudio);

export default router;
