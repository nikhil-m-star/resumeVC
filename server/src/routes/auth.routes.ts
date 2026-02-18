import { Router } from 'express';
import { login, register, refreshToken, logout, clerkExchange } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.post('/clerk-exchange', clerkExchange);

export default router;
