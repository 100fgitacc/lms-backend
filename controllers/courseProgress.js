const mongoose = require("mongoose")
const Course = require("../models/course")
const SubSection = require("../models/subSection")
const CourseProgress = require("../models/courseProgress")
const Homework = require("../models/homeworks");

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


exports.resetLessonProgress = async (req, res) => {
  try {
    const { courseId, subSectionId, studentId } = req.body;
    if (!courseId || !subSectionId || !studentId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const subSectionIdStr = subSectionId.toString();

    const progress = await CourseProgress.findOne({ courseID: courseId, userId: studentId });
    if (!progress) return res.status(404).json({ message: "Progress not found" });

    progress.completedVideos = progress.completedVideos.filter(
      (video) => video.subSectionId.toString() !== subSectionIdStr
    );

    if (progress.currentSubSection?.toString() === subSectionIdStr) {
      progress.currentSubSection = null;
    }

    progress.allowedToSkip = progress.allowedToSkip.filter(
      (id) => id.toString() !== subSectionIdStr
    );

    progress.markModified('completedVideos');
    progress.markModified('allowedToSkip');

    await progress.save();

    await Homework.deleteMany({
      user: studentId,
      course: courseId,
      subSection: subSectionId
    });

    return res.json({ success: true, message: "Lesson progress and homework reset successfully" });
  } catch (error) {
    console.error("RESET_LESSON_PROGRESS error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

