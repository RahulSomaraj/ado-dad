export const EMAIL_TEMPLATES = {
  FORGOT_PASSWORD: {
    subject: 'Reset Your Password - AdoDad',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
          }
          .subtitle {
            color: #7f8c8d;
            font-size: 14px;
          }
          .content {
            margin-bottom: 30px;
          }
          .reset-button {
            display: inline-block;
            background-color: #3498db;
            color: #ffffff;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            transition: background-color 0.3s ease;
          }
          .reset-button:hover {
            background-color: #2980b9;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ecf0f1;
            text-align: center;
            color: #7f8c8d;
            font-size: 12px;
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .expiry {
            color: #e74c3c;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">AdoDad</div>
            <div class="subtitle">Your Trusted Marketplace</div>
          </div>
          
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hello,</p>
            <p>We received a request to reset your password for your AdoDad account. If you made this request, click the button below to reset your password:</p>
            
            <div style="text-align: center;">
              <a href="{{resetLink}}" class="reset-button">Reset My Password</a>
            </div>
            
            <div class="warning">
              <strong>Important:</strong> This password reset link will expire in <span class="expiry">24 hours</span> for security reasons.
            </div>
            
            <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            
            <p>For security reasons, please:</p>
            <ul>
              <li>Don't share this link with anyone</li>
              <li>Use a strong, unique password</li>
              <li>Contact our support team if you have any concerns</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>This email was sent from AdoDad - Your Trusted Marketplace</p>
            <p>If you have any questions, please contact our support team.</p>
            <p>&copy; 2024 AdoDad. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Password Reset Request - AdoDad
      
      Hello,
      
      We received a request to reset your password for your AdoDad account. If you made this request, please click the link below to reset your password:
      
      {{resetLink}}
      
      IMPORTANT: This password reset link will expire in 1 hours for security reasons.
      
      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
      
      For security reasons, please:
      - Don't share this link with anyone
      - Use a strong, unique password
      - Contact our support team if you have any concerns
      
      This email was sent from AdoDad - Your Trusted Marketplace
      If you have any questions, please contact our support team.
      
      © 2025 AdoDad. All rights reserved.
    `,
  },
} as const;

// Template variables that need to be replaced
export const EMAIL_TEMPLATE_VARIABLES = {
  FORGOT_PASSWORD: {
    resetLink: '{{resetLink}}', // Replace with actual reset link
  },
} as const;
