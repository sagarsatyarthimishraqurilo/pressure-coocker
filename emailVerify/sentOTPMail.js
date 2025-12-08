const nodemailer = require('nodemailer');


const sendOTPMail = async (otp, email) =>{
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth:{
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    })
    const mailConfigurations = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Reset Password OTP Verification",
        html: `<p>Your OTP for password reset is: <b>${otp}</b></p>`
    }

    transporter.sendMail(mailConfigurations, function(error, info){
        if(error) throw Error(error);
        console.log("OTP sent successfully");
        console.log(info)
    })
}

module.exports = sendOTPMail;