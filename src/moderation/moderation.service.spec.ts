import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';

import { ModerationService } from './moderation.service';
import { User } from '../users/schemas/user.schema';
import { Ad } from '../ads/schemas/ad.schema';
import { UserReport } from '../users/schemas/user-report.schema';
import { UserStrike } from './schemas/user-strike.schema';
import {
  Suspension,
  SuspensionStatus,
  SuspensionType,
} from './schemas/suspension.schema';
import { AdminActionLog } from './schemas/admin-action-log.schema';
import {
  DEFAULT_STRIKE_THRESHOLDS,
  ModerationSettings,
} from './schemas/moderation-settings.schema';
import { Appeal } from './schemas/appeal.schema';
import { FcmNotificationService } from '../notifications/fcm/fcm-notification.service';
import { EmailService } from '../utils/email.service';

/** Chainable + awaitable mongoose query stand-in resolving to `value`. */
function q<T>(value: T): any {
  const obj: any = {
    select: () => obj,
    populate: () => obj,
    sort: () => obj,
    skip: () => obj,
    limit: () => obj,
    lean: () => Promise.resolve(value),
    exec: () => Promise.resolve(value),
    then: (res: any, rej: any) => Promise.resolve(value).then(res, rej),
    catch: (rej: any) => Promise.resolve(value).catch(rej),
  };
  return obj;
}

describe('ModerationService', () => {
  let service: ModerationService;

  let userModel: any;
  let adModel: any;
  let reportModel: any;
  let strikeModel: any;
  let suspensionModel: any;
  let actionLogModel: any;
  let settingsModel: any;
  let appealModel: any;
  let fcm: any;
  let email: any;

  beforeEach(async () => {
    userModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(() => q({})),
      countDocuments: jest.fn(() => q(0)),
      find: jest.fn(() => q([])),
    };
    adModel = { findById: jest.fn(), countDocuments: jest.fn(() => q(0)) };
    reportModel = { countDocuments: jest.fn(() => q(0)) };
    strikeModel = {
      create: jest.fn(() => Promise.resolve({ _id: 'strike1' })),
      findById: jest.fn(),
      countDocuments: jest.fn(() => q(1)),
      find: jest.fn(() => q([])),
    };
    suspensionModel = {
      create: jest.fn(() => Promise.resolve({ _id: 'susp1' })),
      updateMany: jest.fn(() => q({})),
      findOne: jest.fn(() => q(null)),
      find: jest.fn(() => q([])),
      countDocuments: jest.fn(() => q(0)),
    };
    actionLogModel = { create: jest.fn(() => Promise.resolve({})) };
    settingsModel = {
      findOne: jest.fn(() =>
        Promise.resolve({
          key: 'global',
          thresholds: DEFAULT_STRIKE_THRESHOLDS,
          notifyByEmail: false,
          notifyByPush: false,
        }),
      ),
      create: jest.fn(() =>
        Promise.resolve({
          key: 'global',
          thresholds: DEFAULT_STRIKE_THRESHOLDS,
          notifyByEmail: false,
          notifyByPush: false,
        }),
      ),
      findOneAndUpdate: jest.fn(() =>
        Promise.resolve({ key: 'global', thresholds: [] }),
      ),
    };
    appealModel = {
      create: jest.fn(() => Promise.resolve({})),
      findOne: jest.fn(() => Promise.resolve(null)),
      findById: jest.fn(),
    };
    fcm = { sendToUser: jest.fn(() => Promise.resolve()) };
    email = { sendEmail: jest.fn(() => Promise.resolve()) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(Ad.name), useValue: adModel },
        { provide: getModelToken(UserReport.name), useValue: reportModel },
        { provide: getModelToken(UserStrike.name), useValue: strikeModel },
        { provide: getModelToken(Suspension.name), useValue: suspensionModel },
        { provide: getModelToken(AdminActionLog.name), useValue: actionLogModel },
        {
          provide: getModelToken(ModerationSettings.name),
          useValue: settingsModel,
        },
        { provide: getModelToken(Appeal.name), useValue: appealModel },
        { provide: FcmNotificationService, useValue: fcm },
        { provide: EmailService, useValue: email },
      ],
    }).compile();

    service = moduleRef.get<ModerationService>(ModerationService);
  });

  it('seeds default settings when none exist', async () => {
    settingsModel.findOne.mockResolvedValueOnce(null);
    const settings = await service.getSettings();
    expect(settingsModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'global' }),
    );
    expect(settings.thresholds.length).toBe(5);
  });

  it('adds a strike, increments the count and records an audit log', async () => {
    const userDoc: any = {
      _id: 'u1',
      strikeCount: 0,
      email: 'a@b.com',
      save: jest.fn(),
    };
    userModel.findById.mockReturnValue(q(userDoc));

    await service.addStrike('u1', { reason: 'spam' }, 'admin1');

    expect(strikeModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ level: 1, reason: 'spam', issuedBy: 'admin1' }),
    );
    expect(userDoc.strikeCount).toBe(1);
    expect(userDoc.save).toHaveBeenCalled();
    expect(actionLogModel.create).toHaveBeenCalled();
  });

  it('auto-suspends when the strike reaches the suspend threshold (level 3)', async () => {
    const userDoc: any = {
      _id: 'u1',
      strikeCount: 2, // next strike → level 3 → SUSPEND 7d in defaults
      email: 'a@b.com',
      save: jest.fn(),
    };
    userModel.findById.mockReturnValue(q(userDoc));

    await service.addStrike('u1', { reason: 'fraud' }, 'admin1');

    expect(suspensionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SuspensionType.TEMPORARY,
        status: SuspensionStatus.ACTIVE,
        isAutomatic: true,
      }),
    );
  });

  it('revokes a strike and recomputes the active count', async () => {
    const strikeDoc: any = {
      _id: 's1',
      user: 'u1',
      isActive: true,
      save: jest.fn(),
    };
    strikeModel.findById.mockResolvedValue(strikeDoc);
    strikeModel.countDocuments.mockReturnValueOnce(q(1));
    userModel.findById.mockReturnValue(q({ _id: 'u1' }));

    await service.removeStrike('s1', 'admin1');

    expect(strikeDoc.isActive).toBe(false);
    expect(strikeDoc.save).toHaveBeenCalled();
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith('u1', {
      $set: { strikeCount: 1 },
    });
  });
});
