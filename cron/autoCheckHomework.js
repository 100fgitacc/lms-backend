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

    console.log(`[CRON] Found ${pendingHomeworks.length} homework(s) pending review`);

    const now = Date.now();

    for (const hw of pendingHomeworks) {
  console.log(`[CRON] Checking homework ID: ${hw._id} submitted by user: ${hw.user}`);

  const subSection = await SubSection.findById(hw.subSection);
  if (!subSection) {
    console.log(`[CRON] SubSection not found for homework ID: ${hw._id}`);
    continue;
  }

  if (!subSection.delayedHomeworkCheck || subSection.homeworkDelaySeconds <= 0) {
    console.log(`[SKIPPED] Delayed check for hw ${hw._id} is ${
      !subSection.delayedHomeworkCheck ? "disabled" : "missing or zero delaySeconds"
    }.`);
    continue;
  }

  const submittedAt = new Date(hw.submittedAt).getTime();
  const delayMs = subSection.homeworkDelaySeconds * 1000;

  if (Date.now() >= submittedAt + delayMs) {
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


    console.log("[CRON] Auto-check run completed.\n");
  } catch (err) {
    console.error("[CRON ERROR] Auto-check failed:", err);
  }
});

