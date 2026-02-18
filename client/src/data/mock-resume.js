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
                linkedin: "linkedin.com/in/alexdev",
                github: "github.com/alexdev",
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
            items: [
                {
                    id: "exp-1",
                    title: "Senior Software Engineer",
                    company: "Tech Corp",
                    date: "2020 - Present",
                    description: "<ul><li>Led migration to microservices.</li><li>Improved performance by 40%.</li></ul>"
                }
            ]
        }
    ]
}
