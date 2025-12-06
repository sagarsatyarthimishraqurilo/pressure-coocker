const nodemailer = require('nodemailer');



const verifyEmail = async (email, token) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    const mailConfigurations = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Email Verification',
        text: `Hi!, There, You have recently visited our website and you have requested for email verification.
         Please click on the link below to verify your email:
         https://localhost:5173/verify-email?token=${token}`
    }

    try {
        await transporter.sendMail(mailConfigurations);
        console.log('Email sent successfully');
    } catch (error) {
        console.log('Email not sent', error);
    }
}

module.exports = verifyEmail;