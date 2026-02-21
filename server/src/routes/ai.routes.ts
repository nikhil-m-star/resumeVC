import { Router } from 'express';
import { suggestAISkills, improveAISection } from '../controllers/resume.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Apply auth middleware to all AI routes
router.use(authenticate);

router.post('/suggest', suggestAISkills);
router.post('/improve', improveAISection);

export default router;
