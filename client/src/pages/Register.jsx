import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useSignUp } from '@clerk/clerk-react';
import GoogleButtonContent from '@/components/auth/GoogleButtonContent';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const { user, loading: authLoading, register, socialAuthError } = useAuth();
    const { isLoaded: signUpLoaded, signUp } = useSignUp();
    const navigate = useNavigate();

    useEffect(() => {
        if (!authLoading && user) {
            navigate('/dashboard', { replace: true });
        }
    }, [authLoading, user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register(email, password, name);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to register');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignUp = async () => {
        if (!signUpLoaded || !signUp) return;

        setError('');
        setGoogleLoading(true);
        try {
            await signUp.authenticateWithRedirect({
                strategy: 'oauth_google',
                redirectUrl: '/sso-callback',
                redirectUrlComplete: '/dashboard',
            });
        } catch (err) {
            setError(err?.errors?.[0]?.longMessage || 'Failed to start Google signup');
            setGoogleLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-content">
                <div className="auth-header">
                    <h2 className="auth-title">Create an account</h2>
                    <p className="auth-subtitle">Start building your career with ResumeForge</p>
                </div>

                <div className="auth-card">
                    <div className="form-group">
                        <button
                            type="button"
                            className="btn btn-social w-full"
                            onClick={handleGoogleSignUp}
                            disabled={!signUpLoaded || googleLoading}
                        >
                            {googleLoading ? <Loader2 className="icon-sm animate-spin mr-2" /> : null}
                            <GoogleButtonContent label="Sign up with Google" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        {socialAuthError && <div className="error-banner">{socialAuthError}</div>}
                        {error && <div className="error-banner">{error}</div>}

                        <div className="form-group">
                            <label htmlFor="name" className="form-label">Full Name</label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                autoComplete="name"
                                required
                                className="input"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email" className="form-label">Email address</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="input"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password" className="form-label">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                className="input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <button type="submit" disabled={loading} className="btn btn-default w-full">
                                {loading ? (
                                    <Loader2 className="icon-sm animate-spin mr-2" />
                                ) : (
                                    <>
                                        Sign up <ArrowRight className="icon-sm ml-2" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <p className="auth-footer">
                        Already have an account?{' '}
                        <Link to="/login" className="auth-link">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
