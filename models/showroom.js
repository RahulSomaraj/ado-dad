class Showroom {
    constructor(image, showroomName, owner, address, panCard, cinNumber) {
        this.image = image; // URL or path to the showroom's image
        this.showroomName = showroomName; // Name of the showroom
        this.owner = owner; // Owner's name
        this.address = address; // Address of the showroom
        this.panCard = panCard; // PAN Card number
        this.cinNumber = cinNumber; // CIN (Corporate Identification Number)
    }

    // Display showroom details
    displayDetails() {
        return `
        Showroom Name: ${this.showroomName}
        Owner: ${this.owner}
        Address: ${this.address}
        PAN Card: ${this.panCard}
        CIN Number: ${this.cinNumber}
        Image URL: ${this.image}
        `;
    }

    // To validate essential details
    validateDetails() {
        if (!this.image || !this.showroomName || !this.owner || !this.address || !this.panCard || !this.cinNumber) {
            throw new Error("All fields are required to create a showroom.");
        }
        return true;
    }
}


try {
    myShowroom.validateDetails();
    console.log(myShowroom.displayDetails());
} catch (error) {
    console.error(error.message);
}

module.exports = Showroom;
