import { Router } from 'express';
import {
    suggestAISkills,
    improveAISection,
    recommendResumeVersion,
    getRecommendationCategories,
    generateSampleResume,
} from '../controllers/resume.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Apply auth middleware to all AI routes
router.use(authenticate);

router.post('/suggest', suggestAISkills);
router.post('/improve', improveAISection);
router.post('/recommend-resume', recommendResumeVersion);
router.post('/generate-sample', generateSampleResume);
router.get('/recommendation-categories', getRecommendationCategories);

export default router;
