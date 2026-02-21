export const mockResume = {
    id: "1",
    title: "Senior Full Stack Engineer",
    sections: [
        {
            id: "personal",
            title: "Personal Details",
            type: "personal",
            content: {
                name: "Alex Dev",
                email: "alex@example.com",
                phone: "+1 234 567 890",
                location: "San Francisco, CA",
                linkedin: "linkedin.com/in/alexdev",
                website: "alexdev.dev",
            }
        },
        {
            id: "summary",
            title: "Professional Summary",
            type: "text",
            content: "<p>Experienced Full Stack Engineer with 8+ years of expertise in building scalable web applications.</p>"
        },
        {
            id: "experience",
            title: "Experience",
            type: "list",
            content: [
                {
                    id: "exp-1",
                    title: "Senior Full Stack Engineer",
                    subtitle: "Tech Corp",
                    date: "2020 - Present",
                    location: "Remote",
                    description: "- Led migration to microservices.\n- Improved page performance by 40%."
                }
            ]
        },
        {
            id: "projects",
            title: "Projects",
            type: "list",
            content: [
                {
                    id: "proj-1",
                    title: "Realtime Analytics Dashboard",
                    subtitle: "React, Node.js, PostgreSQL",
                    date: "2024",
                    link: "github.com/alexdev/analytics-dashboard",
                    description: "- Built a multi-tenant analytics platform.\n- Implemented role-based access and export workflows."
                }
            ]
        },
        {
            id: "achievements",
            title: "Achievements",
            type: "list",
            content: [
                {
                    id: "ach-1",
                    title: "Employee of the Year",
                    subtitle: "Tech Corp",
                    date: "2023",
                    description: "- Recognized for leading a high-impact migration project."
                }
            ]
        },
        {
            id: "education",
            title: "Education",
            type: "list",
            content: [
                {
                    id: "edu-1",
                    title: "B.S. Computer Science",
                    subtitle: "University of California, Berkeley",
                    date: "2012 - 2016",
                    location: "Berkeley, CA",
                    description: "- Relevant coursework: Distributed Systems, Databases."
                }
            ]
        }
    ]
}
