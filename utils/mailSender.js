const nodemailer = require('nodemailer');

const mailSender = async (email, title, body) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, 
            auth: {
              user: 'ayakimtsou@eternex.io',
              pass: 'yuvc gsyd xvdg cysb',
            },
          });

        const info = await transporter.sendMail({
            from: 'Eternex',
            to: email,
            subject: title,
            html: body
        });

        console.log('Info of sent mail - ', info);
        return info;
    }
    catch (error) {
        console.error('Error while sending mail (mailSender) to:', email);
        console.error(error); // <-- Выведет реальную причину
    }
}

module.exports = mailSender;
