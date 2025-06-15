const Profile = require('../models/profile');
const User = require('../models/user');
const CourseProgress = require('../models/courseProgress')
const Course = require('../models/course')

const { uploadImageToCloudinary, deleteResourceFromCloudinary } = require('../utils/imageUploader');
const { convertSecondsToDuration } = require('../utils/secToDuration')




// ================ update Profile ================
exports.updateProfile = async (req, res) => {
    try {
        // extract data
        const { gender = '', dateOfBirth = "", about = "", contactNumber = '', firstName, lastName } = req.body;

        // extract userId
        const userId = req.user.id;


        // find profile
        const userDetails = await User.findById(userId);
        const profileId = userDetails.additionalDetails;
        const profileDetails = await Profile.findById(profileId);

        // console.log('User profileDetails -> ', profileDetails);

        // Update the profile fields
        userDetails.firstName = firstName;
        userDetails.lastName = lastName;
        await userDetails.save()

        profileDetails.gender = gender;
        profileDetails.dateOfBirth = dateOfBirth;
        profileDetails.about = about;
        profileDetails.contactNumber = contactNumber;

        // save data to DB
        await profileDetails.save();

        const updatedUserDetails = await User.findById(userId)
            .populate({
                path: 'additionalDetails'
            })
        // console.log('updatedUserDetails -> ', updatedUserDetails);

        // return response
        res.status(200).json({
            success: true,
            updatedUserDetails,
            message: 'Profile updated successfully'
        });
    }
    catch (error) {
        console.log('Error while updating profile');
        console.log(error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error while updating profile'
        })
    }
}


// ================ delete Account ================
exports.deleteAccount = async (req, res) => {
    try {
        // extract user id
        const userId = req.user.id;
        // console.log('userId = ', userId)

        // validation
        const userDetails = await User.findById(userId);
        if (!userDetails) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // delete user profile picture From Cloudinary
        await deleteResourceFromCloudinary(userDetails.image);

        // if any student delete their account && enrollded in any course then ,
        // student entrolled in particular course sholud be decreae by one
        // user - courses - studentsEnrolled
        const userEnrolledCoursesId = userDetails.courses
        console.log('userEnrolledCourses ids = ', userEnrolledCoursesId)

        for (const courseId of userEnrolledCoursesId) {
            await Course.findByIdAndUpdate(courseId, {
                $pull: { studentsEnrolled: userId }
            })
        }

        // first - delete profie (profileDetails)
        await Profile.findByIdAndDelete(userDetails.additionalDetails);

        // second - delete account
        await User.findByIdAndDelete(userId);


        // sheduale this deleting account , crone job

        // return response
        res.status(200).json({
            success: true,
            message: 'Account deleted successfully'
        })
    }
    catch (error) {
        console.log('Error while updating profile');
        console.log(error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error while deleting profile'
        })
    }
}


// ================ get details of user ================
exports.getUserDetails = async (req, res) => {
    try {
        // extract userId
        const userId = req.user.id;
        console.log('id - ', userId);

        // get user details
        const userDetails = await User.findById(userId).populate('additionalDetails').exec();

        // return response
        res.status(200).json({
            success: true,
            data: userDetails,
            message: 'User data fetched successfully'
        })
    }
    catch (error) {
        console.log('Error while fetching user details');
        console.log(error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error while fetching user details'
        })
    }
}



// ================ Update User profile Image ================
exports.updateUserProfileImage = async (req, res) => {
    try {
        const profileImage = req.files?.profileImage;
        const userId = req.user.id;

        // validation
        // console.log('profileImage = ', profileImage)

        // upload imga eto cloudinary
        const image = await uploadImageToCloudinary(profileImage,
            process.env.FOLDER_NAME, 1000, 1000);

        // console.log('image url - ', image);

        // update in DB 
        const updatedUserDetails = await User.findByIdAndUpdate(userId,
            { image: image.secure_url },
            { new: true }
        )
            .populate({
                path: 'additionalDetails'

            })

        // success response
        res.status(200).json({
            success: true,
            message: `Image Updated successfully`,
            data: updatedUserDetails,
        })
    }
    catch (error) {
        console.log('Error while updating user profile image');
        console.log(error);
        return res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error while updating user profile image',
        })
    }
}




// ================ Get Enrolled Courses ================
exports.getEnrolledCourses = async (req, res) => {
    try {
        const userId = req.user.id

        let userDetails = await User.findOne({ _id: userId })
            .populate({
                path: "courses",
                populate: {
                    path: "courseContent",
                    populate: {
                        path: "subSection",
                    },
                },
            })
            .exec()

        if (!userDetails) {
            console.log(`User not found with id: ${userId}`)
            return res.status(400).json({
                success: false,
                message: `Could not find user with id: ${userId}`,
            })
        }


        userDetails = userDetails.toObject()
        var SubsectionLength = 0

        for (var i = 0; i < userDetails.courses.length; i++) {
            let totalDurationInSeconds = 0
            SubsectionLength = 0

            for (var j = 0; j < userDetails.courses[i].courseContent.length; j++) {
           
                // Calculate total duration of course content
                totalDurationInSeconds += userDetails.courses[i].courseContent[j].subSection.reduce(
                    (acc, curr) => acc + parseInt(curr.timeDuration),
                    0
                )

                // Convert total duration to human-readable format
                userDetails.courses[i].totalDuration = convertSecondsToDuration(totalDurationInSeconds)

                // Count total number of subsections
                SubsectionLength += userDetails.courses[i].courseContent[j].subSection.length
            }


            // Get course progress
            let courseProgressCount = await CourseProgress.findOne({
                courseID: userDetails.courses[i]._id,
                userId: userId,
            })

            courseProgressCount = courseProgressCount?.completedVideos.length

            // Calculate progress percentage
            if (SubsectionLength === 0) {
                userDetails.courses[i].progressPercentage = 100
            } else {
                const multiplier = Math.pow(10, 2)
                userDetails.courses[i].progressPercentage =
                    Math.round((courseProgressCount / SubsectionLength) * 100 * multiplier) / multiplier
            }

          
        }


        return res.status(200).json({
            success: true,
            data: userDetails.courses,
        })
    } catch (error) {
        console.error("Error occurred:", error)  // Log the actual error
        return res.status(500).json({
            success: false,
            message: error.message,
        })
    }
}





// ================ instructor Dashboard ================
exports.instructorDashboard = async (req, res) => {
    try {
        const courseDetails = await Course.find({ instructor: req.user.id })

        const courseData = courseDetails.map((course) => {
            const totalStudentsEnrolled = course.studentsEnrolled.length
            const totalAmountGenerated = totalStudentsEnrolled * course.price

            // Create a new object with the additional fields
            const courseDataWithStats = {
                _id: course._id,
                courseName: course.courseName,
                courseDescription: course.courseDescription,
                // Include other course properties as needed
                totalStudentsEnrolled,
                totalAmountGenerated,
            }

            return courseDataWithStats
        })

        res.status(200).json(
            {
                courses: courseData,
                message: 'Instructor Dashboard Data fetched successfully'
            },

        )
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Server Error" })
    }
}




// ================ get All Students ================

exports.getAllStudents = async (req, res) => {
  try {
    const students = await User.find({ accountType: "Student" })
      .populate({
        path: "courses",
        populate: {
          path: "courseContent",
          populate: {
            path: "subSection",
          },
        },
      })
      .populate("additionalDetails")
      .sort({ createdAt: -1 });

    const studentsWithProgress = await Promise.all(
      students.map(async (student) => {
        const updatedCourses = await Promise.all(
          student.courses.map(async (course) => {
            let totalDurationInSeconds = 0;
            let totalSubsections = 0;

            for (const section of course.courseContent) {
              totalDurationInSeconds += section.subSection.reduce(
                (sum, sub) => sum + parseInt(sub.timeDuration || 0),
                0
              );
              totalSubsections += section.subSection.length;
            }

            course = course.toObject();
            course.totalDuration = convertSecondsToDuration(totalDurationInSeconds);

            const courseProgress = await CourseProgress.findOne({
              userId: student._id,
              courseID: course._id,
            });

            const completedCount = courseProgress?.completedVideos.length || 0;

            course.progressPercentage =
              totalSubsections === 0
                ? 100
                : Math.round((completedCount / totalSubsections) * 100 * 100) / 100;

            return course;
          })
        );

        const studentObj = student.toObject();
        studentObj.courses = updatedCourses;
        return studentObj;
      })
    );

    const studentsCount = studentsWithProgress.length;

    res.status(200).json({
      allStudentsDetails: studentsWithProgress,
      studentsCount,
      message: "All Students Data fetched successfully",
    });
  } catch (error) {
    console.error("Error while fetching all students:", error);
    res.status(500).json({
      message: "Error while fetching all students",
      error: error.message,
    });
  }
};


// ================ get All Instructors ================
exports.getAllInstructors = async (req, res) => {
    try {
        const allInstructorsDetails = await User.find({
            accountType: 'Instructor'
        })
            .populate('additionalDetails')
            .populate('courses')
            .sort({ createdAt: -1 });


        const instructorsCount = await User.countDocuments({
            accountType: 'Instructor'
        });


        res.status(200).json(
            {
                allInstructorsDetails,
                instructorsCount,
                message: 'All Instructors Data fetched successfully'
            }
        )
    } catch (error) {
        console.error(error)
        res.status(500).json({
            message: 'Error while fetching all Instructors',
            error: error.message
        })
    }
}
// ================ get Students by Instructor ================
exports.getStudentsByInstructor = async (req, res) => {
    try {
      const instructorId = req.user.id;

      const instructorCourses = await Course.find({ instructor: instructorId });
  
      if (instructorCourses.length === 0) {
        return res.status(200).json({
          allStudentsDetails: [],
          studentsCount: 0,
          message: "This instructor havent any student",
        });
      }
  
      const studentIdsSet = new Set();
      for (const course of instructorCourses) {
        for (const enrollment of course.studentsEnrolled) {
          if (enrollment?.user) {
            studentIdsSet.add(enrollment.user.toString());
          }
        }
      }
  
      const studentIds = Array.from(studentIdsSet);
  
      const students = await User.find({ _id: { $in: studentIds } })
        .populate("additionalDetails")
        .sort({ createdAt: -1 });
  
      const studentsWithProgress = await Promise.all(
        students.map(async (student) => {
          const studentObj = student.toObject();
  
          const studentCourses = instructorCourses.filter(course => {
            return Array.isArray(course.studentsEnrolled) && course.studentsEnrolled.some(e => {
              return e?.user?.toString() === student._id.toString();
            });
          });
          const updatedCourses = await Promise.all(
            studentCourses.map(async (course) => {
              await course.populate({
                path: "courseContent",
                populate: { path: "subSection" }
              });
  
              let totalDurationInSeconds = 0;
              let totalSubsections = 0;
  
              for (const section of course.courseContent) {
                totalSubsections += section.subSection.length;
                totalDurationInSeconds += section.subSection.reduce(
                  (sum, sub) => sum + parseInt(sub.timeDuration || 0),
                  0
                );
              }
  
              const courseObj = course.toObject();
              courseObj.totalDuration = convertSecondsToDuration(totalDurationInSeconds);
  
              const courseProgress = await CourseProgress.findOne({
                userId: student._id,
                courseID: course._id,
              }).populate("currentSubSection");
              
              const completedCount = courseProgress?.completedVideos.length || 0;
              
              courseObj.progressPercentage =
                totalSubsections === 0
                  ? 100
                  : Math.round((completedCount / totalSubsections) * 10000) / 100;
              
              courseObj.startedAt = courseProgress?.startedAt || null;   
              courseObj.completedAt = courseProgress?.completedAt || null;
              courseObj.currentSubSection = courseProgress?.currentSubSection || null;
              courseObj.currentLessonTitle = courseProgress?.currentSubSection?.title || null;
  
              return courseObj;
            })
          );
  
          studentObj.courses = updatedCourses;
          return studentObj;
        })
      );
  
      res.status(200).json({
        allStudentsDetails: studentsWithProgress,
        studentsCount: studentsWithProgress.length,
        message: "success",
      });
    } catch (error) {
      console.error("error:", error);
      res.status(500).json({
        message: "error",
        error: error.message,
      });
    }
  };
  