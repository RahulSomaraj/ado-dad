const jwt = require('jsonwebtoken');
const Vendor = require('../models/vendor'); // Assuming the vendor model is imported here

// Middleware to authenticate the user based on JWT
const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', ''); // Get token from Authorization header

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Replace JWT_SECRET with your secret key
    const vendor = await Vendor.findById(decoded.id); // Find user by decoded ID

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found.' });
    }

    // Attach user information to the request
    req.user = vendor; // Add the vendor object to the request

    next(); // Continue to the next middleware or route handler
  } catch (error) {
    return res.status(400).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = authMiddleware;
