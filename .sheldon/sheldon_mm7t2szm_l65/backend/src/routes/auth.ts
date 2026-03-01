const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const { logger } = require('../utils/logger');

const authRoutes = Router();

// Register
authRoutes.post('/register', async (req, res, next) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await User.create({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role: 'user',
            isActive: true
        });
        logger.info(`New user registered: ${email}`);
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'supersecretkey',
            { expiresIn: '24h' }
        );
        res.status(201).json({
            message: 'User created successfully',
            token,
            user: await user.toResponseObject()
        });
    } catch (error) {
        next(error);
    }
});

// Login
authRoutes.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        logger.info(`User logged in: ${email}`);
        user.lastLoginAt = new Date();
        await user.save();
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'supersecretkey',
            { expiresIn: '24h' }
        );
        res.json({
            token,
            user: await user.toResponseObject()
        });
    } catch (error) {
        next(error);
    }
});

module.exports = { authRoutes };
