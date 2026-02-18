import { Router } from 'express';
import { suggestAISkills, improveAISection } from '../controllers/resume.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Apply auth middleware to all AI routes
router.use(authenticate);

router.post('/suggest', suggestAISkills);
router.post('/improve', improveAISection);

export default router;
