import { Link } from "react-router-dom"
import { ArrowRight, FileText, GitBranch, Sparkles } from "lucide-react"

const features = [
    {
        title: "Git-Style History",
        description: "Track every change with detailed commit messages and diffs.",
        icon: GitBranch,
    },
    {
        title: "Rich Editor",
        description: "Drag-and-drop sections with real-time preview and export.",
        icon: FileText,
    },
    {
        title: "AI Assistant",
        description: "Get smart suggestions to beat ATS and impress recruiters.",
        icon: Sparkles,
    },
]

export default function Home() {
    return (
        <div className="home-layout">
            <div className="home-ambient home-ambient-left" />
            <div className="home-ambient home-ambient-right" />
            <div className="home-noise" />
            <div className="home-hero-shell">
                <p className="home-badge">Ship Better Resumes</p>
                <div className="home-hero">
                    <h1 className="home-title">
                        <span className="home-title-line">Resume Version Control</span>
                        <span className="home-title-line">for Elite Engineers</span>
                    </h1>
                    <p className="home-subtitle">
                        Treat your career like code. Branch, commit, and deploy your resume with AI-powered insights.
                    </p>
                </div>

                <div className="home-actions">
                    <Link to="/register">
                        <button className="btn btn-default btn-lg">
                            Get Started <ArrowRight className="icon-sm ml-2" />
                        </button>
                    </Link>
                    <Link to="/editor/demo">
                        <button className="btn btn-outline btn-lg">
                            Live Demo
                        </button>
                    </Link>
                </div>
            </div>

            <div className="feature-grid">
                {features.map((feature) => {
                    const Icon = feature.icon
                    return (
                        <div key={feature.title} className="feature-card">
                            <Icon className="feature-icon" />
                            <h3 className="feature-title">{feature.title}</h3>
                            <p className="feature-desc">{feature.description}</p>
                        </div>
                    )
                })}
            </div>
        </div>
    )

}
