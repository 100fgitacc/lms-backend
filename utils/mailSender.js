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

const nodemailer = require('nodemailer');

// const mailSender = async (email, title, body) => {
//     try {
//         // Тестовый OTP (можно заменить на реальный случайный генератор)
//         const otp = 123456;  // Генерация 6-значного числа

//         // Логируем OTP вместо отправки email
//         console.log(`Generated OTP for testing: ${otp}`);

//         // Если хотите, чтобы OTP был отправлен клиенту, просто возвращайте его
//         return { success: true, otp };  // Отправляем OTP в ответ
//     }
//     catch (error) {
//         console.log('Error while sending mail (mailSender) - ', email);
//         return { success: false, message: 'Failed to generate OTP' };
//     }
// }

// module.exports = mailSender;