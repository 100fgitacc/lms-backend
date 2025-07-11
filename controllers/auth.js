// sendOtp , signup , login ,  changePassword
const User = require('./../models/user');
const Profile = require('./../models/profile');
const optGenerator = require('otp-generator');
const OTP = require('../models/OTP')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const cookie = require('cookie');
const mailSender = require('../utils/mailSender');
const otpTemplate = require('../mail/templates/emailVerificationTemplate');
const { passwordUpdated } = require("../mail/templates/passwordUpdate");

// ================ SEND-OTP For Email Verification ================
exports.sendOTP = async (req, res) => {
    try {

        // fetch email from re.body 
        const { email } = req.body;

        // check user already exist ?
        const checkUserPresent = await User.findOne({ email });

        // if exist then response
        if (checkUserPresent) {
            console.log('(when otp generate) User alreay registered')
            return res.status(401).json({
                success: false,
                message: 'User is Already Registered'
            })
        }

        // generate Otp
        const otp = optGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false
        })
        console.log('Your otp - ', otp);

        const name = email.split('@')[0].split('.').map(part => part.replace(/\d+/g, '')).join(' ');
        console.log(name);

        // send otp in mail
        await mailSender(email, 'OTP Verification Email', otpTemplate(otp, name));

        // create an entry for otp in DB
        const otpBody = await OTP.create({ email, otp });
        // console.log('otpBody - ', otpBody);



        // return response successfully
        res.status(200).json({
            success: true,
            otp,
            message: 'Otp sent successfully'
        });
    }

    catch (error) {
        console.log('Error while generating Otp - ', error);
        res.status(200).json({
            success: false,
            message: 'Error while generating Otp',
            error: error.mesage
        });
    }
}


// ================ SIGNUP ================
exports.signup = async (req, res) => {
    try {
        // extract data 
        const { firstName, lastName, email, password, confirmPassword,
            accountType, contactNumber, otp } = req.body;
            console.log(firstName, lastName, email, password, confirmPassword,
                accountType, contactNumber, otp );
            

        // validation
        if (!firstName || !lastName || !email || !password || !confirmPassword || !accountType || !otp) {
            return res.status(401).json({
                success: false,
                message: 'All fields are required..!'
            });
        }

        // check both pass matches or not
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Password & confirm password do not match, please try again..!'
            });
        }

        // check if user is already registered
        const checkUserAlreadyExists = await User.findOne({ email });

        if (checkUserAlreadyExists) {
            return res.status(400).json({
                success: false,
                message: 'User is already registered, please go to the login page.'
            });
        }

        // find the most recent OTP stored for the user in DB
        // const recentOtp = await OTP.findOne({ email }).sort({ createdAt: -1 }).limit(1);

        // // if OTP not found
        // if (!recentOtp) {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'OTP not found, please try again.'
        //     });
        // } else if (otp.toString() !== recentOtp.otp.toString()) {
        //     // OTP is invalid
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Invalid OTP.'
        //     });
        // }

        // hash the password securely
        let hashedPassword = await bcrypt.hash(password, 10);

        // create additional profile details
        const profileDetails = await Profile.create({
            gender: null, dateOfBirth: null, about: null, contactNumber: null
        });

        // determine account approval status based on accountType
        let approved = accountType === "Instructor" ? false : true;

        // create the user in the DB
        const userData = await User.create({
            firstName, lastName, email, password: hashedPassword, contactNumber,
            accountType, additionalDetails: profileDetails._id,
            approved: approved,
            image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`
        });

        // return success message
        res.status(200).json({
            success: true,
            message: 'User registered successfully.'
        });
    }
    catch (error) {
        console.log('Error while registering user (signup)');
        console.log(error);
        res.status(401).json({
            success: false,
            error: error.message,
            message: 'User could not be registered, please try again!'
        });
    }
}



// ================ LOGIN ================
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // check user is registered and saved data in DB
        let user = await User.findOne({ email }).populate('additionalDetails');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'You are not registered with us'
            });
        }


        // comapare given password and saved password from DB
        if (await bcrypt.compare(password, user.password)) {
            const payload = {
                email: user.email,
                id: user._id,
                accountType: user.accountType // This will help to check whether user have access to route, while authorzation
            };

            // Generate token 
            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn: "24h",
            });

            user = user.toObject();
            user.token = token;
            user.password = undefined; // we have remove password from object, not DB


            // cookie
            const cookieOptions = {
                expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
                httpOnly: true
            }

            res.cookie('token', token, cookieOptions).status(200).json({
                success: true,
                user,
                token,
                message: 'User logged in successfully'
            });
        }
        // password not match
        else {
            return res.status(401).json({
                success: false,
                message: 'Password not matched'
            });
        }
    }

    catch (error) {
        console.log('Error while Login user');
        console.log(error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error while Login user'
        })
    }
}
// ================ LOGIN  WITH CAPTCHA ================

// exports.login = async (req, res) => {
//   try {
//     const { email, password, recaptcha } = req.body;

//     const secretKey = process.env.RECAPTCHA_SECRET_KEY;
//     const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptcha}`;

//     const captchaRes = await fetch(verifyURL, { method: "POST" });
//     const captchaData = await captchaRes.json();

//     if (!captchaData.success || captchaData.score < 0.5) {
//       return res.status(403).json({
//         success: false,
//         message: "reCAPTCHA verification failed. Possibly a bot.",
//       });
//     }
//     if (!email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "All fields are required",
//       });
//     }

//     let user = await User.findOne({ email }).populate("additionalDetails");

//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: "You are not registered with us",
//       });
//     }

//     if (await bcrypt.compare(password, user.password)) {
//       const payload = {
//         email: user.email,
//         id: user._id,
//         accountType: user.accountType,
//       };

//       const token = jwt.sign(payload, process.env.JWT_SECRET, {
//         expiresIn: "24h",
//       });

//       user = user.toObject();
//       user.token = token;
//       user.password = undefined;

//       const cookieOptions = {
//         expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
//         httpOnly: true,
//       };

//       res.cookie("token", token, cookieOptions).status(200).json({
//         success: true,
//         user,
//         token,
//         message: "User logged in successfully",
//       });
//     } else {
//       return res.status(401).json({
//         success: false,
//         message: "Password not matched",
//       });
//     }
//   } catch (error) {
//     console.log("Error while Login user");
//     console.log(error);
//     res.status(500).json({
//       success: false,
//       error: error.message,
//       message: "Error while Login user",
//     });
//   }
// };


// ================ CHANGE PASSWORD ================
exports.changePassword = async (req, res) => {
    try {
        // extract data
        const { oldPassword, newPassword, confirmNewPassword } = req.body;

        // validation
        if (!oldPassword || !newPassword || !confirmNewPassword) {
            return res.status(403).json({
                success: false,
                message: 'All fileds are required'
            });
        }

        // get user
        const userDetails = await User.findById(req.user.id);

        // validate old passowrd entered correct or not
        const isPasswordMatch = await bcrypt.compare(
            oldPassword,
            userDetails.password
        )

        // if old password not match 
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false, message: "Old password is Incorrect"
            });
        }

        // check both passwords are matched
        if (newPassword !== confirmNewPassword) {
            return res.status(403).json({
                success: false,
                message: 'The password and confirm password do not match'
            })
        }


        // hash password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // update in DB
        const updatedUserDetails = await User.findByIdAndUpdate(req.user.id,
            { password: hashedPassword },
            { new: true });


        // send email
        try {
            const emailResponse = await mailSender(
                updatedUserDetails.email,
                'Password for your account has been updated',
                passwordUpdated(
                    updatedUserDetails.email,
                    `Password updated successfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
                )
            );
            // console.log("Email sent successfully:", emailResponse);
        }
        catch (error) {
            console.error("Error occurred while sending email:", error);
            return res.status(500).json({
                success: false,
                message: "Error occurred while sending email",
                error: error.message,
            });
        }


        // return success response
        res.status(200).json({
            success: true,
            mesage: 'Password changed successfully'
        });
    }

    catch (error) {
        console.log('Error while changing passowrd');
        console.log(error)
        res.status(500).json({
            success: false,
            error: error.message,
            messgae: 'Error while changing passowrd'
        })
    }
}