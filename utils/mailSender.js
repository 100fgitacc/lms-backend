const nodemailer = require('nodemailer');

const mailSender = async (email, title, body) => {
    try {
        const transporter = nodemailer.createTransport({
            host: "mail.adm.tools",
            port: 465,
            secure: true,
            auth: {
                user: "admin@eternex.io",
                pass: "ECy2L72ru4",
            },
        });

        const info = await transporter.sendMail({
            from: 'Eternex',
            to: email,
            subject: title,
            html: body
        });

        // console.log('Info of sent mail - ', info);
        return info;
    }
    catch (error) {
        console.log('Error while sending mail (mailSender) - ', email);
    }
}

module.exports = mailSender;
