// rbacMiddleware.js

const jwt = require('jsonwebtoken'); // Assuming you're using JWT for authentication

// Middleware to check if the user has required role(s)
const rbac = (allowedRoles) => (req, res, next) => {
  const { role } = req.user; // Assuming `req.user` is populated from the auth middleware

  if (!allowedRoles.includes(role)) {
    return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
  }

  next();
};

// Middleware to check if the logged-in user is the owner of the resource (for resources owned by the user)
const checkOwnership = (resourceIdField) => (req, res, next) => {
  const userId = req.user.id; // Logged-in user id from JWT
  const resourceId = req.params[resourceIdField] || req.body[resourceIdField]; // The resource ID should come from URL params or body

  if (userId !== resourceId) {
    return res.status(403).json({ error: 'Access denied. You can only modify your own resources.' });
  }

  next();
};

module.exports = { rbac, checkOwnership };
