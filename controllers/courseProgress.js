const mongoose = require("mongoose")
const Course = require("../models/course")
const SubSection = require("../models/subSection")
const CourseProgress = require("../models/courseProgress")


// ================ update Course Progress ================
exports.updateCourseProgress = async (req, res) => {
  const { courseId, subsectionId } = req.body;
  const userId = req.user.id;
  try {
    const subsection = await SubSection.findById(subsectionId);
    if (!subsection) {
      return res.status(404).json({ error: "Invalid subsection" });
    }

    let courseProgress = await CourseProgress.findOne({
      courseID: courseId,
      userId: userId,
    });

    if (!courseProgress) {
      return res.status(404).json({
        success: false,
        message: "Course progress does not exist",
      });
    }

  const isCompleted = courseProgress.completedVideos.some(
    (entry) => entry.subSectionId && entry.subSectionId.toString() === subsectionId.toString()
  );

    if (isCompleted) {
      return res.status(400).json({ error: "Subsection already completed" });
    }

    courseProgress.completedVideos.push({
      subSectionId: subsectionId,
      completedAt: new Date(),
    });

    courseProgress.currentSubSection = subsectionId;

    const course = await Course.findById(courseId).populate({
      path: "courseContent",
      populate: {
        path: "subSection",
        model: "SubSection",
      },
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const allSubsections = course.courseContent.flatMap(
      (section) => section.subSection
    );

    const currentIndex = allSubsections.findIndex(
      (sub) => sub._id.toString() === subsectionId.toString()
    );

    if (currentIndex !== -1 && currentIndex < allSubsections.length - 1) {
      const nextSub = allSubsections[currentIndex + 1];
      const alreadyAllowed = courseProgress.allowedToSkip.some(
        (id) => id.toString() === nextSub._id.toString()
      );
      if (!alreadyAllowed) {
        courseProgress.allowedToSkip.push(nextSub._id);
      }
    }

    const allSubsectionIds = allSubsections.map((sub) => sub._id.toString());
    const completedSet = new Set(
      courseProgress.completedVideos
        .filter(entry => entry.subSectionId)
        .map(entry => entry.subSectionId.toString())
    );

    const allCompleted =
      allSubsectionIds.length > 0 &&
      allSubsectionIds.every((id) => completedSet.has(id));

    if (allCompleted && !courseProgress.completedAt) {
      courseProgress.completedAt = new Date();
    }

    await courseProgress.save();

    return res.status(200).json({ message: "Course progress updated" });
  } catch (error) {
    console.error("Error in updateCourseProgress:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ================ autoupdate Course Progress ================

exports.updateCourseProgressInternal = async ({ userId, courseId, subsectionId }) => {
  const subsection = await SubSection.findById(subsectionId);
  if (!subsection) throw new Error("Invalid subsection");

  const courseProgress = await CourseProgress.findOne({
    courseID: courseId,
    userId: userId,
  });

  if (!courseProgress) throw new Error("Course progress does not exist");

  const isCompleted = courseProgress.completedVideos.some(
    (entry) =>
      entry.subSectionId &&
      entry.subSectionId.toString() === subsectionId.toString()
  );

  if (!isCompleted) {
    courseProgress.completedVideos.push({
      subSectionId: subsectionId,
      completedAt: new Date(),
    });
    courseProgress.currentSubSection = subsectionId;
  }

  const course = await Course.findById(courseId).populate({
    path: "courseContent",
    populate: {
      path: "subSection",
      model: "SubSection",
    },
  });

  if (!course) throw new Error("Course not found");

  const allSubsections = course.courseContent.flatMap((section) => section.subSection);
  const currentIndex = allSubsections.findIndex(
    (sub) => sub._id.toString() === subsectionId.toString()
  );

  if (currentIndex !== -1 && currentIndex < allSubsections.length - 1) {
    const nextSub = allSubsections[currentIndex + 1];
    const alreadyAllowed = courseProgress.allowedToSkip.some(
      (id) => id.toString() === nextSub._id.toString()
    );
    if (!alreadyAllowed) {
      courseProgress.allowedToSkip.push(nextSub._id);
    }
  }

  const allSubsectionIds = allSubsections.map((sub) => sub._id.toString());
  const completedSet = new Set(
    courseProgress.completedVideos
      .filter((entry) => entry.subSectionId)
      .map((entry) => entry.subSectionId.toString())
  );

  const allCompleted =
    allSubsectionIds.length > 0 &&
    allSubsectionIds.every((id) => completedSet.has(id));

  if (allCompleted && !courseProgress.completedAt) {
    courseProgress.completedAt = new Date();
  }

  await courseProgress.save();
};





// ================ get Progress Percentage ================
// exports.getProgressPercentage = async (req, res) => {
//   const { courseId } = req.body
//   const userId = req.user.id

//   if (!courseId) {
//     return res.status(400).json({ error: "Course ID not provided." })
//   }

//   try {
//     // Find the course progress document for the user and course
//     let courseProgress = await CourseProgress.findOne({
//       courseID: courseId,
//       userId: userId,
//     })
//       .populate({
//         path: "courseID",
//         populate: {
//           path: "courseContent",
//         },
//       })
//       .exec()

//     if (!courseProgress) {
//       return res
//         .status(400)
//         .json({ error: "Can not find Course Progress with these IDs." })
//     }
//     console.log(courseProgress, userId)
//     let lectures = 0
//     courseProgress.courseID.courseContent?.forEach((sec) => {
//       lectures += sec.subSection.length || 0
//     })

//     let progressPercentage =
//       (courseProgress.completedVideos.length / lectures) * 100

//     // To make it up to 2 decimal point
//     const multiplier = Math.pow(10, 2)
//     progressPercentage =
//       Math.round(progressPercentage * multiplier) / multiplier

//     return res.status(200).json({
//       data: progressPercentage,
//       message: "Succesfully fetched Course progress",
//     })
//   } catch (error) {
//     console.error(error)
//     return res.status(500).json({ error: "Internal server error" })
//   }
// }
