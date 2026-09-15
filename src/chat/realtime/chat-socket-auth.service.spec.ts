import * as jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { ChatSocketAuthService } from './chat-socket-auth.service';
import { ModerationStatus } from '../../users/schemas/user.schema';
import { getJwtSecret } from '../../common/jwt-secret.util';

const q = (data: any) => ({ select: () => ({ lean: () => ({ exec: async () => data }) }) });

describe('ChatSocketAuthService', () => {
  const uid = new Types.ObjectId().toString();
  const sign = (opts: jwt.SignOptions = {}) =>
    jwt.sign({ id: uid }, getJwtSecret(), { issuer: 'ado-dad-api', audience: 'ado-dad-users', expiresIn: '1h', ...opts });
  const client = (token?: string) => ({ handshake: { auth: token ? { token: `Bearer ${token}` } : {}, headers: {}, query: {} } }) as any;

  let userModel: any;
  let service: ChatSocketAuthService;
  beforeEach(() => {
    userModel = { findById: jest.fn(() => q({ moderationStatus: ModerationStatus.ACTIVE })) };
    service = new ChatSocketAuthService(userModel);
  });

  it('accepts a valid token and keeps exp', async () => {
    const res: any = await service.authenticate(client(sign()));
    expect(res.ok).toBe(true);
    expect(res.user.id).toBe(uid);
    expect(res.user.exp).toBeGreaterThan(Date.now() / 1000);
  });

  it('reports TOKEN_EXPIRED distinctly', async () => {
    const res = await service.authenticate(client(sign({ expiresIn: -10 })));
    expect(res).toEqual({ ok: false, code: 'TOKEN_EXPIRED' });
  });

  it('rejects wrong audience, missing token and unknown users', async () => {
    expect(await service.authenticate(client(sign({ audience: 'other' })))).toEqual({ ok: false, code: 'UNAUTHORIZED' });
    expect(await service.authenticate(client())).toEqual({ ok: false, code: 'UNAUTHORIZED' });
    userModel.findById = jest.fn(() => q(null));
    expect(await service.authenticate(client(sign()))).toEqual({ ok: false, code: 'UNAUTHORIZED' });
  });

  it('blocks banned and currently suspended users, allows elapsed suspensions', async () => {
    userModel.findById = jest.fn(() => q({ moderationStatus: ModerationStatus.BANNED }));
    expect(await service.authenticate(client(sign()))).toEqual({ ok: false, code: 'SUSPENDED' });
    userModel.findById = jest.fn(() => q({ moderationStatus: ModerationStatus.SUSPENDED, suspendedUntil: new Date(Date.now() - 1000) }));
    expect((await service.authenticate(client(sign()))).ok).toBe(true);
  });
});
