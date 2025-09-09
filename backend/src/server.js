require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const driversRoutes = require('./routes/drivers.routes');
const vehiclesRoutes = require('./routes/vehicles.routes');
const ridesRoutes = require('./routes/rides.routes');
const paymentsRoutes = require('./routes/payments.routes');
const parcelsRoutes = require('./routes/parcels.routes');

const errorMiddleware = require('./middlewares/error.middleware');

const app = express();
connectDB();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/rides', ridesRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/parcels', parcelsRoutes);

// health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// error handler (last)
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));

