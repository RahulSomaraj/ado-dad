import { Schema, Document } from 'mongoose';

// Helper function for image array limit validation
function arrayLimit(val) {
  return val.length <= 5;
}

export const PropertySchema = new Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
  },
  area: {
    type: Number, // Area in square feet
    required: [true, 'Area is required'],
    min: [0, 'Area cannot be negative'],
  },
  images: {
    type: [String], // Array of image URLs
    validate: [arrayLimit, '{PATH} exceeds the limit of 5 images'],
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: [true, 'Owner is required'],
  },
  type: {
    type: String,
    enum: ['house', 'apartment', 'shopAndOffice', 'pgAndGuestHouse', 'land'],
    required: [true, 'Type is required'],
  },
  category: {
    type: String,
    enum: ['forSale', 'forRent', 'landsAndPlots'],
    required: [true, 'Category is required'],
  },
  bhk: {
    type: Number,
    required: function () {
      return ['house', 'apartment', 'pgAndGuestHouse'].includes(this.type);
    },
    min: [1, 'BHK must be at least 1'],
  },
  bathrooms: {
    type: Number,
    required: function () {
      return ['house', 'apartment', 'pgAndGuestHouse'].includes(this.type);
    },
    min: [1, 'Bathrooms must be at least 1'],
  },
  furnished: {
    type: String,
    enum: ['Furnished', 'Semi-Furnished', 'Unfurnished'],
    required: function () {
      return ['house', 'apartment', 'pgAndGuestHouse'].includes(this.type);
    },
  },
  projectStatus: {
    type: String,
    enum: ['Under Construction', 'Ready to Move', 'Resale'],
    required: function () {
      return this.type !== 'land';
    },
  },
  maintenanceCost: {
    type: Number,
    default: 0,
  },
  totalFloors: {
    type: Number,
    required: function () {
      return ['house', 'apartment', 'pgAndGuestHouse'].includes(this.type);
    },
    min: [1, 'Total floors must be at least 1'],
  },
  floorNo: {
    type: Number,
    required: function () {
      return ['house', 'apartment', 'pgAndGuestHouse'].includes(this.type);
    },
    min: [0, 'Floor number cannot be negative'],
  },
  carParking: {
    type: Number,
    default: 0,
    min: [0, 'Car parking must be at least 0'],
  },
  facing: {
    type: String,
    enum: ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'],
  },
  listedBy: {
    type: String,
    enum: ['Owner', 'Dealer', 'Builder'],
    required: [true, 'Listed by is required'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Interface for Property document
export interface Property extends Document {
  title: string;
  description: string;
  price: number;
  location: string;
  area: number;
  images: string[];
  owner: string;
  type: string;
  category: string;
  bhk: number;
  bathrooms: number;
  furnished: string;
  projectStatus: string;
  maintenanceCost: number;
  totalFloors: number;
  floorNo: number;
  carParking: number;
  facing: string;
  listedBy: string;
  createdAt: Date;
}

// PropertyDocument is the type of the Mongoose document, combining the interface and Mongoose's Document
export type PropertyDocument = Property & Document;


