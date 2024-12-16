const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  image: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  brand: {
    type: String,
    required: true,
  },
  fuelType: {
    type: String,
    enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'],
    required: true,
  },
  details: {
    modelYear: {
      type: Number,
      required: true,
    },
    month: {
      type: String,
      required: true,
    },
    kilometersDriven: {
      type: Number,
      required: true,
    },
    mileage: {
      type: String,
      required: true,
    },
  },
  additionalInfo: {
    abs: {
      type: Boolean,
      required: true,
    },
    accidental: {
      type: Boolean,
      required: true,
    },
    adjustableExternalMirror: {
      type: Boolean,
      required: true,
    },
    adjustableSteering: {
      type: Boolean,
      required: true,
    },
    airConditioning: {
      type: Boolean,
      required: true,
    },
    numberOfAirbags: {
      type: Number,
      required: true,
    },
    alloyWheels: {
      type: Boolean,
      required: true,
    },
    auxCompatibility: {
      type: Boolean,
      required: true,
    },
    batteryCondition: {
      type: String,
      required: true,
    },
    bluetooth: {
      type: Boolean,
      required: true,
    },
    vehicleCertified: {
      type: Boolean,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    cruiseControl: {
      type: Boolean,
      required: true,
    },
    insuranceType: {
      type: String,
      enum: ['Comprehensive', 'Third-Party', 'None'],
      required: true,
    },
    lockSystem: {
      type: Boolean,
      required: true,
    },
    makeMonth: {
      type: String,
      required: true,
    },
    navigationSystem: {
      type: Boolean,
      required: true,
    },
    parkingSensors: {
      type: Boolean,
      required: true,
    },
    powerSteering: {
      type: Boolean,
      required: true,
    },
    powerWindows: {
      type: Boolean,
      required: true,
    },
    amFmRadio: {
      type: Boolean,
      required: true,
    },
    rearParkingCamera: {
      type: Boolean,
      required: true,
    },
    registrationPlace: {
      type: String,
      required: true,
    },
    exchange: {
      type: Boolean,
      required: true,
    },
    finance: {
      type: Boolean,
      required: true,
    },
    serviceHistory: {
      type: Boolean,
      required: true,
    },
    sunroof: {
      type: Boolean,
      required: true,
    },
    tyreCondition: {
      type: String,
      required: true,
    },
    usbCompatibility: {
      type: Boolean,
      required: true,
    },
  },
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

module.exports = Vehicle;
