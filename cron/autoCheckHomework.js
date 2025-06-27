const cron = require("node-cron");
const Homeworks = require("../models/homeworks");
const SubSection = require("../models/subSection");
const { updateCourseProgressInternal } = require("../controllers/courseProgress");

cron.schedule("*/5 * * * *", async () => {
  console.log("[CRON] Running auto-check for homeworks...");

  try {
    const pendingHomeworks = await Homeworks.find({
      reviewed: false,
      status: "not_reviewed",
    });

    const now = Date.now();

    for (const hw of pendingHomeworks) {
      const subSection = await SubSection.findById(hw.subSection);

      if (!subSection) continue;

      if (subSection.delayedHomeworkCheck && subSection.homeworkDelaySeconds > 0) {
        const submittedAt = new Date(hw.submittedAt).getTime();
        const delayMs = subSection.homeworkDelaySeconds * 1000;

        if (now >= submittedAt + delayMs) {
            hw.reviewed = true;
            hw.status = "reviewed";

            if (subSection.requiresHomeworkCheck && subSection.maxScore !== null) {
            hw.score = subSection.maxScore;
            hw.feedback = "Automatically accepted after delay.";
            } else {
            hw.feedback = "Automatically marked as reviewed.";
            }

            await hw.save();
            await updateCourseProgressInternal({
            userId: hw.user,
            courseId: hw.course,
            subsectionId: hw.subSection,
            });

          console.log(`[AUTO-CHECKED] Homework ID: ${hw._id} (user: ${hw.user})`);
        }
      }
    }
  } catch (err) {
    console.error("[CRON ERROR] Auto-check failed:", err);
  }
});
