import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SafetyFeaturesDto {
  @ApiProperty({
    description: 'Anti-lock Braking System',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  abs?: boolean;

  @ApiProperty({
    description: 'Electronic Brake-force Distribution',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  ebd?: boolean;

  @ApiProperty({
    description: 'Electronic Stability Program',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  esp?: boolean;

  @ApiProperty({
    description: 'Traction Control',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  tractionControl?: boolean;

  @ApiProperty({
    description: 'Hill Hold Control',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  hillHoldControl?: boolean;

  @ApiProperty({ description: 'Brake Assist', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  brakeAssist?: boolean;

  @ApiProperty({
    description: 'Number of driver airbags',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  driverAirbag?: number;

  @ApiProperty({
    description: 'Number of passenger airbags',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  passengerAirbag?: number;

  @ApiProperty({
    description: 'Number of side airbags',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  sideAirbags?: number;

  @ApiProperty({
    description: 'Number of curtain airbags',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  curtainAirbags?: number;

  @ApiProperty({
    description: 'Number of knee airbags',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  kneeAirbag?: number;

  @ApiProperty({
    description: 'ISOFIX Child Seat Anchors',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isofixChildSeat?: boolean;

  @ApiProperty({
    description: 'Child Safety Locks',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  childSafetyLocks?: boolean;

  @ApiProperty({
    description: 'Impact Sensing Door Unlock',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  impactSensingDoorUnlock?: boolean;

  @ApiProperty({
    description: 'Speed Sensing Door Lock',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  speedSensingDoorLock?: boolean;

  @ApiProperty({
    description: 'Central Locking',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  centralLocking?: boolean;

  @ApiProperty({
    description: 'Engine Immobilizer',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  immobilizer?: boolean;

  @ApiProperty({ description: 'Alarm System', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  alarmSystem?: boolean;

  @ApiProperty({
    description: 'Crash Test Rating',
    example: '5 Star',
    required: false,
  })
  @IsOptional()
  @IsString()
  crashTestRating?: string;

  @ApiProperty({
    description: 'Crash Test Body',
    example: 'Global NCAP',
    required: false,
  })
  @IsOptional()
  @IsString()
  crashTestBody?: string;
}

export class ComfortFeaturesDto {
  @ApiProperty({
    description: 'Air Conditioning',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  airConditioning?: boolean;

  @ApiProperty({
    description: 'Automatic Climate Control',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  automaticClimateControl?: boolean;

  @ApiProperty({
    description: 'Dual Zone Climate Control',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  dualZoneClimateControl?: boolean;

  @ApiProperty({ description: 'Rear AC Vents', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  rearAcVents?: boolean;

  @ApiProperty({
    description: 'Cooled Glove Box',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  cooledGloveBox?: boolean;

  @ApiProperty({
    description: 'Power Driver Seat',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  powerDriverSeat?: boolean;

  @ApiProperty({
    description: 'Power Passenger Seat',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  powerPassengerSeat?: boolean;

  @ApiProperty({ description: 'Memory Seats', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  memorySeats?: boolean;

  @ApiProperty({
    description: 'Ventilated Seats',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  ventilatedSeats?: boolean;

  @ApiProperty({ description: 'Heated Seats', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  heatedSeats?: boolean;

  @ApiProperty({ description: 'Leather Seats', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  leatherSeats?: boolean;

  @ApiProperty({ description: 'Fabric Seats', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  fabricSeats?: boolean;

  @ApiProperty({
    description: 'Height Adjustable Driver Seat',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  heightAdjustableDriverSeat?: boolean;

  @ApiProperty({
    description: 'Lumbar Support',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  lumbarSupport?: boolean;

  @ApiProperty({
    description: 'Ambient Lighting',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  ambientLighting?: boolean;

  @ApiProperty({ description: 'Mood Lighting', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  moodLighting?: boolean;

  @ApiProperty({ description: 'Keyless Entry', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  keylessEntry?: boolean;

  @ApiProperty({
    description: 'Push Button Start',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  pushButtonStart?: boolean;

  @ApiProperty({
    description: 'Remote Engine Start',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  remoteEngineStart?: boolean;

  @ApiProperty({
    description: 'Cruise Control',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  cruiseControl?: boolean;

  @ApiProperty({
    description: 'Adaptive Cruise Control',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  adaptiveCruiseControl?: boolean;

  @ApiProperty({ description: 'Speed Limiter', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  speedLimiter?: boolean;
}

export class ExteriorFeaturesDto {
  @ApiProperty({ description: 'LED Headlamps', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  ledHeadlamps?: boolean;

  @ApiProperty({
    description: 'LED Tail Lamps',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  ledTailLamps?: boolean;

  @ApiProperty({
    description: 'LED Day Time Running Lights',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  ledDtrls?: boolean;

  @ApiProperty({ description: 'Fog Lamps', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  fogLamps?: boolean;

  @ApiProperty({
    description: 'Cornering Lamps',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  corneringLamps?: boolean;

  @ApiProperty({
    description: 'Automatic Headlamps',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  automaticHeadlamps?: boolean;

  @ApiProperty({
    description: 'Follow Me Home Headlamps',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  followMeHomeHeadlamps?: boolean;

  @ApiProperty({
    description: 'Rain Sensing Wipers',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  rainSensingWipers?: boolean;

  @ApiProperty({
    description: 'Power Adjustable Mirrors',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  powerAdjustableMirrors?: boolean;

  @ApiProperty({
    description: 'Electrically Foldable Mirrors',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  electricallyFoldableMirrors?: boolean;

  @ApiProperty({
    description: 'Heated Mirrors',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  heatedMirrors?: boolean;

  @ApiProperty({
    description: 'Turn Indicators on Mirrors',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  turnIndicatorsOnMirrors?: boolean;

  @ApiProperty({ description: 'Alloy Wheels', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  alloyWheels?: boolean;

  @ApiProperty({ description: 'Steel Wheels', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  steelWheels?: boolean;

  @ApiProperty({ description: 'Wheel Covers', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  wheelCovers?: boolean;

  @ApiProperty({
    description: 'Run Flat Tyres',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  runFlatTyres?: boolean;

  @ApiProperty({
    description: 'Tyre Pressure Monitoring',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  tyrePressureMonitoring?: boolean;

  @ApiProperty({ description: 'Sunroof', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  sunroof?: boolean;

  @ApiProperty({
    description: 'Panoramic Sunroof',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  panoramicSunroof?: boolean;

  @ApiProperty({ description: 'Roof Rails', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  roofRails?: boolean;

  @ApiProperty({
    description: 'Body Coloured Bumpers',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  bodyColouredBumpers?: boolean;

  @ApiProperty({
    description: 'Chrome Garnish',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  chromeGarnish?: boolean;

  @ApiProperty({
    description: 'Side Mouldings',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  sideMouldings?: boolean;

  @ApiProperty({ description: 'Rear Spoiler', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  rearSpoiler?: boolean;
}

export class TechnologyFeaturesDto {
  @ApiProperty({ description: 'Touchscreen', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  touchscreen?: boolean;

  @ApiProperty({ description: 'Android Auto', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  androidAuto?: boolean;

  @ApiProperty({ description: 'Apple CarPlay', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  appleCarplay?: boolean;

  @ApiProperty({ description: 'Bluetooth', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  bluetooth?: boolean;

  @ApiProperty({ description: 'USB Charging', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  usbCharging?: boolean;

  @ApiProperty({
    description: 'Wireless Charging',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  wirelessCharging?: boolean;

  @ApiProperty({ description: 'Navigation', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  navigation?: boolean;

  @ApiProperty({
    description: 'Voice Commands',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  voiceCommands?: boolean;

  @ApiProperty({
    description: 'Gesture Control',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  gestureControl?: boolean;

  @ApiProperty({ description: 'WiFi Hotspot', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  wifiHotspot?: boolean;

  @ApiProperty({ description: 'Connected Car', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  connectedCar?: boolean;

  @ApiProperty({ description: 'AM/FM Radio', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  amFmRadio?: boolean;

  @ApiProperty({ description: 'CD Player', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  cdPlayer?: boolean;

  @ApiProperty({ description: 'Aux Input', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  auxInput?: boolean;

  @ApiProperty({
    description: 'Number of Speakers',
    example: 6,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  speakers?: number;

  @ApiProperty({ description: 'Subwoofer', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  subwoofer?: boolean;

  @ApiProperty({
    description: 'Premium Audio System',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  premiumAudio?: boolean;

  @ApiProperty({
    description: 'Digital Instrument Cluster',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  digitalInstrumentCluster?: boolean;

  @ApiProperty({
    description: 'Heads Up Display',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  headsUpDisplay?: boolean;

  @ApiProperty({
    description: 'Multi Information Display',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  multiInformationDisplay?: boolean;

  @ApiProperty({
    description: 'Rear Entertainment',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  rearEntertainment?: boolean;
}

export class ParkingFeaturesDto {
  @ApiProperty({
    description: 'Parking Sensors',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  parkingSensors?: boolean;

  @ApiProperty({
    description: 'Front Parking Sensors',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  frontParkingSensors?: boolean;

  @ApiProperty({
    description: 'Rear Parking Sensors',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  rearParkingSensors?: boolean;

  @ApiProperty({
    description: 'Parking Camera',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  parkingCamera?: boolean;

  @ApiProperty({
    description: 'Rear Parking Camera',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  rearParkingCamera?: boolean;

  @ApiProperty({
    description: 'Surround View Camera',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  surroundViewCamera?: boolean;

  @ApiProperty({
    description: '360 Degree Camera',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  threeSixtyDegreeCamera?: boolean;

  @ApiProperty({
    description: 'Automatic Parking',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  automaticParking?: boolean;

  @ApiProperty({
    description: 'Parking Assist',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  parkingAssist?: boolean;
}

export class PerformanceFeaturesDto {
  @ApiProperty({ description: 'Sport Mode', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  sportMode?: boolean;

  @ApiProperty({ description: 'Eco Mode', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  ecoMode?: boolean;

  @ApiProperty({
    description: 'Paddle Shifters',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  paddleShifters?: boolean;

  @ApiProperty({
    description: 'Launch Control',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  launchControl?: boolean;

  @ApiProperty({
    description: 'Limited Slip Differential',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  limitedSlipDifferential?: boolean;

  @ApiProperty({
    description: 'Electronic Differential',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  electronicDifferential?: boolean;

  @ApiProperty({
    description: 'Adaptive Suspension',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  adaptiveSuspension?: boolean;

  @ApiProperty({
    description: 'Sport Suspension',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  sportSuspension?: boolean;

  @ApiProperty({
    description: 'Height Adjustable Suspension',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  heightAdjustableSuspension?: boolean;
}

export class ConvenienceFeaturesDto {
  @ApiProperty({ description: 'Power Windows', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  powerWindows?: boolean;

  @ApiProperty({
    description: 'One Touch Up/Down Windows',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  oneTouchUpDown?: boolean;

  @ApiProperty({
    description: 'Power Steering',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  powerSteering?: boolean;

  @ApiProperty({
    description: 'Electric Power Steering',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  electricPowerSteering?: boolean;

  @ApiProperty({ description: 'Tilt Steering', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  tiltSteering?: boolean;

  @ApiProperty({
    description: 'Telescopic Steering',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  telescopicSteering?: boolean;

  @ApiProperty({
    description: 'Steering Mounted Controls',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  steeringMountedControls?: boolean;

  @ApiProperty({
    description: 'Auto Dimming IRVM',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  autoDimmingIrvm?: boolean;

  @ApiProperty({
    description: 'Auto Folding IRVM',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  autoFoldingIrvm?: boolean;

  @ApiProperty({
    description: 'Vanity Mirrors',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  vanityMirrors?: boolean;

  @ApiProperty({ description: 'Glove Box', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  gloveBox?: boolean;

  @ApiProperty({
    description: 'Cooled Glove Box',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  cooledGloveBox?: boolean;

  @ApiProperty({
    description: 'Number of Cup Holders',
    example: 4,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  cupHolders?: number;

  @ApiProperty({
    description: 'Number of Bottle Holders',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  bottleHolders?: number;

  @ApiProperty({
    description: 'Sunglass Holder',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  sunglassHolder?: boolean;

  @ApiProperty({
    description: 'Umbrella Holder',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  umbrellaHolder?: boolean;

  @ApiProperty({ description: 'Boot Light', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  bootLight?: boolean;

  @ApiProperty({ description: 'Puddle Lamps', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  puddleLamps?: boolean;

  @ApiProperty({ description: 'Welcome Light', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  welcomeLight?: boolean;

  @ApiProperty({
    description: 'Footwell Lighting',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  footwellLighting?: boolean;
}

export class SecurityFeaturesDto {
  @ApiProperty({
    description: 'Engine Immobilizer',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  engineImmobilizer?: boolean;

  @ApiProperty({
    description: 'Security Alarm',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  securityAlarm?: boolean;

  @ApiProperty({ description: 'Panic Alarm', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  panicAlarm?: boolean;

  @ApiProperty({ description: 'Theft Alarm', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  theftAlarm?: boolean;

  @ApiProperty({
    description: 'Vehicle Tracking',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  vehicleTracking?: boolean;

  @ApiProperty({ description: 'GPS Tracking', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  gpsTracking?: boolean;

  @ApiProperty({
    description: 'Remote Locking',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  remoteLocking?: boolean;

  @ApiProperty({
    description: 'Remote Unlocking',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  remoteUnlocking?: boolean;

  @ApiProperty({ description: 'Remote Start', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  remoteStart?: boolean;

  @ApiProperty({
    description: 'Remote Climate Control',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  remoteClimateControl?: boolean;

  @ApiProperty({ description: 'Geofencing', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  geofencing?: boolean;

  @ApiProperty({ description: 'Valet Mode', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  valetMode?: boolean;
}

export class MaintenanceFeaturesDto {
  @ApiProperty({
    description: 'Service Reminder',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  serviceReminder?: boolean;

  @ApiProperty({
    description: 'Maintenance Schedule',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  maintenanceSchedule?: boolean;

  @ApiProperty({
    description: 'Diagnostic System',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  diagnosticSystem?: boolean;

  @ApiProperty({
    description: 'Check Engine Light',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  checkEngineLight?: boolean;

  @ApiProperty({
    description: 'Low Fuel Warning',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  lowFuelWarning?: boolean;

  @ApiProperty({
    description: 'Low Oil Warning',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  lowOilWarning?: boolean;

  @ApiProperty({
    description: 'Low Tyre Pressure Warning',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  lowTyrePressureWarning?: boolean;

  @ApiProperty({
    description: 'Low Wiper Fluid Warning',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  lowWiperFluidWarning?: boolean;

  @ApiProperty({
    description: 'Battery Warning',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  batteryWarning?: boolean;

  @ApiProperty({
    description: 'Door Open Warning',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  doorOpenWarning?: boolean;

  @ApiProperty({
    description: 'Seatbelt Warning',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  seatbeltWarning?: boolean;

  @ApiProperty({
    description: 'Handbrake Warning',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  handbrakeWarning?: boolean;
}

export class VehicleFeaturesDto {
  @ApiProperty({
    description: 'Safety features',
    type: SafetyFeaturesDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SafetyFeaturesDto)
  safety?: SafetyFeaturesDto;

  @ApiProperty({
    description: 'Comfort features',
    type: ComfortFeaturesDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ComfortFeaturesDto)
  comfort?: ComfortFeaturesDto;

  @ApiProperty({
    description: 'Exterior features',
    type: ExteriorFeaturesDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExteriorFeaturesDto)
  exterior?: ExteriorFeaturesDto;

  @ApiProperty({
    description: 'Technology features',
    type: TechnologyFeaturesDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TechnologyFeaturesDto)
  technology?: TechnologyFeaturesDto;

  @ApiProperty({
    description: 'Parking features',
    type: ParkingFeaturesDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ParkingFeaturesDto)
  parking?: ParkingFeaturesDto;

  @ApiProperty({
    description: 'Performance features',
    type: PerformanceFeaturesDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PerformanceFeaturesDto)
  performance?: PerformanceFeaturesDto;

  @ApiProperty({
    description: 'Convenience features',
    type: ConvenienceFeaturesDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConvenienceFeaturesDto)
  convenience?: ConvenienceFeaturesDto;

  @ApiProperty({
    description: 'Security features',
    type: SecurityFeaturesDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SecurityFeaturesDto)
  security?: SecurityFeaturesDto;

  @ApiProperty({
    description: 'Maintenance features',
    type: MaintenanceFeaturesDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MaintenanceFeaturesDto)
  maintenance?: MaintenanceFeaturesDto;

  @ApiProperty({
    description: 'Custom features',
    example: ['Custom Feature 1', 'Custom Feature 2'],
    required: false,
  })
  @IsOptional()
  @IsString({ each: true })
  customFeatures?: string[];

  @ApiProperty({
    description: 'Feature notes',
    example: 'Additional feature information',
    required: false,
  })
  @IsOptional()
  @IsString()
  featureNotes?: string;
}
