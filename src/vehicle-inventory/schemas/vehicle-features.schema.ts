import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VehicleFeaturesDocument = VehicleFeatures & Document;

@Schema({ _id: false })
export class SafetyFeatures {
  // Essential Safety
  @Prop({ default: false })
  abs?: boolean; // Anti-lock Braking System

  @Prop({ default: false })
  ebd?: boolean; // Electronic Brake-force Distribution

  @Prop({ default: false })
  esp?: boolean; // Electronic Stability Program

  @Prop({ default: false })
  tractionControl?: boolean;

  @Prop({ default: false })
  hillHoldControl?: boolean;

  @Prop({ default: false })
  brakeAssist?: boolean;

  // Airbags
  @Prop({ default: 0 })
  driverAirbag?: number;

  @Prop({ default: 0 })
  passengerAirbag?: number;

  @Prop({ default: 0 })
  sideAirbags?: number;

  @Prop({ default: 0 })
  curtainAirbags?: number;

  @Prop({ default: 0 })
  kneeAirbag?: number;

  // Advanced Safety
  @Prop({ default: false })
  isofixChildSeat?: boolean;

  @Prop({ default: false })
  childSafetyLocks?: boolean;

  @Prop({ default: false })
  impactSensingDoorUnlock?: boolean;

  @Prop({ default: false })
  speedSensingDoorLock?: boolean;

  @Prop({ default: false })
  centralLocking?: boolean;

  @Prop({ default: false })
  immobilizer?: boolean;

  @Prop({ default: false })
  alarmSystem?: boolean;

  // Crash Safety
  @Prop({ default: false })
  crashTestRating?: string; // e.g., "5 Star", "4 Star"

  @Prop({ default: false })
  crashTestBody?: string; // e.g., "Global NCAP", "ASEAN NCAP"
}

export const SafetyFeaturesSchema =
  SchemaFactory.createForClass(SafetyFeatures);

@Schema({ _id: false })
export class ComfortFeatures {
  // Climate Control
  @Prop({ default: false })
  airConditioning?: boolean;

  @Prop({ default: false })
  automaticClimateControl?: boolean;

  @Prop({ default: false })
  dualZoneClimateControl?: boolean;

  @Prop({ default: false })
  rearAcVents?: boolean;

  @Prop({ default: false })
  cooledGloveBox?: boolean;

  // Seating
  @Prop({ default: false })
  powerDriverSeat?: boolean;

  @Prop({ default: false })
  powerPassengerSeat?: boolean;

  @Prop({ default: false })
  memorySeats?: boolean;

  @Prop({ default: false })
  ventilatedSeats?: boolean;

  @Prop({ default: false })
  heatedSeats?: boolean;

  @Prop({ default: false })
  leatherSeats?: boolean;

  @Prop({ default: false })
  fabricSeats?: boolean;

  @Prop({ default: false })
  heightAdjustableDriverSeat?: boolean;

  @Prop({ default: false })
  lumbarSupport?: boolean;

  // Interior
  @Prop({ default: false })
  ambientLighting?: boolean;

  @Prop({ default: false })
  moodLighting?: boolean;

  @Prop({ default: false })
  keylessEntry?: boolean;

  @Prop({ default: false })
  pushButtonStart?: boolean;

  @Prop({ default: false })
  remoteEngineStart?: boolean;

  @Prop({ default: false })
  cruiseControl?: boolean;

  @Prop({ default: false })
  adaptiveCruiseControl?: boolean;

  @Prop({ default: false })
  speedLimiter?: boolean;
}

export const ComfortFeaturesSchema =
  SchemaFactory.createForClass(ComfortFeatures);

@Schema({ _id: false })
export class ExteriorFeatures {
  // Lighting
  @Prop({ default: false })
  ledHeadlamps?: boolean;

  @Prop({ default: false })
  ledTailLamps?: boolean;

  @Prop({ default: false })
  ledDtrls?: boolean; // Day Time Running Lights

  @Prop({ default: false })
  fogLamps?: boolean;

  @Prop({ default: false })
  corneringLamps?: boolean;

  @Prop({ default: false })
  automaticHeadlamps?: boolean;

  @Prop({ default: false })
  followMeHomeHeadlamps?: boolean;

  @Prop({ default: false })
  rainSensingWipers?: boolean;

  // Mirrors
  @Prop({ default: false })
  powerAdjustableMirrors?: boolean;

  @Prop({ default: false })
  electricallyFoldableMirrors?: boolean;

  @Prop({ default: false })
  heatedMirrors?: boolean;

  @Prop({ default: false })
  turnIndicatorsOnMirrors?: boolean;

  // Wheels
  @Prop({ default: false })
  alloyWheels?: boolean;

  @Prop({ default: false })
  steelWheels?: boolean;

  @Prop({ default: false })
  wheelCovers?: boolean;

  @Prop({ default: false })
  runFlatTyres?: boolean;

  @Prop({ default: false })
  tyrePressureMonitoring?: boolean;

  // Body
  @Prop({ default: false })
  sunroof?: boolean;

  @Prop({ default: false })
  panoramicSunroof?: boolean;

  @Prop({ default: false })
  roofRails?: boolean;

  @Prop({ default: false })
  bodyColouredBumpers?: boolean;

  @Prop({ default: false })
  chromeGarnish?: boolean;

  @Prop({ default: false })
  sideMouldings?: boolean;

  @Prop({ default: false })
  rearSpoiler?: boolean;
}

export const ExteriorFeaturesSchema =
  SchemaFactory.createForClass(ExteriorFeatures);

@Schema({ _id: false })
export class TechnologyFeatures {
  // Infotainment
  @Prop({ default: false })
  touchscreen?: boolean;

  @Prop({ default: false })
  androidAuto?: boolean;

  @Prop({ default: false })
  appleCarplay?: boolean;

  @Prop({ default: false })
  bluetooth?: boolean;

  @Prop({ default: false })
  usbCharging?: boolean;

  @Prop({ default: false })
  wirelessCharging?: boolean;

  @Prop({ default: false })
  navigation?: boolean;

  @Prop({ default: false })
  voiceCommands?: boolean;

  @Prop({ default: false })
  gestureControl?: boolean;

  @Prop({ default: false })
  wifiHotspot?: boolean;

  @Prop({ default: false })
  connectedCar?: boolean;

  // Audio
  @Prop({ default: false })
  amFmRadio?: boolean;

  @Prop({ default: false })
  cdPlayer?: boolean;

  @Prop({ default: false })
  auxInput?: boolean;

  @Prop({ default: false })
  speakers?: number;

  @Prop({ default: false })
  subwoofer?: boolean;

  @Prop({ default: false })
  premiumAudio?: boolean; // e.g., Harman Kardon, Bose

  // Displays
  @Prop({ default: false })
  digitalInstrumentCluster?: boolean;

  @Prop({ default: false })
  headsUpDisplay?: boolean;

  @Prop({ default: false })
  multiInformationDisplay?: boolean;

  @Prop({ default: false })
  rearEntertainment?: boolean;
}

export const TechnologyFeaturesSchema =
  SchemaFactory.createForClass(TechnologyFeatures);

@Schema({ _id: false })
export class ParkingFeatures {
  @Prop({ default: false })
  parkingSensors?: boolean;

  @Prop({ default: false })
  frontParkingSensors?: boolean;

  @Prop({ default: false })
  rearParkingSensors?: boolean;

  @Prop({ default: false })
  parkingCamera?: boolean;

  @Prop({ default: false })
  rearParkingCamera?: boolean;

  @Prop({ default: false })
  threeSixtyDegreeCamera?: boolean;

  @Prop({ default: false })
  surroundViewCamera?: boolean;

  @Prop({ default: false })
  automaticParking?: boolean;

  @Prop({ default: false })
  parkingAssist?: boolean;
}

export const ParkingFeaturesSchema =
  SchemaFactory.createForClass(ParkingFeatures);

@Schema({ _id: false })
export class PerformanceFeatures {
  @Prop({ default: false })
  sportMode?: boolean;

  @Prop({ default: false })
  ecoMode?: boolean;

  @Prop({ default: false })
  paddleShifters?: boolean;

  @Prop({ default: false })
  launchControl?: boolean;

  @Prop({ default: false })
  limitedSlipDifferential?: boolean;

  @Prop({ default: false })
  electronicDifferential?: boolean;

  @Prop({ default: false })
  adaptiveSuspension?: boolean;

  @Prop({ default: false })
  sportSuspension?: boolean;

  @Prop({ default: false })
  heightAdjustableSuspension?: boolean;
}

export const PerformanceFeaturesSchema =
  SchemaFactory.createForClass(PerformanceFeatures);

@Schema({ _id: false })
export class ConvenienceFeatures {
  @Prop({ default: false })
  powerWindows?: boolean;

  @Prop({ default: false })
  oneTouchUpDown?: boolean;

  @Prop({ default: false })
  powerSteering?: boolean;

  @Prop({ default: false })
  electricPowerSteering?: boolean;

  @Prop({ default: false })
  tiltSteering?: boolean;

  @Prop({ default: false })
  telescopicSteering?: boolean;

  @Prop({ default: false })
  steeringMountedControls?: boolean;

  @Prop({ default: false })
  autoDimmingIrvm?: boolean; // Interior Rear View Mirror

  @Prop({ default: false })
  autoFoldingIrvm?: boolean;

  @Prop({ default: false })
  vanityMirrors?: boolean;

  @Prop({ default: false })
  gloveBox?: boolean;

  @Prop({ default: false })
  cooledGloveBox?: boolean;

  @Prop({ default: false })
  cupHolders?: number;

  @Prop({ default: false })
  bottleHolders?: number;

  @Prop({ default: false })
  sunglassHolder?: boolean;

  @Prop({ default: false })
  umbrellaHolder?: boolean;

  @Prop({ default: false })
  bootLight?: boolean;

  @Prop({ default: false })
  puddleLamps?: boolean;

  @Prop({ default: false })
  welcomeLight?: boolean;

  @Prop({ default: false })
  footwellLighting?: boolean;
}

export const ConvenienceFeaturesSchema =
  SchemaFactory.createForClass(ConvenienceFeatures);

@Schema({ _id: false })
export class SecurityFeatures {
  @Prop({ default: false })
  engineImmobilizer?: boolean;

  @Prop({ default: false })
  securityAlarm?: boolean;

  @Prop({ default: false })
  panicAlarm?: boolean;

  @Prop({ default: false })
  theftAlarm?: boolean;

  @Prop({ default: false })
  vehicleTracking?: boolean;

  @Prop({ default: false })
  gpsTracking?: boolean;

  @Prop({ default: false })
  remoteLocking?: boolean;

  @Prop({ default: false })
  remoteUnlocking?: boolean;

  @Prop({ default: false })
  remoteStart?: boolean;

  @Prop({ default: false })
  remoteClimateControl?: boolean;

  @Prop({ default: false })
  geofencing?: boolean;

  @Prop({ default: false })
  valetMode?: boolean;
}

export const SecurityFeaturesSchema =
  SchemaFactory.createForClass(SecurityFeatures);

@Schema({ _id: false })
export class MaintenanceFeatures {
  @Prop({ default: false })
  serviceReminder?: boolean;

  @Prop({ default: false })
  maintenanceSchedule?: boolean;

  @Prop({ default: false })
  diagnosticSystem?: boolean;

  @Prop({ default: false })
  checkEngineLight?: boolean;

  @Prop({ default: false })
  lowFuelWarning?: boolean;

  @Prop({ default: false })
  lowOilWarning?: boolean;

  @Prop({ default: false })
  lowTyrePressureWarning?: boolean;

  @Prop({ default: false })
  lowWiperFluidWarning?: boolean;

  @Prop({ default: false })
  batteryWarning?: boolean;

  @Prop({ default: false })
  doorOpenWarning?: boolean;

  @Prop({ default: false })
  seatbeltWarning?: boolean;

  @Prop({ default: false })
  handbrakeWarning?: boolean;
}

export const MaintenanceFeaturesSchema =
  SchemaFactory.createForClass(MaintenanceFeatures);

@Schema({ _id: false })
export class VehicleFeatures {
  @Prop({ type: SafetyFeaturesSchema, required: false })
  safety?: SafetyFeatures;

  @Prop({ type: ComfortFeaturesSchema, required: false })
  comfort?: ComfortFeatures;

  @Prop({ type: ExteriorFeaturesSchema, required: false })
  exterior?: ExteriorFeatures;

  @Prop({ type: TechnologyFeaturesSchema, required: false })
  technology?: TechnologyFeatures;

  @Prop({ type: ParkingFeaturesSchema, required: false })
  parking?: ParkingFeatures;

  @Prop({ type: PerformanceFeaturesSchema, required: false })
  performance?: PerformanceFeatures;

  @Prop({ type: ConvenienceFeaturesSchema, required: false })
  convenience?: ConvenienceFeatures;

  @Prop({ type: SecurityFeaturesSchema, required: false })
  security?: SecurityFeatures;

  @Prop({ type: MaintenanceFeaturesSchema, required: false })
  maintenance?: MaintenanceFeatures;

  // Additional custom features
  @Prop({ type: [String], required: false })
  customFeatures?: string[];

  @Prop({ required: false })
  featureNotes?: string;
}

export const VehicleFeaturesSchema =
  SchemaFactory.createForClass(VehicleFeatures);
