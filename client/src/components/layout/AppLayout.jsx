import { Link, Outlet, useNavigate } from "react-router-dom"
import { useUser as useClerkUser } from "@clerk/clerk-react"
import { ModeToggle } from "@/components/mode-toggle"
import { Terminal, Github, LogOut } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function AppLayout() {
    const { user, logout } = useAuth()
    const { user: clerkUser } = useClerkUser()
    const navigate = useNavigate()
    const clerkEmail = clerkUser?.primaryEmailAddress?.emailAddress || clerkUser?.emailAddresses?.[0]?.emailAddress || ""
    const displayEmail = user?.authProvider === 'clerk' ? (clerkEmail || user?.email || '') : (user?.email || '')

    const handleLogout = async () => {
        await logout()
        navigate("/login")
    }

    return (
        <div className="app-layout">
            <header className="app-header">
                <div className="header-container">
                    <div className="nav-links">
                        <Link to="/" className="logo-link">
                            <Terminal className="icon-md" />
                            <span className="font-bold">ResumeForge</span>
                        </Link>
                        <nav className="layout-nav">
                            <Link to="/dashboard" className="nav-item">
                                Dashboard
                            </Link>
                            <Link to="/editor" className="nav-item">
                                Editor
                            </Link>
                            <Link to="/profile" className="nav-item">
                                Profile
                            </Link>
                            <Link to="/recommendations" className="nav-item">
                                Recommendations
                            </Link>
                        </nav>
                    </div>
                    <div className="header-actions">
                        <nav className="layout-nav-actions">
                            <Link to="https://github.com" target="_blank" rel="noreferrer" className="github-link">
                                <Button variant="ghost" size="icon" className="btn-icon">
                                    <Github className="icon-sm" />
                                    <span className="sr-only">GitHub</span>
                                </Button>
                            </Link>
                            <ModeToggle />

                            {user ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="avatar-trigger">
                                            <Avatar className="avatar-shell">
                                                <AvatarFallback>{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                                            </Avatar>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="user-menu-content" align="end" forceMount>
                                        <DropdownMenuLabel className="user-menu-label">
                                            <div className="user-menu-meta">
                                                <p className="user-menu-name">{user.name || 'User'}</p>
                                                <p className="user-menu-email">{displayEmail}</p>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                                            Dashboard
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => navigate('/editor')}>
                                            Editor
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => navigate('/profile')}>
                                            Profile
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => navigate('/recommendations')}>
                                            Recommendations
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={handleLogout} className="logout-item">
                                            <LogOut className="icon-sm mr-2" />
                                            <span>Log out</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <div className="auth-actions">
                                    <Link to="/login">
                                        <Button variant="ghost" size="sm">Log in</Button>
                                    </Link>
                                    <Link to="/register">
                                        <Button size="sm">Sign up</Button>
                                    </Link>
                                </div>
                            )}
                        </nav>
                    </div>
                </div>
            </header>
            <main className="flex-1">
                <Outlet />
            </main>
        </div>
    )
}
