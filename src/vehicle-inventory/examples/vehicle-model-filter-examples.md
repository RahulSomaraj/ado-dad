# Vehicle Model Filtering API Examples

This document provides comprehensive examples for using the vehicle model filtering API at `GET /vehicle-inventory/models`.

## Base URL

```
http://localhost:5000/vehicle-inventory/models
```

## Basic Examples

### 1. Get All Vehicle Models (No Filters)

```bash
GET /vehicle-inventory/models
```

### 2. Search by Model Name

```bash
GET /vehicle-inventory/models?search=swift
```

### 3. Filter by Manufacturer

```bash
GET /vehicle-inventory/models?manufacturerName=Maruti Suzuki
```

### 4. Filter by Vehicle Type

```bash
GET /vehicle-inventory/models?vehicleType=SUV
```

### 5. Filter by Price Range

```bash
GET /vehicle-inventory/models?minPrice=500000&maxPrice=1500000
```

## Advanced Filtering Examples

### 6. Filter by Fuel Type and Transmission

```bash
GET /vehicle-inventory/models?fuelType=Petrol&transmissionType=Automatic
```

### 7. Filter by Engine Capacity

```bash
GET /vehicle-inventory/models?minEngineCapacity=1000&maxEngineCapacity=2000
```

### 8. Filter by Mileage

```bash
GET /vehicle-inventory/models?minMileage=15&maxMileage=25
```

### 9. Filter by Seating Capacity

```bash
GET /vehicle-inventory/models?minSeatingCapacity=5&maxSeatingCapacity=7
```

### 10. Filter by Launch Year

```bash
GET /vehicle-inventory/models?minLaunchYear=2020&maxLaunchYear=2024
```

## Feature-Based Filtering Examples

### 11. Models with Sunroof

```bash
GET /vehicle-inventory/models?hasSunroof=true
```

### 12. Models with Alloy Wheels

```bash
GET /vehicle-inventory/models?hasAlloyWheels=true
```

### 13. Models with Automatic Climate Control

```bash
GET /vehicle-inventory/models?hasAutomaticClimateControl=true
```

### 14. Models with Navigation

```bash
GET /vehicle-inventory/models?hasNavigation=true
```

### 15. Models with Parking Sensors

```bash
GET /vehicle-inventory/models?hasParkingSensors=true
```

### 16. Models with ABS

```bash
GET /vehicle-inventory/models?hasABS=true
```

### 17. Models with Airbags

```bash
GET /vehicle-inventory/models?hasAirbags=true
```

### 18. Models with Leather Seats

```bash
GET /vehicle-inventory/models?hasLeatherSeats=true
```

### 19. Models with LED Headlamps

```bash
GET /vehicle-inventory/models?hasLEDHeadlamps=true
```

### 20. Models with Touchscreen

```bash
GET /vehicle-inventory/models?hasTouchscreen=true
```

### 21. Models with Android Auto

```bash
GET /vehicle-inventory/models?hasAndroidAuto=true
```

### 22. Models with Apple CarPlay

```bash
GET /vehicle-inventory/models?hasAppleCarPlay=true
```

### 23. Models with Wireless Charging

```bash
GET /vehicle-inventory/models?hasWirelessCharging=true
```

### 24. Models with Cruise Control

```bash
GET /vehicle-inventory/models?hasCruiseControl=true
```

### 25. Models with Keyless Entry

```bash
GET /vehicle-inventory/models?hasKeylessEntry=true
```

### 26. Models with Push Button Start

```bash
GET /vehicle-inventory/models?hasPushButtonStart=true
```

### 27. Models with Power Windows

```bash
GET /vehicle-inventory/models?hasPowerWindows=true
```

### 28. Models with Power Steering

```bash
GET /vehicle-inventory/models?hasPowerSteering=true
```

### 29. Models with Central Locking

```bash
GET /vehicle-inventory/models?hasCentralLocking=true
```

### 30. Models with Immobilizer

```bash
GET /vehicle-inventory/models?hasImmobilizer=true
```

### 31. Models with Alarm System

```bash
GET /vehicle-inventory/models?hasAlarmSystem=true
```

### 32. Models with Bluetooth

```bash
GET /vehicle-inventory/models?hasBluetooth=true
```

### 33. Models with USB Charging

```bash
GET /vehicle-inventory/models?hasUSBCharging=true
```

### 34. Models with AM/FM Radio

```bash
GET /vehicle-inventory/models?hasAMFMRadio=true
```

### 35. Models with CD Player

```bash
GET /vehicle-inventory/models?hasCDPlayer=true
```

### 36. Models with AUX Input

```bash
GET /vehicle-inventory/models?hasAUXInput=true
```

### 37. Models with Subwoofer

```bash
GET /vehicle-inventory/models?hasSubwoofer=true
```

### 38. Models with Premium Audio

```bash
GET /vehicle-inventory/models?hasPremiumAudio=true
```

### 39. Models with Digital Instrument Cluster

```bash
GET /vehicle-inventory/models?hasDigitalInstrumentCluster=true
```

### 40. Models with Heads Up Display

```bash
GET /vehicle-inventory/models?hasHeadsUpDisplay=true
```

### 41. Models with Multi Information Display

```bash
GET /vehicle-inventory/models?hasMultiInformationDisplay=true
```

### 42. Models with Rear Entertainment

```bash
GET /vehicle-inventory/models?hasRearEntertainment=true
```

### 43. Models with Parking Camera

```bash
GET /vehicle-inventory/models?hasParkingCamera=true
```

### 44. Models with 360 Degree Camera

```bash
GET /vehicle-inventory/models?has360DegreeCamera=true
```

### 45. Models with Automatic Parking

```bash
GET /vehicle-inventory/models?hasAutomaticParking=true
```

### 46. Models with Sport Mode

```bash
GET /vehicle-inventory/models?hasSportMode=true
```

### 47. Models with Eco Mode

```bash
GET /vehicle-inventory/models?hasEcoMode=true
```

### 48. Models with Paddle Shifters

```bash
GET /vehicle-inventory/models?hasPaddleShifters=true
```

### 49. Models with Launch Control

```bash
GET /vehicle-inventory/models?hasLaunchControl=true
```

### 50. Models with Adaptive Suspension

```bash
GET /vehicle-inventory/models?hasAdaptiveSuspension=true
```

### 51. Models with Sport Suspension

```bash
GET /vehicle-inventory/models?hasSportSuspension=true
```

### 52. Models with Height Adjustable Suspension

```bash
GET /vehicle-inventory/models?hasHeightAdjustableSuspension=true
```

### 53. Models with One Touch Up/Down Windows

```bash
GET /vehicle-inventory/models?hasOneTouchUpDown=true
```

### 54. Models with Electric Power Steering

```bash
GET /vehicle-inventory/models?hasElectricPowerSteering=true
```

### 55. Models with Tilt Steering

```bash
GET /vehicle-inventory/models?hasTiltSteering=true
```

### 56. Models with Telescopic Steering

```bash
GET /vehicle-inventory/models?hasTelescopicSteering=true
```

### 57. Models with Steering Mounted Controls

```bash
GET /vehicle-inventory/models?hasSteeringMountedControls=true
```

### 58. Models with Auto Dimming IRVM

```bash
GET /vehicle-inventory/models?hasAutoDimmingIrvm=true
```

### 59. Models with Auto Folding IRVM

```bash
GET /vehicle-inventory/models?hasAutoFoldingIrvm=true
```

### 60. Models with Vanity Mirrors

```bash
GET /vehicle-inventory/models?hasVanityMirrors=true
```

### 61. Models with Cooled Glove Box

```bash
GET /vehicle-inventory/models?hasCooledGloveBox=true
```

### 62. Models with Sunglass Holder

```bash
GET /vehicle-inventory/models?hasSunglassHolder=true
```

### 63. Models with Umbrella Holder

```bash
GET /vehicle-inventory/models?hasUmbrellaHolder=true
```

### 64. Models with Boot Light

```bash
GET /vehicle-inventory/models?hasBootLight=true
```

### 65. Models with Puddle Lamps

```bash
GET /vehicle-inventory/models?hasPuddleLamps=true
```

### 66. Models with Welcome Light

```bash
GET /vehicle-inventory/models?hasWelcomeLight=true
```

### 67. Models with Footwell Lighting

```bash
GET /vehicle-inventory/models?hasFootwellLighting=true
```

### 68. Models with Engine Immobilizer

```bash
GET /vehicle-inventory/models?hasEngineImmobilizer=true
```

### 69. Models with Security Alarm

```bash
GET /vehicle-inventory/models?hasSecurityAlarm=true
```

### 70. Models with Panic Alarm

```bash
GET /vehicle-inventory/models?hasPanicAlarm=true
```

### 71. Models with Theft Alarm

```bash
GET /vehicle-inventory/models?hasTheftAlarm=true
```

### 72. Models with Vehicle Tracking

```bash
GET /vehicle-inventory/models?hasVehicleTracking=true
```

### 73. Models with GPS Tracking

```bash
GET /vehicle-inventory/models?hasGPSTracking=true
```

### 74. Models with Remote Locking

```bash
GET /vehicle-inventory/models?hasRemoteLocking=true
```

### 75. Models with Remote Unlocking

```bash
GET /vehicle-inventory/models?hasRemoteUnlocking=true
```

### 76. Models with Remote Start

```bash
GET /vehicle-inventory/models?hasRemoteStart=true
```

### 77. Models with Remote Climate Control

```bash
GET /vehicle-inventory/models?hasRemoteClimateControl=true
```

### 78. Models with Geofencing

```bash
GET /vehicle-inventory/models?hasGeofencing=true
```

### 79. Models with Valet Mode

```bash
GET /vehicle-inventory/models?hasValetMode=true
```

### 80. Models with Service Reminder

```bash
GET /vehicle-inventory/models?hasServiceReminder=true
```

### 81. Models with Maintenance Schedule

```bash
GET /vehicle-inventory/models?hasMaintenanceSchedule=true
```

### 82. Models with Diagnostic System

```bash
GET /vehicle-inventory/models?hasDiagnosticSystem=true
```

### 83. Models with Check Engine Light

```bash
GET /vehicle-inventory/models?hasCheckEngineLight=true
```

### 84. Models with Low Fuel Warning

```bash
GET /vehicle-inventory/models?hasLowFuelWarning=true
```

### 85. Models with Low Oil Warning

```bash
GET /vehicle-inventory/models?hasLowOilWarning=true
```

### 86. Models with Low Tyre Pressure Warning

```bash
GET /vehicle-inventory/models?hasLowTyrePressureWarning=true
```

### 87. Models with Low Wiper Fluid Warning

```bash
GET /vehicle-inventory/models?hasLowWiperFluidWarning=true
```

### 88. Models with Battery Warning

```bash
GET /vehicle-inventory/models?hasBatteryWarning=true
```

### 89. Models with Door Open Warning

```bash
GET /vehicle-inventory/models?hasDoorOpenWarning=true
```

### 90. Models with Seatbelt Warning

```bash
GET /vehicle-inventory/models?hasSeatbeltWarning=true
```

### 91. Models with Handbrake Warning

```bash
GET /vehicle-inventory/models?hasHandbrakeWarning=true
```

## Combined Filtering Examples

### 92. Luxury SUVs with Advanced Features

```bash
GET /vehicle-inventory/models?vehicleType=SUV&manufacturerCategory=luxury&hasSunroof=true&hasLeatherSeats=true&hasNavigation=true&hasParkingCamera=true&minPrice=2000000
```

### 93. Fuel Efficient Petrol Cars

```bash
GET /vehicle-inventory/models?fuelType=Petrol&minMileage=20&maxPrice=1000000&hasEcoMode=true
```

### 94. Family Cars with Safety Features

```bash
GET /vehicle-inventory/models?minSeatingCapacity=5&hasABS=true&hasAirbags=true&hasParkingSensors=true&hasCentralLocking=true
```

### 95. Tech-Savvy Cars

```bash
GET /vehicle-inventory/models?hasTouchscreen=true&hasAndroidAuto=true&hasAppleCarPlay=true&hasWirelessCharging=true&hasDigitalInstrumentCluster=true
```

### 96. Performance Cars

```bash
GET /vehicle-inventory/models?turbocharged=true&hasSportMode=true&hasPaddleShifters=true&hasLaunchControl=true&hasSportSuspension=true
```

### 97. Asian Manufacturers' Compact Cars

```bash
GET /vehicle-inventory/models?manufacturerRegion=Asia&segment=B&bodyType=Hatchback&maxPrice=800000
```

### 98. European Luxury Sedans

```bash
GET /vehicle-inventory/models?manufacturerRegion=Europe&vehicleType=Sedan&manufacturerCategory=luxury&hasLeatherSeats=true&hasAdaptiveSuspension=true
```

### 99. Budget-Friendly Automatic Cars

```bash
GET /vehicle-inventory/models?transmissionType=Automatic&maxPrice=600000&hasPowerSteering=true&hasPowerWindows=true&hasCentralLocking=true
```

### 100. Electric/Hybrid Vehicles

```bash
GET /vehicle-inventory/models?fuelType=Electric&hasRegenerativeBraking=true&hasEcoMode=true&minMileage=100
```

## Pagination and Sorting Examples

### 101. Paginated Results

```bash
GET /vehicle-inventory/models?page=1&limit=10
```

### 102. Sort by Price (Ascending)

```bash
GET /vehicle-inventory/models?sortBy=priceRange.min&sortOrder=ASC
```

### 103. Sort by Manufacturer Name

```bash
GET /vehicle-inventory/models?sortBy=manufacturer.name&sortOrder=ASC
```

### 104. Sort by Launch Year (Newest First)

```bash
GET /vehicle-inventory/models?sortBy=launchYear&sortOrder=DESC
```

### 105. Sort by Model Name

```bash
GET /vehicle-inventory/models?sortBy=displayName&sortOrder=ASC
```

## Complex Filtering Scenarios

### 106. Find Models with Multiple Fuel Options

```bash
GET /vehicle-inventory/models?fuelType=Petrol&hasMultipleFuelTypes=true
```

### 107. Find Models with Specific Feature Package

```bash
GET /vehicle-inventory/models?featurePackage=VX&hasAlloyWheels=true&hasAutomaticClimateControl=true
```

### 108. Find Models by Segment and Body Type

```bash
GET /vehicle-inventory/models?segment=C&bodyType=Sedan&minLaunchYear=2020
```

### 109. Find Models by Manufacturer and Country

```bash
GET /vehicle-inventory/models?manufacturerName=Honda&manufacturerCountry=Japan&vehicleType=Sedan
```

### 110. Find Models with Comprehensive Safety Features

```bash
GET /vehicle-inventory/models?hasABS=true&hasAirbags=true&hasParkingSensors=true&hasParkingCamera=true&hasCentralLocking=true&hasImmobilizer=true
```

## Response Format

The API returns a paginated response with the following structure:

```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "swift",
      "displayName": "Swift",
      "description": "Popular hatchback with great fuel efficiency",
      "launchYear": 2020,
      "segment": "B",
      "bodyType": "Hatchback",
      "vehicleType": "Hatchback",
      "isActive": true,
      "manufacturer": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "maruti_suzuki",
        "displayName": "Maruti Suzuki",
        "logo": "https://example.com/logo.png",
        "originCountry": "Japan",
        "foundedYear": 1981,
        "headquarters": "New Delhi, India"
      },
      "variantCount": 5,
      "priceRange": {
        "min": 550000,
        "max": 850000
      },
      "availableFuelTypes": ["Petrol", "Diesel", "CNG"],
      "availableTransmissionTypes": ["Manual", "Automatic"],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 160,
  "page": 1,
  "limit": 20,
  "totalPages": 8,
  "hasNext": true,
  "hasPrev": false
}
```

## Notes

- All boolean filters (has\* features) accept `true` or `false` values
- Price filters work on the variant prices, not model prices
- Feature filters work on the variants' features, so models with at least one variant having the feature will be returned
- Text search is performed on model name, display name, and description
- Manufacturer filters work on the associated manufacturer data
- Pagination defaults to page 1 with 20 items per page
- Sorting defaults to displayName in ascending order
- All filters are optional and can be combined
- The API automatically handles the case where no filters are provided by returning all models
