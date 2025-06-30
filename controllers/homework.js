const homeworks = require("../models/homeworks");
const courseProgress = require("../models/courseProgress");

const { uploadRawFileToCloudinary } = require("../utils/imageUploader"); 

exports.sendHomework = async (req, res) => {
  try {
    const { courseId, subSectionId, answerText } = req.body;
    const file = req.files?.file;
    const userId = req.user.id;

    if (!courseId || !subSectionId) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const updateData = {
      course: courseId,
      answerText,
      status: "not_reviewed",
      submittedAt: new Date(),
    };

    if (file) {
      const uploadedFile = await uploadRawFileToCloudinary(file, process.env.FOLDER_NAME);
      updateData.file = {
        url: uploadedFile.url || uploadedFile.secure_url,
        filename: uploadedFile.filename || file.name,
      };
    }

    const updatedHomework = await homeworks.findOneAndUpdate(
      { user: userId, subSection: subSectionId },
      { $set: { 
          course: courseId,
          answerText,
          status: "not_reviewed",
          submittedAt: new Date(),
          ...(file ? { file: { url: uploadedFile.url || uploadedFile.secure_url, filename: uploadedFile.filename || file.name } } : {})
      }},
      { new: true, upsert: true }
    );

    res.status(201).json({
      success: true,
      message: "Homework submitted successfully.",
      data: updatedHomework,
    });
  } catch (err) {
    console.error("Homework error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

exports.getHomeworkBySubSection = async (req, res) => {
  try {
    const { subSectionId } = req.params;
    const userId = req.query.userId || req.user?._id;

    if (!userId) {
      return res.status(400).json({ success: false, message: "Invalid or missing userId" });
    }
    
    if (!subSectionId) {
      return res.status(400).json({ success: false, message: "SubSection ID is required" });
    }

    const homework = await homeworks.findOne({ subSection: subSectionId, user: userId });
    

    return res.status(200).json({ success: true, data: homework });
  } catch (error) {
    console.error("Error fetching homework:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.updateHomeworkStatus = async (req, res) => {
  try {
    const { homeworkId, status, score, feedback, reviewed } = req.body;

    if (!homeworkId) {
      return res.status(400).json({ success: false, message: "homeworkId is required" });
    }

    const homework = await homeworks.findById(homeworkId);
    if (!homework) {
      return res.status(404).json({ success: false, message: "Homework not found" });
    }

    if (status) homework.status = status;
    if (typeof reviewed === "boolean") homework.reviewed = reviewed;
    if (typeof score === "number") homework.score = score;
    if (feedback !== undefined) homework.feedback = feedback;

    await homework.save();

    if (status === "reviewed") {
      const progress = await courseProgress.findOne({
        userId: homework.user,
        courseID: homework.course,
      });

      if (progress) {
        const alreadyCompleted = progress.completedVideos.some(
          (item) => item.subSectionId.toString() === homework.subSection.toString()
        );

        if (!alreadyCompleted) {
          progress.completedVideos.push({
            subSectionId: homework.subSection,
            completedAt: new Date(),
          });
          await progress.save();
        }
      }
    }


    return res.status(200).json({ success: true, homework });
  } catch (error) {
    console.error("Error updating homework status:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
