const mongoose = require('mongoose');

// Define Vehicle Schema
const vehicleSchema = new mongoose.Schema({
  image: {
    type: String,
    required: [true, 'Image URL is required.'],
    validate: {
      validator: function (v) {
        return /^https?:\/\/.*\.(jpg|jpeg|png|webp|avif|gif|svg)$/.test(v);
      },
      message: props => `${props.value} is not a valid image URL!`
    }
  },
  name: {
    type: String,
    required: [true, 'Vehicle name is required.']
  },
  brand: {
    type: String,
    required: [true, 'Brand is required.']
  },
  fuelType: {
    type: String,
    enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'],
    required: [true, 'Fuel type is required.']
  },
  details: {
    modelYear: {
      type: Number,
      required: [true, 'Model year is required.'],
      min: [1900, 'Year must be later than 1900.'],
      max: [new Date().getFullYear(), 'Year cannot be in the future.']
    },
    month: {
      type: String,
      required: [true, 'Month is required.']
    },
    kilometersDriven: {
      type: Number,
      required: [true, 'Kilometers driven is required.'],
      min: [0, 'Kilometers driven cannot be negative.']
    },
    mileage: {
      type: String,
      required: [true, 'Mileage is required.']
    }
  },
  additionalInfo: {
    abs: { type: Boolean },
    accidental: { type: Boolean },
    adjustableExternalMirror: { type: Boolean },
    adjustableSteering: { type: Boolean },
    airConditioning: { type: Boolean },
    numberOfAirbags: { type: Number, min: 0 },
    alloyWheels: { type: Boolean },
    auxCompatibility: { type: Boolean },
    batteryCondition: { type: String },
    bluetooth: { type: Boolean },
    vehicleCertified: { type: Boolean },
    color: { type: String },
    cruiseControl: { type: Boolean },
    insuranceType: {
      type: String,
      enum: ['Comprehensive', 'Third-Party', 'None']
    },
    lockSystem: { type: Boolean },
    makeMonth: { type: String },
    navigationSystem: { type: Boolean },
    parkingSensors: { type: Boolean },
    powerSteering: { type: Boolean },
    powerWindows: { type: Boolean },
    amFmRadio: { type: Boolean },
    rearParkingCamera: { type: Boolean },
    registrationPlace: { type: String },
    exchange: { type: Boolean },
    finance: { type: Boolean },
    serviceHistory: { type: Boolean },
    sunroof: { type: Boolean },
    tyreCondition: { type: String },
    usbCompatibility: { type: Boolean },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor is required.'],
    },
  }
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
module.exports = Vehicle;
