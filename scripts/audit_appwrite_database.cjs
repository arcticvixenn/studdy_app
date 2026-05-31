const fs = require("fs");

const endpoint = "http://localhost:8080/v1";
const projectId = "6a1ae727000328f56b72";
const databaseId = "studdy_db";
const apiKey = process.env.APPWRITE_API_KEY;

if (!apiKey) {
  throw new Error("APPWRITE_API_KEY is missing");
}

const headers = {
  "Content-Type": "application/json",
  "X-Appwrite-Project": projectId,
  "X-Appwrite-Key": apiKey,
};

const expectedSchema = {
  users: {
    critical: ["accountId", "email", "username", "usernameLower", "avatar"],
    optional: [],
  },
  posts: {
    critical: ["authorId", "title", "content", "category", "mediaType"],
    optional: [
      "authorName",
      "authorAvatar",
      "imageId",
      "imageUrl",
      "videoId",
      "videoUrl",
      "thumbnailId",
      "thumbnailUrl",
      "videoType",
      "likesCount",
      "commentsCount",
    ],
  },
  courses: {
    critical: ["title", "description", "category"],
    optional: ["authorId", "thumbnailId", "thumbnailUrl", "difficulty", "source"],
  },
  lessons: {
    critical: ["courseId", "title", "content"],
    optional: [
      "description",
      "authorId",
      "category",
      "topic",
      "lessonOrder",
      "order",
      "videoId",
      "videoUrl",
      "thumbnailId",
      "thumbnailUrl",
      "difficulty",
      "source",
    ],
  },
  quizzes: {
    critical: ["lessonId", "title"],
    optional: [
      "courseId",
      "topic",
      "difficulty",
      "questionCount",
      "source",
      "modelType",
    ],
  },
  questions: {
    critical: ["quizId", "questionText", "optionA", "optionB", "correctOption"],
    optional: [
      "lessonId",
      "courseId",
      "optionC",
      "optionD",
      "correctAnswer",
      "explanation",
      "topic",
      "category",
      "questionOrder",
      "order",
      "difficulty",
      "source",
    ],
  },
  answers: {
    critical: [],
    optional: [
      "userId",
      "accountId",
      "quizId",
      "questionId",
      "selectedOption",
      "correctOption",
      "isCorrect",
      "topic",
    ],
  },
  quiz_attempts: {
    critical: ["userId", "quizId"],
    optional: [
      "accountId",
      "lessonId",
      "courseId",
      "quizTitle",
      "topic",
      "totalQuestions",
      "correctCount",
      "scorePercent",
      "score",
      "correctAnswers",
      "total",
      "percentage",
      "completedAt",
    ],
  },
  quiz_answers: {
    critical: ["userId", "quizId", "questionId"],
    optional: [
      "accountId",
      "questionText",
      "selectedOption",
      "correctOption",
      "isCorrect",
      "topic",
      "selectedAnswer",
      "correctAnswer",
      "answer",
      "explanation",
      "correct",
    ],
  },
  likes: {
    critical: ["postId", "userId"],
    optional: ["accountId"],
  },
  comments: {
    critical: ["postId", "userId", "text"],
    optional: ["accountId", "authorName", "authorAvatar"],
  },
  saves: {
    critical: ["postId", "userId"],
    optional: ["accountId"],
  },
  follows: {
    critical: [],
    optional: ["followerId", "followingId", "userId", "targetUserId"],
  },
  view_events: {
    critical: ["userId"],
    optional: [
      "sourceId",
      "sourceType",
      "contentId",
      "contentType",
      "postId",
      "lessonId",
      "courseId",
      "category",
      "topic",
      "duration",
      "dateKey",
      "source",
    ],
  },
  search_events: {
    critical: ["userId"],
    optional: ["query", "category", "topic", "resultsCount", "dateKey", "source"],
  },
  user_progress: {
    critical: ["userId"],
    optional: [
      "xpTotal",
      "level",
      "streak",
      "lastActiveDate",
      "dailyQuestDate",
      "dailyQuestCompleted",
    ],
  },
  xp_events: {
    critical: ["userId", "dateKey"],
    optional: [
      "points",
      "source",
      "sourceId",
      "sourceType",
      "reason",
      "topic",
    ],
  },
};

async function request(method, path) {
  const res = await fetch(`${endpoint}${path}`, {
    method,
    headers,
  });

  const text = await res.text();

  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      data,
    };
  }

  return {
    ok: true,
    status: res.status,
    data,
  };
}

async function getCollections() {
  const res = await request("GET", `/databases/${databaseId}/collections`);
  if (!res.ok) throw new Error("Cannot load collections");
  return res.data.collections || [];
}

async function getAttributes(collectionId) {
  const res = await request(
    "GET",
    `/databases/${databaseId}/collections/${collectionId}/attributes`
  );

  if (!res.ok) return [];

  return res.data.attributes || [];
}

async function getIndexes(collectionId) {
  const res = await request(
    "GET",
    `/databases/${databaseId}/collections/${collectionId}/indexes`
  );

  if (!res.ok) return [];

  return res.data.indexes || [];
}

async function getDocumentsCount(collectionId) {
  const res = await request(
    "GET",
    `/databases/${databaseId}/collections/${collectionId}/documents`
  );

  if (!res.ok) return 0;

  return res.data.total ?? res.data.documents?.length ?? 0;
}

function analyzeCollection(collectionId, collection, attrs, indexes, count) {
  const schema = expectedSchema[collectionId];
  const attrKeys = attrs.map((attr) => attr.key);

  if (!schema) {
    return {
      collectionId,
      name: collection.name,
      status: "EXTRA_COLLECTION",
      documents: count,
      attributes: attrKeys,
      indexes: indexes.map((i) => i.key),
    };
  }

  const missingCritical = schema.critical.filter((key) => !attrKeys.includes(key));
  const missingOptional = schema.optional.filter((key) => !attrKeys.includes(key));

  const pendingAttributes = attrs
    .filter((attr) => attr.status && attr.status !== "available")
    .map((attr) => ({
      key: attr.key,
      status: attr.status,
    }));

  const duplicateSensitiveIndexes = indexes.map((index) => ({
    key: index.key,
    type: index.type,
    attributes: index.attributes,
    status: index.status,
  }));

  let status = "OK";

  if (missingCritical.length > 0) status = "CRITICAL_MISSING";
  else if (pendingAttributes.length > 0) status = "PENDING_ATTRIBUTES";
  else if (missingOptional.length > 0) status = "OPTIONAL_MISSING";

  return {
    collectionId,
    name: collection.name,
    status,
    documents: count,
    missingCritical,
    missingOptional,
    pendingAttributes,
    attributes: attrs.map((attr) => ({
      key: attr.key,
      type: attr.type,
      required: attr.required,
      size: attr.size,
      status: attr.status,
    })),
    indexes: duplicateSensitiveIndexes,
  };
}

async function main() {
  const collections = await getCollections();
  const collectionMap = Object.fromEntries(collections.map((c) => [c.$id, c]));

  const report = {
    checkedAt: new Date().toISOString(),
    databaseId,
    summary: {
      expectedCollections: Object.keys(expectedSchema).length,
      existingCollections: collections.length,
      missingCollections: [],
      criticalProblems: 0,
      optionalWarnings: 0,
      pendingProblems: 0,
    },
    collections: {},
  };

  for (const expectedId of Object.keys(expectedSchema)) {
    if (!collectionMap[expectedId]) {
      report.summary.missingCollections.push(expectedId);
      report.summary.criticalProblems += 1;
    }
  }

  for (const collection of collections) {
    const attrs = await getAttributes(collection.$id);
    const indexes = await getIndexes(collection.$id);
    const count = await getDocumentsCount(collection.$id);

    const analysis = analyzeCollection(collection.$id, collection, attrs, indexes, count);

    report.collections[collection.$id] = analysis;

    if (analysis.status === "CRITICAL_MISSING") {
      report.summary.criticalProblems += 1;
    }

    if (analysis.status === "OPTIONAL_MISSING") {
      report.summary.optionalWarnings += 1;
    }

    if (analysis.status === "PENDING_ATTRIBUTES") {
      report.summary.pendingProblems += 1;
    }
  }

  fs.writeFileSync(
    "database_audit_report.json",
    JSON.stringify(report, null, 2),
    "utf8"
  );

  console.log("");
  console.log("========== DATABASE AUDIT ==========");
  console.log("Expected collections:", report.summary.expectedCollections);
  console.log("Existing collections:", report.summary.existingCollections);

  if (report.summary.missingCollections.length) {
    console.log("");
    console.log("MISSING COLLECTIONS:");
    report.summary.missingCollections.forEach((id) => console.log(" -", id));
  }

  console.log("");
  console.log("COLLECTION STATUS:");

  for (const [id, item] of Object.entries(report.collections)) {
    console.log(
      `${item.status.padEnd(18)} ${id.padEnd(16)} docs=${item.documents}`
    );

    if (item.missingCritical?.length) {
      console.log("  critical missing:", item.missingCritical.join(", "));
    }

    if (item.missingOptional?.length) {
      console.log("  optional missing:", item.missingOptional.join(", "));
    }

    if (item.pendingAttributes?.length) {
      console.log(
        "  pending:",
        item.pendingAttributes.map((a) => `${a.key}:${a.status}`).join(", ")
      );
    }
  }

  console.log("");
  console.log("SUMMARY:");
  console.log("criticalProblems:", report.summary.criticalProblems);
  console.log("optionalWarnings:", report.summary.optionalWarnings);
  console.log("pendingProblems:", report.summary.pendingProblems);
  console.log("");
  console.log("Saved full report: database_audit_report.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
