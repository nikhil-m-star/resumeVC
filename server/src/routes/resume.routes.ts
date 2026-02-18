import { Router } from 'express';
import { createResume, getResumeVersions, createVersion, getDiff, getUserResumes, getResumeById, updateResume, deleteResume } from '../controllers/resume.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Routes
router.post('/', authenticate, createResume);
router.get('/', authenticate, getUserResumes);
router.get('/diff', authenticate, getDiff);
router.get('/:id', authenticate, getResumeById);
router.put('/:id', authenticate, updateResume);
router.delete('/:id', authenticate, deleteResume);
router.get('/:id/versions', authenticate, getResumeVersions);
router.post('/versions', authenticate, createVersion);

export default router;
