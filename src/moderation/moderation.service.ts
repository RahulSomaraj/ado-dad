import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { User, ModerationStatus } from '../users/schemas/user.schema';
import { Ad } from '../ads/schemas/ad.schema';
import { UserReport } from '../users/schemas/user-report.schema';
import { UserStrike } from './schemas/user-strike.schema';
import {
  Suspension,
  SuspensionStatus,
  SuspensionType,
} from './schemas/suspension.schema';
import {
  AdminActionLog,
  AdminActionTargetType,
  AdminActionType,
} from './schemas/admin-action-log.schema';
import {
  DEFAULT_STRIKE_THRESHOLDS,
  ModerationSettings,
  ThresholdAction,
} from './schemas/moderation-settings.schema';
import { Appeal, AppealStatus } from './schemas/appeal.schema';
import { FcmNotificationService } from '../notifications/fcm/fcm-notification.service';
import { EmailService } from '../utils/email.service';
import {
  AddStrikeDto,
  BanUserDto,
  CreateAppealDto,
  ModerationListQueryDto,
  RemoveAdDto,
  ReviewAppealDto,
  SuspendUserDto,
  UpdateSettingsDto,
} from './dto/moderation.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ModerationService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Ad.name) private readonly adModel: Model<Ad>,
    @InjectModel(UserReport.name)
    private readonly reportModel: Model<UserReport>,
    @InjectModel(UserStrike.name)
    private readonly strikeModel: Model<UserStrike>,
    @InjectModel(Suspension.name)
    private readonly suspensionModel: Model<Suspension>,
    @InjectModel(AdminActionLog.name)
    private readonly actionLogModel: Model<AdminActionLog>,
    @InjectModel(ModerationSettings.name)
    private readonly settingsModel: Model<ModerationSettings>,
    @InjectModel(Appeal.name) private readonly appealModel: Model<Appeal>,
    private readonly fcm: FcmNotificationService,
    private readonly email: EmailService,
  ) {}

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  /** Coerce query paging to numbers (global ValidationPipe has transform off). */
  private parsePaging(query: ModerationListQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    return { page, limit };
  }

  private pageMeta(total: number, page: number, limit: number) {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  private async audit(
    actor: string | Types.ObjectId,
    actionType: AdminActionType,
    targetType: AdminActionTargetType,
    targetId?: string | Types.ObjectId,
    extra: {
      report?: string | Types.ObjectId;
      metadata?: Record<string, any>;
      notes?: string;
    } = {},
  ) {
    await this.actionLogModel.create({
      actor,
      actionType,
      targetType,
      targetId: targetId ? targetId.toString() : undefined,
      report: extra.report,
      metadata: extra.metadata,
      notes: extra.notes,
    });
  }

  /** Best-effort push + email notification; never throws. */
  private async notify(
    userId: string | Types.ObjectId,
    title: string,
    body: string,
    data: Record<string, any> = {},
  ) {
    const settings = await this.getSettings();
    if (settings.notifyByPush) {
      try {
        await this.fcm.sendToUser(userId.toString(), title, body, data);
      } catch {
        /* swallow notification failures */
      }
    }
    if (settings.notifyByEmail) {
      try {
        const user = await this.userModel
          .findById(userId)
          .select('email')
          .lean();
        if (user?.email) {
          await this.email.sendEmail({ to: user.email, subject: title, text: body });
        }
      } catch {
        /* swallow */
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  async getSettings(): Promise<ModerationSettings> {
    let settings = await this.settingsModel.findOne({ key: 'global' });
    if (!settings) {
      settings = await this.settingsModel.create({
        key: 'global',
        thresholds: DEFAULT_STRIKE_THRESHOLDS,
      });
    }
    return settings;
  }

  async updateSettings(dto: UpdateSettingsDto, adminId: string) {
    const before = await this.getSettings();
    const update: Record<string, any> = { updatedBy: adminId };
    if (dto.thresholds) update.thresholds = dto.thresholds;
    if (dto.notifyByEmail !== undefined) update.notifyByEmail = dto.notifyByEmail;
    if (dto.notifyByPush !== undefined) update.notifyByPush = dto.notifyByPush;

    const updated = await this.settingsModel.findOneAndUpdate(
      { key: 'global' },
      { $set: update },
      { new: true, upsert: true },
    );
    await this.audit(
      adminId,
      AdminActionType.UPDATE_SETTINGS,
      AdminActionTargetType.SETTINGS,
      'global',
      { metadata: { before: before.thresholds, after: updated.thresholds } },
    );
    return updated;
  }

  // ---------------------------------------------------------------------------
  // Strikes
  // ---------------------------------------------------------------------------
  async addStrike(userId: string, dto: AddStrikeDto, adminId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const newLevel = (user.strikeCount || 0) + 1;
    const strike = await this.strikeModel.create({
      user: userId,
      report: dto.reportId,
      level: newLevel,
      reason: dto.reason,
      issuedBy: adminId,
      notes: dto.notes,
    });

    user.strikeCount = newLevel;
    await user.save();

    await this.audit(
      adminId,
      AdminActionType.ADD_STRIKE,
      AdminActionTargetType.USER,
      userId,
      { report: dto.reportId, notes: dto.notes, metadata: { level: newLevel } },
    );

    await this.applyThreshold(userId, newLevel, adminId, {
      reportId: dto.reportId,
      strikeId: strike._id.toString(),
    });

    return this.getModerationProfile(userId);
  }

  /** Apply the configured action for the strike level the user just reached. */
  private async applyThreshold(
    userId: string,
    level: number,
    adminId: string,
    ctx: { reportId?: string; strikeId?: string },
  ) {
    const settings = await this.getSettings();
    const threshold = settings.thresholds.find((t) => t.level === level);

    if (!threshold) {
      await this.notify(
        userId,
        'Strike added',
        `You received a strike. You now have ${level} strikes.`,
      );
      return;
    }

    switch (threshold.action) {
      case ThresholdAction.WARNING:
        await this.notify(
          userId,
          'Warning issued',
          `Warning: your content violated our policies (strike ${level}).`,
        );
        break;
      case ThresholdAction.NOTIFY:
        await this.notify(
          userId,
          'Strike notice',
          `You now have ${level} strikes. Further violations may lead to suspension.`,
        );
        break;
      case ThresholdAction.SUSPEND:
        await this.createSuspension({
          userId,
          type: SuspensionType.TEMPORARY,
          reason: `Automatic suspension (strike ${level})`,
          durationDays: threshold.durationDays ?? 7,
          issuedBy: adminId,
          isAutomatic: true,
          relatedReport: ctx.reportId,
          relatedStrike: ctx.strikeId,
        });
        break;
      case ThresholdAction.BAN:
        await this.createSuspension({
          userId,
          type: SuspensionType.PERMANENT_BAN,
          reason: `Permanent ban (strike ${level})`,
          issuedBy: adminId,
          isAutomatic: true,
          relatedReport: ctx.reportId,
          relatedStrike: ctx.strikeId,
        });
        break;
    }
  }

  async removeStrike(strikeId: string, adminId: string) {
    const strike = await this.strikeModel.findById(strikeId);
    if (!strike || !strike.isActive) {
      throw new NotFoundException('Active strike not found');
    }
    strike.isActive = false;
    strike.revokedBy = new Types.ObjectId(adminId);
    strike.revokedAt = new Date();
    await strike.save();

    const count = await this.strikeModel.countDocuments({
      user: strike.user,
      isActive: true,
    });
    await this.userModel.findByIdAndUpdate(strike.user, {
      $set: { strikeCount: count },
    });

    await this.audit(
      adminId,
      AdminActionType.REMOVE_STRIKE,
      AdminActionTargetType.USER,
      strike.user,
      { metadata: { strikeId } },
    );
    return this.getModerationProfile(strike.user.toString());
  }

  async getStrikes(userId: string, query: ModerationListQueryDto) {
    const { page, limit } = this.parsePaging(query);
    const filter = { user: new Types.ObjectId(userId) };
    const [data, total] = await Promise.all([
      this.strikeModel
        .find(filter)
        .populate('issuedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.strikeModel.countDocuments(filter),
    ]);
    return { data, ...this.pageMeta(total, page, limit) };
  }

  // ---------------------------------------------------------------------------
  // Suspensions / ban
  // ---------------------------------------------------------------------------
  private async createSuspension(opts: {
    userId: string;
    type: SuspensionType;
    reason: string;
    durationDays?: number;
    issuedBy: string;
    isAutomatic?: boolean;
    relatedReport?: string;
    relatedStrike?: string;
    notes?: string;
  }) {
    const isBan = opts.type === SuspensionType.PERMANENT_BAN;
    const endsAt = isBan
      ? undefined
      : new Date(Date.now() + (opts.durationDays ?? 7) * DAY_MS);

    // Replace any currently active suspension.
    await this.suspensionModel.updateMany(
      { user: opts.userId, status: SuspensionStatus.ACTIVE },
      { $set: { status: SuspensionStatus.LIFTED, liftedAt: new Date() } },
    );

    const suspension = await this.suspensionModel.create({
      user: opts.userId,
      type: opts.type,
      reason: opts.reason,
      startsAt: new Date(),
      endsAt,
      issuedBy: opts.issuedBy,
      status: SuspensionStatus.ACTIVE,
      isAutomatic: !!opts.isAutomatic,
      relatedReport: opts.relatedReport,
      relatedStrike: opts.relatedStrike,
      notes: opts.notes,
    });

    await this.userModel.findByIdAndUpdate(opts.userId, {
      $set: {
        moderationStatus: isBan
          ? ModerationStatus.BANNED
          : ModerationStatus.SUSPENDED,
        suspendedUntil: endsAt ?? null,
      },
    });

    await this.audit(
      opts.issuedBy,
      isBan ? AdminActionType.BAN_USER : AdminActionType.SUSPEND_USER,
      AdminActionTargetType.USER,
      opts.userId,
      {
        report: opts.relatedReport,
        notes: opts.notes,
        metadata: { endsAt, isAutomatic: !!opts.isAutomatic },
      },
    );

    await this.notify(
      opts.userId,
      isBan ? 'Account banned' : 'Account suspended',
      isBan
        ? 'Your account has been permanently banned for repeated violations.'
        : `Your account is suspended until ${endsAt?.toDateString()}. You can submit an appeal.`,
    );

    return suspension;
  }

  async suspend(userId: string, dto: SuspendUserDto, adminId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    await this.createSuspension({
      userId,
      type: SuspensionType.TEMPORARY,
      reason: dto.reason,
      durationDays: dto.durationDays,
      issuedBy: adminId,
      relatedReport: dto.reportId,
      notes: dto.notes,
    });
    return this.getModerationProfile(userId);
  }

  async ban(userId: string, dto: BanUserDto, adminId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    await this.createSuspension({
      userId,
      type: SuspensionType.PERMANENT_BAN,
      reason: dto.reason,
      issuedBy: adminId,
      relatedReport: dto.reportId,
      notes: dto.notes,
    });
    return this.getModerationProfile(userId);
  }

  async unsuspend(userId: string, adminId: string) {
    await this.suspensionModel.updateMany(
      { user: userId, status: SuspensionStatus.ACTIVE },
      {
        $set: {
          status: SuspensionStatus.LIFTED,
          liftedBy: adminId,
          liftedAt: new Date(),
        },
      },
    );
    await this.userModel.findByIdAndUpdate(userId, {
      $set: { moderationStatus: ModerationStatus.ACTIVE, suspendedUntil: null },
    });
    await this.audit(
      adminId,
      AdminActionType.UNSUSPEND_USER,
      AdminActionTargetType.USER,
      userId,
    );
    await this.notify(
      userId,
      'Suspension lifted',
      'Your account suspension has been lifted. You can post ads again.',
    );
    return this.getModerationProfile(userId);
  }

  async getSuspensions(userId: string, query: ModerationListQueryDto) {
    const { page, limit } = this.parsePaging(query);
    const filter = { user: new Types.ObjectId(userId) };
    const [data, total] = await Promise.all([
      this.suspensionModel
        .find(filter)
        .populate('issuedBy liftedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.suspensionModel.countDocuments(filter),
    ]);
    return { data, ...this.pageMeta(total, page, limit) };
  }

  /** Suspension management list (across all users). */
  async listSuspensions(query: ModerationListQueryDto) {
    const { page, limit } = this.parsePaging(query);
    const filter: Record<string, any> = {};
    if (query.status) filter.status = query.status;

    if (query.search) {
      const users = await this.userModel
        .find({
          $or: [
            { name: { $regex: query.search, $options: 'i' } },
            { email: { $regex: query.search, $options: 'i' } },
          ],
        })
        .select('_id')
        .lean();
      filter.user = { $in: users.map((u) => u._id) };
    }

    const [data, total] = await Promise.all([
      this.suspensionModel
        .find(filter)
        .populate('user', 'name email')
        .populate('issuedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.suspensionModel.countDocuments(filter),
    ]);
    return { data, ...this.pageMeta(total, page, limit) };
  }

  // ---------------------------------------------------------------------------
  // Moderation profile / audit
  // ---------------------------------------------------------------------------
  async getModerationProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select(
        'name email type strikeCount moderationStatus suspendedUntil profilePic createdAt',
      )
      .lean();
    if (!user) throw new NotFoundException('User not found');

    const [activeAds, previousReports, activeStrikes, currentSuspension] =
      await Promise.all([
        this.adModel.countDocuments({
          postedBy: userId,
          isDeleted: { $ne: true },
          isRemovedByAdmin: { $ne: true },
        }),
        this.reportModel.countDocuments({
          reportedUser: userId,
          isDeleted: { $ne: true },
        }),
        this.strikeModel.countDocuments({ user: userId, isActive: true }),
        this.suspensionModel
          .findOne({ user: userId, status: SuspensionStatus.ACTIVE })
          .lean(),
      ]);

    return {
      user,
      stats: {
        activeAds,
        previousReports,
        strikeCount: activeStrikes,
      },
      currentSuspension,
    };
  }

  async getAuditLogs(
    query: ModerationListQueryDto & {
      actor?: string;
      actionType?: string;
      targetId?: string;
    },
  ) {
    const { page, limit } = this.parsePaging(query);
    const filter: Record<string, any> = {};
    if (query.actor) filter.actor = query.actor;
    if (query.actionType) filter.actionType = query.actionType;
    if (query.targetId) filter.targetId = query.targetId;

    const [data, total] = await Promise.all([
      this.actionLogModel
        .find(filter)
        .populate('actor', 'name email type')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.actionLogModel.countDocuments(filter),
    ]);
    return { data, ...this.pageMeta(total, page, limit) };
  }

  // ---------------------------------------------------------------------------
  // Ad removal
  // ---------------------------------------------------------------------------
  async removeAd(adId: string, dto: RemoveAdDto, adminId: string) {
    const ad = await this.adModel.findById(adId);
    if (!ad) throw new NotFoundException('Ad not found');
    if (ad.isRemovedByAdmin) {
      throw new BadRequestException('Ad is already removed');
    }
    ad.isRemovedByAdmin = true;
    ad.isActive = false;
    ad.removedBy = new Types.ObjectId(adminId);
    ad.removedAt = new Date();
    ad.removalReason = dto.reason;
    await ad.save();

    await this.audit(
      adminId,
      AdminActionType.REMOVE_AD,
      AdminActionTargetType.AD,
      adId,
      { metadata: { reason: dto.reason } },
    );
    await this.notify(
      ad.postedBy,
      'Advertisement removed',
      `Your advertisement was removed by an admin. Reason: ${dto.reason}`,
    );
    return ad;
  }

  async restoreAd(adId: string, adminId: string) {
    const ad = await this.adModel.findById(adId);
    if (!ad) throw new NotFoundException('Ad not found');
    ad.isRemovedByAdmin = false;
    ad.isActive = true;
    ad.removedBy = undefined;
    ad.removedAt = undefined;
    ad.removalReason = undefined;
    await ad.save();

    await this.audit(
      adminId,
      AdminActionType.RESTORE_AD,
      AdminActionTargetType.AD,
      adId,
    );
    return ad;
  }

  // ---------------------------------------------------------------------------
  // Appeals
  // ---------------------------------------------------------------------------
  async createAppeal(userId: string, dto: CreateAppealDto) {
    const suspension = await this.suspensionModel.findById(dto.suspensionId);
    if (!suspension) throw new NotFoundException('Suspension not found');
    if (suspension.user.toString() !== userId.toString()) {
      throw new ForbiddenException('You can only appeal your own suspension');
    }
    const existing = await this.appealModel.findOne({
      suspension: dto.suspensionId,
      status: AppealStatus.PENDING,
    });
    if (existing) {
      throw new BadRequestException('An appeal is already pending');
    }
    return this.appealModel.create({
      user: userId,
      suspension: dto.suspensionId,
      message: dto.message,
    });
  }

  async listAppeals(query: ModerationListQueryDto) {
    const { page, limit } = this.parsePaging(query);
    const filter: Record<string, any> = {};
    if (query.appealStatus) filter.status = query.appealStatus;

    const [data, total] = await Promise.all([
      this.appealModel
        .find(filter)
        .populate('user', 'name email moderationStatus suspendedUntil')
        .populate('suspension')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.appealModel.countDocuments(filter),
    ]);
    return { data, ...this.pageMeta(total, page, limit) };
  }

  async reviewAppeal(appealId: string, dto: ReviewAppealDto, adminId: string) {
    const appeal = await this.appealModel.findById(appealId);
    if (!appeal) throw new NotFoundException('Appeal not found');
    if (appeal.status !== AppealStatus.PENDING) {
      throw new BadRequestException('Appeal has already been reviewed');
    }
    appeal.status = dto.decision;
    appeal.reviewedBy = new Types.ObjectId(adminId);
    appeal.reviewedAt = new Date();
    appeal.decisionNote = dto.note;
    await appeal.save();

    if (dto.decision === AppealStatus.APPROVED) {
      await this.unsuspend(appeal.user.toString(), adminId);
    }

    await this.audit(
      adminId,
      AdminActionType.REVIEW_APPEAL,
      AdminActionTargetType.APPEAL,
      appealId,
      { metadata: { decision: dto.decision } },
    );
    await this.notify(
      appeal.user,
      'Appeal reviewed',
      `Your appeal has been ${dto.decision}.`,
    );
    return appeal;
  }
}
