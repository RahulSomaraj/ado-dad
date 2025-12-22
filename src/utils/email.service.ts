import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export class EmailService {
  private sesClient = new SESClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });

  async sendOtp(email: string, otp: string): Promise<void> {
    const input = {
      Source: process.env.SES_FROM_EMAIL || process.env.EMAIL_USER,
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: 'Your OTP Code',
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
            Charset: 'UTF-8',
          },
        },
      },
    };

    const command = new SendEmailCommand(input);

    try {
      await this.sesClient.send(command);
    } catch (error) {
      console.error(`Error sending OTP to ${email}:`, error);
      throw new Error('Unable to send OTP');
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const input = {
      Source: process.env.SES_FROM_EMAIL || process.env.EMAIL_USER,
      Destination: {
        ToAddresses: [options.to],
      },
      Message: {
        Subject: {
          Data: options.subject,
          Charset: 'UTF-8',
        },
        Body: {
          ...(options.text && {
            Text: {
              Data: options.text,
              Charset: 'UTF-8',
            },
          }),
          ...(options.html && {
            Html: {
              Data: options.html,
              Charset: 'UTF-8',
            },
          }),
        },
      },
    };

    const command = new SendEmailCommand(input);

    try {
      await this.sesClient.send(command);
    } catch (error) {
      console.error(`Error sending email to ${options.to}:`, error);
      throw new Error('Unable to send email');
    }
  }
}
