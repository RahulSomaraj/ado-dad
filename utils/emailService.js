const nodemailer = require('nodemailer');

const sendOtp = async (email, otp) => {
  // Configure the SMTP transport
  const transporter = nodemailer.createTransport({
    service: 'gmail', // You can use other services like 'smtp.mailtrap.io', 'sendgrid', etc.
    auth: {
      user: process.env.EMAIL_USER, // Your email address (e.g., 'your-email@gmail.com')
      pass: process.env.EMAIL_PASS, // Your email password or application-specific password
    },
  });

  // Email options
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
  };

  try {
    // Send the email
    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${email}`);
  } catch (error) {
    console.error(`Error sending OTP to ${email}:`, error);
    throw new Error('Unable to send OTP');
  }
};

module.exports = { sendOtp };
