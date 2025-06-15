const Section = require('../models/section');
const SubSection = require('../models/subSection');
const { uploadMediaToCloudinary, uploadRawFileToCloudinary } = require('../utils/imageUploader');



// ================ create SubSection ================
exports.createSubSection = async (req, res) => {
  try {
    const { title, description, sectionId, allowSkip, enableSeek, homeworks,
      requiresHomeworkCheck, minScore, maxScore 
     } = req.body;
    const videoFile = req.files?.video;
    const homeworkFile = req.files?.homeworkFile;

    if (!title || !description || !videoFile || !sectionId) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const videoFileDetails = await uploadMediaToCloudinary(videoFile, process.env.FOLDER_NAME);

    let parsedHomeworks = [];
    if (homeworks) {
      parsedHomeworks = JSON.parse(homeworks);

      if (homeworkFile && parsedHomeworks.some(hw => hw.type === "file")) {
        const uploadedFile = await uploadRawFileToCloudinary(homeworkFile, process.env.FOLDER_NAME);
        parsedHomeworks = parsedHomeworks.map(hw =>
          hw.type === "file" ? { ...hw, value: { url: uploadedFile.url, filename: uploadedFile.filename } } : hw
        );
      }
    }

     const SubSectionDetails = await SubSection.create({
      title,
      timeDuration: videoFileDetails.duration,
      description,
      videoUrl: videoFileDetails.secure_url,
      allowSkip: ["true", true].includes(allowSkip),
      enableSeek: ["true", true].includes(enableSeek),
      homeworks: parsedHomeworks,
      requiresHomeworkCheck: ["true", true].includes(requiresHomeworkCheck),
      minScore: requiresHomeworkCheck ? Number(minScore) : undefined,
      maxScore: requiresHomeworkCheck ? Number(maxScore) : undefined,
    });

    const updatedSection = await Section.findByIdAndUpdate(
      { _id: sectionId },
      { $push: { subSection: SubSectionDetails._id } },
      { new: true }
    ).populate("subSection");

    res.status(200).json({
      success: true,
      data: updatedSection,
      message: "SubSection created successfully",
    });
  } catch (error) {
    console.log("Error while creating SubSection:", error);
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
    const { sectionId, subSectionId, title, description, allowSkip, enableSeek, homeworks, requiresHomeworkCheck, minScore, maxScore  } = req.body;
    const homeworkFile = req.files?.homeworkFile;

    if (!subSectionId) {
      return res.status(400).json({
        success: false,
        message: "subSection ID is required to update",
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

        if (homeworkFile && parsedHomeworks.some(hw => hw.type === "file")) {
          const uploadedFile = await uploadRawFileToCloudinary(homeworkFile, process.env.FOLDER_NAME);

          parsedHomeworks = parsedHomeworks.map(hw => {
            if (hw.type === "file") {
              return {
                ...hw,
                value: uploadedFile ? {
                  url: uploadedFile.url,
                  filename: uploadedFile.filename
                } : undefined
              };
            }
            return hw;
          });
        }

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
            message: "Некоторые задания не имеют значения value",
          });
        }

        subSection.homeworks = parsedHomeworks;
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: "Неверный формат для homeworks. Должен быть JSON-строкой.",
        });
      }
    }
    if (requiresHomeworkCheck !== undefined) {
      subSection.requiresHomeworkCheck = requiresHomeworkCheck === "true" || requiresHomeworkCheck === true;
      subSection.minScore = subSection.requiresHomeworkCheck ? Number(minScore) : undefined;
      subSection.maxScore = subSection.requiresHomeworkCheck ? Number(maxScore) : undefined;
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
    console.error("Error while updating the section:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Error while updating the section",
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