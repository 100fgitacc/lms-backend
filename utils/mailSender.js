const nodemailer = require('nodemailer');

const mailSender = async (email, title, body) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'mail.adm.tools',
            port: 465,
            secure: true, 
            auth: {
              user: 'info@eternex.io',
              pass: 'Jd9Ac4jK98',
            },
          });

        const info = await transporter.sendMail({
            from: '"OTP Verification Email" <info@eternex.io>',
            to: email,
            subject: title,
            html: body
        });

        console.log('Info of sent mail - ', info);
        return info;
    }
    catch (error) {
        console.error('Error while sending mail (mailSender) to:', email);
        console.error(error); 
    }
}

module.exports = mailSender;
