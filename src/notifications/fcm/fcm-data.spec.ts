import { FcmNotificationService } from './fcm-notification.service';

describe('FcmNotificationService - formatData', () => {
    let fcmNotificationService: FcmNotificationService;

    beforeEach(() => {
        // Mock dependencies
        fcmNotificationService = new FcmNotificationService(null as any, null as any, null as any);
    });

    it('should stringify nested objects', () => {
        const data = {
            type: 'global',
            screen: 'home',
            payload: {
                nested: true,
                key: 'value'
            }
        };

        const result = fcmNotificationService.formatData(data);

        expect(typeof result.type).toBe('string');
        expect(result.type).toBe('global');
        expect(typeof result.payload).toBe('string');
        expect(result.payload).toBe('{"nested":true,"key":"value"}');
    });

    it('should convert numbers and booleans to strings', () => {
        const data = {
            id: 123,
            isActive: true
        } as any;

        const result = fcmNotificationService.formatData(data);

        expect(result.id).toBe('123');
        expect(result.isActive).toBe('true');
    });

    it('should skip null and undefined values', () => {
        const data = {
            present: 'value',
            absent: null,
            missing: undefined
        };

        const result = fcmNotificationService.formatData(data);

        expect(result.present).toBe('value');
        expect(result.absent).toBeUndefined();
        expect(result.missing).toBeUndefined();
    });

    it('should return empty object for null data', () => {
        const result = fcmNotificationService.formatData(null as any);
        expect(result).toEqual({});
    });
});
