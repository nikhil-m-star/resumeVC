export default function GoogleButtonContent({ label }) {
    return (
        <span className="flex items-center justify-center gap-3">
            <svg aria-hidden="true" viewBox="0 0 48 48" className="icon-md" style={{ flexShrink: 0 }}>
                <path fill="#EA4335" d="M24 9.5c3.2 0 6 .9 8.2 2.8l6.1-6.1C34.6 2.9 29.8 1 24 1 14.7 1 6.7 6.4 2.8 14.2l7.5 5.8C12.2 13.8 17.6 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v7.8h12.9c-.3 1.9-1.8 4.7-5.1 6.6l7.8 6c4.5-4.2 6.9-10.3 6.9-16.3z" />
                <path fill="#FBBC05" d="M10.3 28c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.5-5.8C1 16.4 0 19.8 0 23.4s1 7 2.8 10.4l7.5-5.8z" />
                <path fill="#34A853" d="M24 47c6.5 0 11.9-2.1 15.8-5.8l-7.8-6c-2.1 1.5-4.8 2.5-8 2.5-6.4 0-11.8-4.3-13.7-10.2l-7.5 5.8C6.7 41.6 14.7 47 24 47z" />
            </svg>
            <span className="font-semibold">{label}</span>
        </span>
    );
}
