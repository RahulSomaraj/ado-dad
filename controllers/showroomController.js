const Showroom = require('../models/showroom');


// A controller to manage Showroom instances
class ShowroomController {
    constructor() {
        this.showrooms = []; // Array to store showroom instances
    }

    // Add a new showroom
    addShowroom(data) {
        const { image, showroomName, owner, address, panCard, cinNumber } = data;
        const showroom = new Showroom(image, showroomName, owner, address, panCard, cinNumber);

        try {
            showroom.validateDetails();
            this.showrooms.push(showroom);
            return "Showroom added successfully.";
        } catch (error) {
            throw new Error(`Failed to add showroom: ${error.message}`);
        }
    }

    // Get all showrooms
    getAllShowrooms() {
        return this.showrooms.map(showroom => showroom.displayDetails());
    }

    // Find a showroom by name
    findShowroomByName(name) {
        const showroom = this.showrooms.find(s => s.showroomName === name);
        if (!showroom) {
            throw new Error(`Showroom with name '${name}' not found.`);
        }
        return showroom.displayDetails();
    }

    // Delete a showroom by name
    deleteShowroomByName(name) {
        const index = this.showrooms.findIndex(s => s.showroomName === name);
        if (index === -1) {
            throw new Error(`Showroom with name '${name}' not found.`);
        }
        this.showrooms.splice(index, 1);
        return `Showroom '${name}' deleted successfully.`;
    }
}

module.exports = ShowroomController;
