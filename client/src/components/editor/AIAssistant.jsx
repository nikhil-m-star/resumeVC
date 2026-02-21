import { useState } from 'react';
import { Sparkles, Loader2, Wand2, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import api from '@/services/api';

export default function AIAssistant({ content, onApply, type = 'summary' }) {
    const [loading, setLoading] = useState(false);
    const [suggestion, setSuggestion] = useState(null);
    const [error, setError] = useState(null);

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.post('/ai/improve', { text: content, type });
            if (!data?.data?.improvedText) {
                throw new Error('No suggestion returned');
            }
            setSuggestion(data.data.improvedText);
        } catch (err) {
            const message = err?.response?.data?.message || err?.message || 'Failed to generate suggestion';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = () => {
        onApply(suggestion);
        setSuggestion(null);
    };

    return (
        <div className="ai-container">
            <div className="ai-header">
                <h3 className="ai-title">
                    <Sparkles className="ai-icon" />
                    AI Assistant
                </h3>
                {!suggestion && (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleGenerate}
                        disabled={loading}
                        className="ai-improve-btn"
                    >
                        {loading ? (
                            <><Loader2 className="icon-xs animate-spin mr-2" /> Thinking...</>
                        ) : (
                            <><Wand2 className="icon-xs mr-2" /> Improve</>
                        )}
                    </Button>
                )}
            </div>

            {error && (
                <div className="ai-error">
                    {error}
                </div>
            )}

            {suggestion && (
                <div className="ai-suggestion">
                    <div className="ai-suggestion-text">
                        {suggestion}
                    </div>
                    <div className="ai-actions">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSuggestion(null)}
                        >
                            Discard
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleApply}
                            className="btn-ai"
                        >
                            <Check className="icon-xs mr-2" /> Apply
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
