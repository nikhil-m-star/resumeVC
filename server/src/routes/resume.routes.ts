import { Router } from 'express';
import {
    createResume,
    getResumeVersions,
    createVersion,
    getDiff,
    getUserResumes,
    getResumeById,
    updateResume,
    deleteResume,
    getResumeCompanyTypes,
    getUserResumeCompanyTypes,
} from '../controllers/resume.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Routes
router.post('/', authenticate, createResume);
router.get('/', authenticate, getUserResumes);
router.get('/diff', authenticate, getDiff);
router.get('/company-types', authenticate, getUserResumeCompanyTypes);
router.get('/:id/company-types', authenticate, getResumeCompanyTypes);
router.get('/:id/versions', authenticate, getResumeVersions);
router.get('/:id', authenticate, getResumeById);
router.put('/:id', authenticate, updateResume);
router.delete('/:id', authenticate, deleteResume);
router.post('/versions', authenticate, createVersion);

export default router;
