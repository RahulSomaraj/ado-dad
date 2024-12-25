

// Middleware to check if the user has required role(s)
const rbac = (allowedRoles) => (req, res, next) => {
  try {
    
    const role  = req.role; // Assuming `req.user` is populated from the auth middleware

    if (!role) {
      return res.status(403).json({ error: 'Access denied. User role is missing.' });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: error.message || 'An error occurred during RBAC validation.' });
  }
};

// Middleware to check if the logged-in user is the owner of the resource (for resources owned by the user)
const checkOwnership = (resourceIdField) => (req, res, next) => {
  try {
    const userId = req.user._id.toString(); // Convert user ID to string
    const resourceId =
      req.params[resourceIdField]?.toString() || req.body[resourceIdField]?.toString(); // Convert resource ID to string

    if (!resourceId) {
      return res.status(400).json({ error: `Missing resource identifier: ${resourceIdField}` });
    }

    if (userId !== resourceId) {
      return res.status(403).json({ error: 'Access denied. You can only modify your own resources.' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: error.message || 'An error occurred during ownership validation.' });
  }
};

module.exports = { rbac, checkOwnership };
