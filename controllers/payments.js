
const mailSender = require('../utils/mailSender');
const { courseEnrollmentEmail } = require('../mail/templates/courseEnrollmentEmail');
require('dotenv').config();

const User = require('../models/user');
const Course = require('../models/course');
const CourseProgress = require("../models/courseProgress")
const { default: mongoose } = require('mongoose')


const paypal = require('@paypal/checkout-server-sdk');
const environment = new paypal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID, 
    process.env.PAYPAL_CLIENT_SECRET
);
const client = new paypal.core.PayPalHttpClient(environment);

exports.capturePayment = async (req, res) => {
    const { coursesId } = req.body;
    const userId = req.user.id;

    if (coursesId.length === 0) {
        return res.json({ success: false, message: "Please provide Course Id" });
    }

    let totalAmount = 0;
    let course;
    for (const course_id of coursesId) {
        try {
            course = await Course.findById(course_id);
            if (!course) {
                return res.status(404).json({ success: false, message: "Could not find the course" });
            }

            const uid = new mongoose.Types.ObjectId(userId);
            if (course.studentsEnrolled.includes(uid)) {
                return res.status(400).json({ success: false, message: "Student is already Enrolled" });
            }
            totalAmount += course.price;
        } catch (error) {
            console.log(error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
    if ( totalAmount <= 0 ) {
        res.status(200).json({
            success: true,
            message: "Free course added",  // Ответ с деталями заказа
            amount: totalAmount  // Сумма, которую нужно оплатить
        });
    }else{
        const orderRequest = new paypal.orders.OrdersCreateRequest();
        orderRequest.requestBody({
            intent: 'CAPTURE',  
            purchase_units: [{
                amount: {
                    currency_code: 'USD', 
                    value: totalAmount.toFixed(2)  
                }
            }]
        });
        try {
            const orderResponse = await client.execute(orderRequest);

            res.status(200).json({
                success: true,
                message: orderResponse.result,  
                amount: totalAmount  
            });
        } catch (error) {
            console.log(error);
            return res.status(500).json({ success: false, message: "Could not initiate PayPal order" });
        }
    }
   

    
   
};

// ================ verify the payment ================
exports.verifyPayment = async (req, res) => {
    const { id, coursesId, status } = req.body;
    const userId = req.user.id;


    if (!id || !coursesId || !userId) {
        return res.status(400).json({ success: false, message: "Payment Failed, data not found" });
    }

    try {
        if (status === 'COMPLETED' && id === 'FREE_ORDER_ID') {
            await enrollStudents(coursesId, userId, res);
            return res.status(200).json({ success: true, message: "Free course enrollment completed" });
        }

        const request = new paypal.orders.OrdersGetRequest(id);

        const order = await client.execute(request);

        if (order.result.status === 'COMPLETED') {
            await enrollStudents(coursesId, userId, res);
            return res.status(200).json({ success: true, message: "Payment Verified" });
        } else {
            return res.status(400).json({ success: false, message: "Payment failed" });
        }
    } catch (error) {
        console.error("Error during payment verification:", error);
        return res.status(500).json({ success: false, message: "Payment Verification Failed" });
    }
};



// ================ enroll Students to course after payment ================
const enrollStudents = async (courses, userId, res) => {
    if (!courses || !userId) {
        return res.status(400).json({ success: false, message: "Please Provide data for Courses or UserId" });
    }

    for (const courseId of courses) {
        try {
            const enrolledCourse = await Course.findOneAndUpdate(
                { _id: courseId },
                { $push: { studentsEnrolled: userId } },
                { new: true }
            );

            if (!enrolledCourse) {
                return res.status(500).json({ success: false, message: "Course not Found" });
            }

            const courseProgress = await CourseProgress.create({
                courseID: courseId,
                userId: userId,
                completedVideos: [],
            });

            const enrolledStudent = await User.findByIdAndUpdate(
                userId,
                {
                    $push: {
                        courses: courseId,
                        courseProgress: courseProgress._id,
                    },
                },
                { new: true }
            );

            // const emailResponse = await mailSender(
            //     enrolledStudent.email,
            //     `Successfully Enrolled into ${enrolledCourse.courseName}`,
            //     courseEnrollmentEmail(enrolledCourse.courseName, `${enrolledStudent.firstName}`)
            // );
        } catch (error) {
            console.log(error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}

// ================ send Payment Success Email ================
exports.sendPaymentSuccessEmail = async (req, res) => {
    const { orderId, paymentId, amount } = req.body;
    const userId = req.user.id;

    if (!orderId || !paymentId || !amount || !userId) {
        return res.status(400).json({ success: false, message: "Please provide all the fields" });
    }

    try {
        const enrolledStudent = await User.findById(userId);
        await mailSender(
            enrolledStudent.email,
            `Payment Received`,
            paymentSuccessEmail(`${enrolledStudent.firstName}`, amount / 100, orderId, paymentId)
        );
    } catch (error) {
        console.log("Error in sending email", error);
        return res.status(500).json({ success: false, message: "Could not send email" });
    }
}
