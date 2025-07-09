const Section = require('../models/section');
const SubSection = require('../models/subSection');
const { uploadMediaToCloudinary, uploadRawFileToCloudinary } = require('../utils/imageUploader');



// ================ Create SubSection ================
exports.createSubSection = async (req, res) => {
  try {
    const {
      title,
      description,
      sectionId,
      allowSkip,
      enableSeek,
      homeworks,
      requiresHomeworkCheck,
      minScore,
      maxScore,
      delayedHomeworkCheck,
      homeworkDelaySeconds,
    } = req.body;

    const videoFile = req.files?.video;
    const homeworkFile = req.files?.homeworkFile;

    if (!title || !description || !videoFile || !sectionId) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    const videoFileDetails = await uploadMediaToCloudinary(videoFile, process.env.FOLDER_NAME);

    let parsedHomeworks = [];
    if (homeworks) {
      parsedHomeworks = JSON.parse(homeworks);

      if (homeworkFile && parsedHomeworks.some(hw => hw.type === "file")) {
        const uploadedFile = await uploadRawFileToCloudinary(homeworkFile, process.env.FOLDER_NAME);
        parsedHomeworks = parsedHomeworks.map(hw =>
          hw.type === "file"
            ? { ...hw, value: { url: uploadedFile.url, filename: uploadedFile.filename } }
            : hw
        );
      }
    }

    // Build payload object conditionally including minScore and maxScore
    const subsectionPayload = {
      title,
      timeDuration: videoFileDetails.duration,
      description,
      videoUrl: videoFileDetails.secure_url,
      allowSkip: ["true", true].includes(allowSkip),
      enableSeek: ["true", true].includes(enableSeek),
      homeworks: parsedHomeworks,
      requiresHomeworkCheck: ["true", true].includes(requiresHomeworkCheck),
      delayedHomeworkCheck: ["true", true].includes(delayedHomeworkCheck)
    };

    if (subsectionPayload.requiresHomeworkCheck && !isNaN(Number(minScore))) {
      subsectionPayload.minScore = Number(minScore);
    }

    if (subsectionPayload.requiresHomeworkCheck && !isNaN(Number(maxScore))) {
      subsectionPayload.maxScore = Number(maxScore);
    }
    if (subsectionPayload.delayedHomeworkCheck && !isNaN(Number(homeworkDelaySeconds))) {
      subsectionPayload.homeworkDelaySeconds = Number(homeworkDelaySeconds);
    }

    const SubSectionDetails = await SubSection.create(subsectionPayload);

    const updatedSection = await Section.findByIdAndUpdate(
      sectionId,
      { $push: { subSection: SubSectionDetails._id } },
      { new: true }
    ).populate("subSection");

    res.status(200).json({
      success: true,
      data: updatedSection,
      message: "SubSection created successfully",
    });
  } catch (error) {
    console.error("Error while creating SubSection:", error);
    res.status(500).json({
      success: false,
      message: "Error while creating SubSection",
      error: error.message,
    });
  }
};

// ================ Update SubSection ================
exports.updateSubSection = async (req, res) => {
  try {
    const {
      sectionId,
      subSectionId,
      title,
      description,
      allowSkip,
      enableSeek,
      homeworks,
      requiresHomeworkCheck,
      minScore,
      maxScore,
      delayedHomeworkCheck,
      homeworkDelaySeconds,
    } = req.body;
    console.log(req.body);
    

    const homeworkFile = req.files?.homeworkFile;

    if (!subSectionId) {
      return res.status(400).json({
        success: false,
        message: "SubSection ID is required for update",
      });
    }

    const subSection = await SubSection.findById(subSectionId);
    if (!subSection) {
      return res.status(404).json({
        success: false,
        message: "SubSection not found",
      });
    }

    if (title) subSection.title = title;
    if (description) subSection.description = description;

    if (allowSkip !== undefined) {
      subSection.allowSkip = allowSkip === "true" || allowSkip === true;
    }
    if (enableSeek !== undefined) {
      subSection.enableSeek = enableSeek === "true" || enableSeek === true;
    }

    if (homeworks !== undefined) {
      try {
        let parsedHomeworks = JSON.parse(homeworks);

        if (homeworkFile && parsedHomeworks.some(hw => hw.type === "file" && hw.value === "__NEW_FILE__")) {
          const uploadedFile = await uploadRawFileToCloudinary(homeworkFile, process.env.FOLDER_NAME);

          parsedHomeworks = parsedHomeworks.map(hw => {
            if (hw.type === "file" && hw.value === "__NEW_FILE__") {
              return {
                ...hw,
                value: uploadedFile
                  ? {
                      url: uploadedFile.secure_url || uploadedFile.url,
                      filename: uploadedFile.original_filename || uploadedFile.filename,
                    }
                  : undefined,
              };
            }
            return hw;
          });
        }

        // Валидация - проверяем что в файлах есть url и filename
        const allValid = parsedHomeworks.every(hw => {
          if (!hw.value) return false;
          if (hw.type === "file") {
            return hw.value.url && hw.value.filename;
          }
          return typeof hw.value === "string" && hw.value.trim().length > 0;
        });

        if (!allValid) {
          return res.status(400).json({
            success: false,
            message: "Some homework items are missing their value",
          });
        }

        subSection.homeworks = parsedHomeworks;
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: "Invalid format for homeworks. Must be a JSON string.",
        });
      }
    }


    if (requiresHomeworkCheck !== undefined) {
      const requiresCheck = requiresHomeworkCheck === "true" || requiresHomeworkCheck === true;
      subSection.requiresHomeworkCheck = requiresCheck;

      if (requiresCheck) {
        if (!isNaN(Number(minScore))) {
          subSection.minScore = Number(minScore);
        } else {
          delete subSection.minScore;
        }

        if (!isNaN(Number(maxScore))) {
          subSection.maxScore = Number(maxScore);
        } else {
          delete subSection.maxScore;
        }
      } else {
        delete subSection.minScore;
        delete subSection.maxScore;
      }
    }
    if (delayedHomeworkCheck !== undefined) {
      subSection.delayedHomeworkCheck = delayedHomeworkCheck === "true" || delayedHomeworkCheck === true;

      if (subSection.delayedHomeworkCheck) {
        if (!isNaN(Number(homeworkDelaySeconds))) {
          subSection.homeworkDelaySeconds = Number(homeworkDelaySeconds);
        } else {
          delete subSection.homeworkDelaySeconds;
        }
      } else {
        subSection.homeworkDelaySeconds = 0;
      }
    }

    if (req.files?.video) {
      const uploadDetails = await uploadMediaToCloudinary(req.files.video, process.env.FOLDER_NAME);
      subSection.videoUrl = uploadDetails.secure_url;
      subSection.timeDuration = uploadDetails.duration;
    }

    await subSection.save();

    const updatedSection = await Section.findById(sectionId).populate("subSection");

    return res.status(200).json({
      success: true,
      data: updatedSection,
      message: "SubSection updated successfully",
    });
  } catch (error) {
    console.error("Error while updating SubSection:", error);
    return res.status(500).json({
      success: false,
      message: "Error while updating SubSection",
      error: error.message,
    });
  }
};






// ================ Delete SubSection ================
exports.deleteSubSection = async (req, res) => {
    try {
        const { subSectionId, sectionId } = req.body
        await Section.findByIdAndUpdate(
            { _id: sectionId },
            {
                $pull: {
                    subSection: subSectionId,
                },
            }
        )

        // delete from DB
        const subSection = await SubSection.findByIdAndDelete({ _id: subSectionId })

        if (!subSection) {
            return res
                .status(404)
                .json({ success: false, message: "SubSection not found" })
        }

        const updatedSection = await Section.findById(sectionId).populate('subSection')

        // In frontned we have to take care - when subsection is deleted we are sending ,
        // only section data not full course details as we do in others 

        // success response
        return res.json({
            success: true,
            data: updatedSection,
            message: "SubSection deleted successfully",
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            success: false,

            error: error.message,
            message: "An error occurred while deleting the SubSection",
        })
    }
}