const mongoose = require("mongoose");

const showroomSchema = new mongoose.Schema(
    {
        image: {
            type: String,
            required: [true, "Image URL is required"],
        },
        showroomName: {
            type: String,
            required: [true, "Showroom name is required"],
        },
        owner: {
            type: String,
            required: [true, "Owner name is required"],
        },
        address: {
            type: String,
            required: [true, "Address is required"],
        },
        panCard: {
            type: String,
            required: [true, "PAN Card number is required"],
            match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN Card format"],
        },
        cinNumber: {
            type: String,
            required: [true, "CIN Number is required"],
            match: [/^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{1}$/, "Invalid CIN Number format"],
        },
    },
    {
        timestamps: true,
    }
);

const Showroom = mongoose.model("Showroom", showroomSchema);

module.exports = Showroom;
