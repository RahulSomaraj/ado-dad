const express = require("express");
const router = express.Router();

// Import routes
const authRoutes = require("./authRoutes");
const propertyRoutes = require("./propertyRoutes");
const userRoutes = require("./userRoutes");
const cartRoutes = require("./cartRoutes");
const vehicleRoutes = require("./vehicleRoutes");
const ratingRoutes = require("./ratingRoutes");
const vendorRoutes = require("./vendorRoutes");
const bannerRoutes = require("./bannerRoutes");
const categoryRoutes = require("./categoryRoutes");
const favoriteRoutes = require("./favoriteRoutes");
const showroomRoutes = require("./showroomRoutes");
const vehicleCompanyRoutes = require("./vehicleCompanyRoutes");
const advertisementRoutes = require("./advertisementRoutes");

// Use routes
router.use("/auth", authRoutes);
router.use("/advertisements", advertisementRoutes);
router.use("/properties", propertyRoutes);
router.use("/users", userRoutes);
router.use("/categories", categoryRoutes);
router.use("/favorites", favoriteRoutes);
router.use("/banners", bannerRoutes);
router.use("/cart", cartRoutes);
router.use("/vehicles", vehicleRoutes);
router.use("/ratings", ratingRoutes);
router.use("/vendors", vendorRoutes);
router.use("/showroom", showroomRoutes);
router.use("/vehicle-companies", vehicleCompanyRoutes);

// Use routes

module.exports = router;
