const jwt = require('jsonwebtoken');
const User = require('../models/user'); // Assuming the User model is imported here
const { default: mongoose } = require('mongoose');

// Middleware to authenticate the user based on JWT and include role verification
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Check for malformed token
    const tokenRegex = /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]*$/;
    if (!tokenRegex.test(token)) {
      return res.status(400).json({ error: 'Malformed token.' });
    }

    // Validate presence of JWT secret
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is missing in environment variables.');
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by decoded ID
    const user = await User.findOne({ _id: new mongoose.Types.ObjectId(decoded.userId) });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Attach user information and role to the request
    req.user = user;
    req.role = user.type; // Assuming the role is stored in the `role` field in the User model

    // Optionally check role permissions
    if (req.role !== 'admin' && req.role !== 'user') {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Invalid token.' });
    }
    // General error handling
    return res.status(500).json({ error: error.message || 'An error occurred during authentication.' });
  }
};

module.exports = authMiddleware;
