import api from './api';

export const resumeService = {
    // Create a new resume
    createResume: async (data) => {
        const response = await api.post('/resumes', data);
        return response.data;
    },

    // Get all resumes for the current user
    // Note: The backend needs an endpoint for this. 
    // Currently resume.controller.ts has createResume, getResumeVersions, createVersion.
    // We might need to add 'getUserResumes' or similar. 
    // Let's assume GET /resumes returns list for now, or check backend.
    getAllResumes: async () => {
        const response = await api.get('/resumes');
        return response.data;
    },

    // Get specific resume
    getResume: async (id) => {
        const response = await api.get(`/resumes/${id}`);
        return response.data;
    },

    // Update resume (saving current state without versioning)
    updateResume: async (id, content) => {
        // Backend might need an endpoint for updating the "draft" state of a resume
        // For now, we might just be creating versions.
        // Let's assume PUT /resumes/:id updates the metadata or content.
        const response = await api.put(`/resumes/${id}`, content);
        return response.data;
    },

    // Get versions
    getVersions: async (id) => {
        const response = await api.get(`/resumes/${id}/versions`);
        return response.data;
    },

    // Create version (Commit)
    createVersion: async (id, content, commitMsg) => {
        const response = await api.post(`/resumes/versions`, {
            resumeId: id,
            content,
            commitMsg
        });
        return response.data;
    },

    deleteResume: async (id) => {
        await api.delete(`/resumes/${id}`);
    },

    getAllCompanyTypes: async () => {
        const response = await api.get('/resumes/company-types');
        return response.data;
    },

    getResumeCompanyTypes: async (id) => {
        const response = await api.get(`/resumes/${id}/company-types`);
        return response.data;
    },

    getRecommendationCategories: async () => {
        const response = await api.get('/ai/recommendation-categories');
        return response.data;
    },

    getResumeRecommendation: async ({ targetCompany, targetCategory }) => {
        const response = await api.post('/ai/recommend-resume', {
            targetCompany,
            targetCategory,
        });
        return response.data;
    },

    generateSampleResume: async (category) => {
        const response = await api.post('/ai/generate-sample', { category });
        return response.data;
    },
};
