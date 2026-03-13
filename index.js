const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit')
require('dotenv').config();

const PORT = process.env.PORT || 4000;

const app = express();

app.use(helmet())

const DB_URI = process.env.NODE_ENV === 'production'
    ? process.env.PROD_DB_URI
    : process.env.DEV_DB_URI;
mongoose.connect(DB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const teamsRoutes = require('./routes/teamsRoutes')
const adminRoutes = require('./routes/adminRoutes')
const leagueRoutes = require('./routes/leagueRoutes')

const allowedOrigins = process.env.NODE_ENV === 'production' ? [process.env.FRONTEND_URL] : ['http://localhost:3000'];
app.use(cors({ origin: allowedOrigins }));


app.use(express.json());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: {
        error: 'Too many requests from this IP, try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(limiter)


app.use('/api/teams', teamsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/leagues', leagueRoutes);

app.get('/', (req, res) => {
    res.send('March madness backend up and running!')
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
});