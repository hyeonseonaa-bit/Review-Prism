import 'dotenv/config';
import express from 'express';
import handler from './api/analyze.js';

const app = express();
app.use(express.json());
app.post('/api/analyze', handler);

app.listen(3001, () => console.log('API server running on http://localhost:3001'));
