const mongoose = require('mongoose');

// Define Vehicle Company Schema
const vehicleCompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required.'],
  },
  originCountry: {
    type: String,
    required: [true, 'Origin country is required.'],
  },
  logo: {
    type: String,
    required: [true, 'Logo URL is required.'],
    validate: {
      validator: function (v) {
        return /^https?:\/\/.*\.(jpg|jpeg|png|webp|avif|gif|svg)$/.test(v);
      },
      message: props => `${props.value} is not a valid logo URL!`
    }
  }
}, {
  timestamps: true,
});

const VehicleCompany = mongoose.model('VehicleCompany', vehicleCompanySchema);
module.exports = VehicleCompany;
