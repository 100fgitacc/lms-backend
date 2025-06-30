const mongoose = require("mongoose");
const Homeworks = require("./homeworks");
const SubSection = require("./subSection");

const MONGO_URI = "mongodb+srv://100fsiteblog:3XwC7GQGLRjucfhm@cluster0.ivfr9tn.mongodb.net/";

async function fixAutoCheckHomeworks() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to DB");

  const allHomeworks = await Homeworks.find({
    reviewed: false,
    status: "not_reviewed",
  });

  const broken = [];
  const toFixSubsections = new Set();

  for (const hw of allHomeworks) {
    const sub = await SubSection.findById(hw.subSection);

    if (!sub) {
      broken.push(hw._id);
      continue;
    }

    if (!sub.delayedHomeworkCheck || !sub.homeworkDelaySeconds) {
      toFixSubsections.add(sub._id.toString());
    }
  }

  if (broken.length > 0) {
    console.log(`Deleting ${broken.length} broken homeworks...`);
    await Homeworks.deleteMany({ _id: { $in: broken } });
  }

  if (toFixSubsections.size > 0) {
    console.log(`Fixing ${toFixSubsections.size} SubSections...`);
    await SubSection.updateMany(
      { _id: { $in: [...toFixSubsections] } },
      {
        $set: {
          delayedHomeworkCheck: true,
          homeworkDelaySeconds: 60,
          requiresHomeworkCheck: true,
          maxScore: 10,
        },
      }
    );
  }

  console.log("Script completed.");
  process.exit(0);
}

fixAutoCheckHomeworks().catch((err) => {
  console.error("Error in script:", err);
  process.exit(1);
});
