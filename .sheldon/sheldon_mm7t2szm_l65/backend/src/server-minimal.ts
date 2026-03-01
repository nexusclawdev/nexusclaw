const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createConnection } = require('./database/index');
const { logger } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('--- RE-TESTING STABLE MINIMAL ---');

createConnection().then(() => {
    console.log('DB OK');
}).catch(err => {
    console.error('DB FAIL', err);
});

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

app.listen(PORT, () => {
    console.log(`Stable minimal running on port ${PORT}`);
});
