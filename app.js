const express = require('express');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Middleware to parse JSON
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((error) => console.error('Error connecting to MongoDB:', error));

// Swagger configuration
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'OLX',
    version: '1.0.0',
    description: 'API documentation for OLX',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const swaggerOptions = {
  swaggerDefinition,
  apis: ['./routes/*.js'], // Adjust path to include all route files for Swagger
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Import routes
const propertyRoutes=require('./routes/propertyRoutes');
const userRoutes = require('./routes/userRoutes');
const cartRoutes = require('./routes/cartRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const showroomRoutes = require('./routes/showroomRoutes');
// Use routes
app.use('/properties',propertyRoutes)
app.use('/users', userRoutes);
app.use('/categories', categoryRoutes);
app.use('/favorites', favoriteRoutes);
app.use('/banners', bannerRoutes);
app.use('/cart', cartRoutes);
app.use('/vehicles', vehicleRoutes);
app.use('/ratings', ratingRoutes);
app.use('/vendors', vendorRoutes);
app.use('/', showroomRoutes);


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
