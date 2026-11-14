import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  SellApiExceptionFilter,
  validatorMessagesToFields,
} from './sell-api-exception.filter';
import { FieldValidationException } from '../errors/api-errors';

describe('SellApiExceptionFilter', () => {
  const filter = new SellApiExceptionFilter();

  it('maps class-validator messages to field keys', () => {
    expect(
      validatorMessagesToFields([
        'data.price must be a number conforming to the specified constraints',
        'data.each value in images must be a string',
        'vehicle.year must be a number conforming to the specified constraints',
        'category must be a string',
      ]),
    ).toEqual({
      'data.price': 'Enter a price above ₹0',
      'data.images': 'Photos must be uploaded through the app',
      'vehicle.year': 'Choose a valid year',
      category: 'Choose a category',
    });
  });

  it('turns a ValidationPipe 400 into 422 VALIDATION_FAILED', () => {
    const body = filter.toBody(
      new BadRequestException(['data.price must not be less than 0']),
    );
    expect(body).toEqual({
      statusCode: 422,
      code: 'VALIDATION_FAILED',
      message: 'Some details need fixing',
      fields: { 'data.price': 'Enter a price above ₹0' },
    });
  });

  it('passes FieldValidationException fields through', () => {
    const body = filter.toBody(new FieldValidationException({ 'vehicle.color': 'Choose a colour' }));
    expect(body.statusCode).toBe(422);
    expect(body.fields).toEqual({ 'vehicle.color': 'Choose a colour' });
  });

  it('SuspensionGuard 403 → ACCOUNT_SUSPENDED with the reason', () => {
    const msg = 'Your account is suspended. You cannot create, edit or boost ads until the suspension ends.';
    const body = filter.toBody(new ForbiddenException(msg));
    expect(body).toEqual({ statusCode: 403, code: 'ACCOUNT_SUSPENDED', message: msg });
  });

  it('429 → RATE_LIMITED', () => {
    const body = filter.toBody(
      new HttpException({ message: 'Too many attempts.' }, HttpStatus.TOO_MANY_REQUESTS),
    );
    expect(body.code).toBe('RATE_LIMITED');
  });

  it('unknown errors → 500 INTERNAL with a traceId', () => {
    jest.spyOn((filter as any).logger, 'error').mockImplementation(() => undefined);
    const body = filter.toBody(new Error('boom'), { method: 'POST', url: '/v2/ads' });
    expect(body.statusCode).toBe(500);
    expect(body.code).toBe('INTERNAL');
    expect(body.traceId).toMatch(/[0-9a-f-]{36}/);
    expect(body.message).not.toContain('boom');
  });
});
