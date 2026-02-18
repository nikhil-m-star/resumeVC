import 'dotenv/config';
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required. Set your Neon Postgres connection string in server/.env.');
}

const { default: app } = await import('./app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
