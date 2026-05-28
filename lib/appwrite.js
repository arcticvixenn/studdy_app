import { Platform } from 'react-native';
import {
  Account,
  Client,
  ID,
  Avatars,
  Databases,
  Query,
  Storage,
  Permission,
  Role,
} from 'react-native-appwrite';

import {
  Client as WebClient,
  Storage as WebStorage,
  ID as WebID,
} from 'appwrite';

import {
  buildLearningMlModel,
  buildKnowledgeMasteryModel,
  buildContentRecommendationModel,
} from './mlModel';

export const config = {
  endpoint: 'https://cloud.appwrite.io/v1',
  Platform: 'com.lnu.studdy',
  projectId: '6738b5ec003cb69f2dae',
  databaseId: '6738b84f000268d0ebc7',

  userCollectionId: '6738b886001d02b1e41c',
  postsCollectionId: 'posts',
  commentsCollectionId: 'comments',
  likesCollectionId: 'likes',
  savesCollectionId: 'saves',
  followsCollectionId: 'follows',
  viewEventsCollectionId: 'view_events',
  searchEventsCollectionId: 'search_events',

  storageId: '6739c607003e49ff5ec2',
};

const {
  endpoint,
  projectId,
  databaseId,
  userCollectionId,
  postsCollectionId,
  commentsCollectionId,
  likesCollectionId,
  savesCollectionId,
  followsCollectionId,
  viewEventsCollectionId,
  searchEventsCollectionId,
} = config;

const client = new Client();

client
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setPlatform(Platform);

const account = new Account(client);
const avatars = new Avatars(client);
const databases = new Databases(client);
const storage = new Storage(client);

const webClient = new WebClient();

webClient
  .setEndpoint(endpoint)
  .setProject(projectId);

const webStorage = new WebStorage(webClient);

// AUTH

export const createUser = async (email, password, username) => {
  try {
    const newAccount = await account.create(
      ID.unique(),
      email,
      password,
      username
    );

    const avatarUrl = avatars.getInitials(username);

    await signIn(email, password);

    return await databases.createDocument(
      databaseId,
      userCollectionId,
      ID.unique(),
      {
        accountId: newAccount.$id,
        email,
        username,
        avatar: avatarUrl,
      }
    );
  } catch (error) {
    console.log('createUser error:', error);
    throw new Error(error?.message || 'Помилка під час реєстрації.');
  }
};

export const signIn = async (email, password) => {
  try {
    return await account.createEmailPasswordSession(email, password);
  } catch (error) {
    console.log('signIn error:', error);
    throw new Error(error?.message || 'Помилка під час входу.');
  }
};

export const getCurrentUser = async () => {
  try {
    const currentAccount = await account.get();

    const currentUser = await databases.listDocuments(
      databaseId,
      userCollectionId,
      [Query.equal('accountId', currentAccount.$id)]
    );

    return currentUser.documents[0] || null;
  } catch {
    return null;
  }
};

export const signOut = async () => {
  return await account.deleteSession('current');
};

// POSTS

export const getAllPosts = async () => {
  const posts = await databases.listDocuments(
    databaseId,
    postsCollectionId,
    [Query.orderDesc('$createdAt')]
  );

  return posts.documents;
};

export const getPostById = async (postId) => {
  return await databases.getDocument(
    databaseId,
    postsCollectionId,
    postId
  );
};

export const getVideoPosts = async () => {
  const posts = await databases.listDocuments(
    databaseId,
    postsCollectionId,
    [
      Query.equal('mediaType', 'video'),
      Query.orderDesc('$createdAt'),
    ]
  );

  return posts.documents;
};

export const getUserPosts = async (userId) => {
  if (!userId) return [];

  const posts = await databases.listDocuments(
    databaseId,
    postsCollectionId,
    [
      Query.equal('authorId', userId),
      Query.orderDesc('$createdAt'),
    ]
  );

  return posts.documents;
};

export const searchPosts = async (query) => {
  if (!query?.trim()) return [];

  const posts = await databases.listDocuments(
    databaseId,
    postsCollectionId,
    [Query.search('title', query.trim())]
  );

  return posts.documents;
};

// FILE UPLOAD

const buildNativeFile = (file, type) => ({
  name: file.name || file.fileName || `${type}-${Date.now()}`,
  type:
    file.mimeType ||
    file.type ||
    (type === 'video' ? 'video/mp4' : 'image/jpeg'),
  size: file.size || file.fileSize || 0,
  uri: file.uri,
});

const uploadWebFile = async (file) => {
  const browserFile = file?.file || file;

  if (!(browserFile instanceof File)) {
    throw new Error('Браузер не передав коректний файл для завантаження.');
  }

  const uploadedFile = await webStorage.createFile({
    bucketId: storageId,
    fileId: WebID.unique(),
    file: browserFile,
  });

  return {
    url: `${endpoint}/storage/buckets/${storageId}/files/${uploadedFile.$id}/view?project=${projectId}`,
    id: uploadedFile.$id,
  };
};

const uploadNativeFile = async (file, type) => {
  const preparedFile = buildNativeFile(file, type);

  const uploadedFile = await storage.createFile(
    storageId,
    ID.unique(),
    preparedFile
  );

  return {
    url: `${endpoint}/storage/buckets/${storageId}/files/${uploadedFile.$id}/view?project=${projectId}`,
    id: uploadedFile.$id,
  };
};

const uploadFile = async (file, type) => {
  if (!file) {
    return {
      url: null,
      id: null,
    };
  }

  try {
    if (Platform.OS === 'web') {
      return await uploadWebFile(file);
    }

    return await uploadNativeFile(file, type);
  } catch (error) {
    console.log('uploadFile error:', error);
    throw new Error(error?.message || 'Не вдалося завантажити файл.');
  }
};

// CREATE POST

export const createPost = async ({
  title,
  content,
  category,
  mediaType,
  image,
  video,
  thumbnail,
  user,
}) => {
  if (!user?.$id) {
    throw new Error('Не вдалося визначити автора.');
  }

  try {
    const imageFile =
      mediaType === 'image'
        ? await uploadFile(image, 'image')
        : { url: null, id: null };

    const videoFile =
      mediaType === 'video'
        ? await uploadFile(video, 'video')
        : { url: null, id: null };

    const thumbnailFile =
      mediaType === 'video'
        ? await uploadFile(thumbnail, 'image')
        : { url: null, id: null };

    return await databases.createDocument(
  databaseId,
  postsCollectionId,
  ID.unique(),
  {
    title: title.trim(),
    content: content.trim(),
    category,
    mediaType,

    authorId: user.$id,
    authorName: user.username || 'Користувач Studdy',
    authorAvatar: user.avatar || null,

    imageUrl: imageFile.url,
    imageId: imageFile.id,

    videoUrl: videoFile.url,
    videoId: videoFile.id,

    thumbnailUrl: thumbnailFile.url,
    thumbnailId: thumbnailFile.id,

    likesCount: 0,
    commentsCount: 0,
  },
  [
    Permission.read(Role.any()),
    Permission.delete(Role.user(user.accountId)),
  ]
);
  } catch (error) {
    console.log('createPost error:', error);
    throw new Error(error?.message || 'Не вдалося створити публікацію.');
  }
};

// LIKES

export const getPostLikeState = async (postId, userId) => {
  if (!postId) {
    return {
      likesCount: 0,
      isLiked: false,
      likeId: null,
    };
  }

  try {
    const [allLikes, userLike] = await Promise.all([
      databases.listDocuments(
        databaseId,
        likesCollectionId,
        [Query.equal('postId', postId), Query.limit(1)]
      ),

      userId
        ? databases.listDocuments(
            databaseId,
            likesCollectionId,
            [
              Query.equal('postId', postId),
              Query.equal('userId', userId),
              Query.limit(1),
            ]
          )
        : Promise.resolve({ documents: [] }),
    ]);

    return {
      likesCount: allLikes.total ?? allLikes.documents.length,
      isLiked: userLike.documents.length > 0,
      likeId: userLike.documents[0]?.$id ?? null,
    };
  } catch (error) {
    console.log('getPostLikeState error:', error);

    return {
      likesCount: 0,
      isLiked: false,
      likeId: null,
    };
  }
};

export const togglePostLike = async ({
  postId,
  user,
  currentLikeId,
  isLiked,
}) => {
  if (!user?.$id || !user?.accountId) {
    throw new Error('Не вдалося визначити користувача.');
  }

  try {
    if (isLiked && currentLikeId) {
      await databases.deleteDocument(
        databaseId,
        likesCollectionId,
        currentLikeId
      );
    } else {
      await databases.createDocument(
        databaseId,
        likesCollectionId,
        ID.unique(),
        {
          postId,
          userId: user.$id,
        },
        [Permission.delete(Role.user(user.accountId))]
      );
    }

    return await getPostLikeState(postId, user.$id);
  } catch (error) {
    console.log('togglePostLike error:', error);
    throw new Error(error?.message || 'Не вдалося змінити лайк.');
  }
};

// COMMENTS

export const getPostComments = async (postId) => {
  const comments = await databases.listDocuments(
    databaseId,
    commentsCollectionId,
    [
      Query.equal('postId', postId),
      Query.orderAsc('$createdAt'),
    ]
  );

  return comments.documents;
};

export const getPostCommentsCount = async (postId) => {
  const comments = await databases.listDocuments(
    databaseId,
    commentsCollectionId,
    [Query.equal('postId', postId), Query.limit(1)]
  );

  return comments.total ?? comments.documents.length;
};

export const createComment = async ({ postId, text, user }) => {
  if (!user?.$id) {
    throw new Error('Не вдалося визначити користувача.');
  }

  return await databases.createDocument(
    databaseId,
    commentsCollectionId,
    ID.unique(),
    {
      postId,
      authorId: user.$id,
      authorName: user.username || 'Користувач Studdy',
      authorAvatar: user.avatar || null,
      text: text.trim(),
      likesCount: 0,
    },
    user.accountId
      ? [Permission.delete(Role.user(user.accountId))]
      : undefined
  );
};

// SAVES

export const getPostSaveState = async (postId, userId) => {
  if (!postId || !userId) {
    return {
      isSaved: false,
      saveId: null,
    };
  }

  try {
    const saves = await databases.listDocuments(
      databaseId,
      savesCollectionId,
      [
        Query.equal('postId', postId),
        Query.equal('userId', userId),
        Query.limit(1),
      ]
    );

    return {
      isSaved: saves.documents.length > 0,
      saveId: saves.documents[0]?.$id ?? null,
    };
  } catch (error) {
    console.log('getPostSaveState error:', error);

    return {
      isSaved: false,
      saveId: null,
    };
  }
};

export const togglePostSave = async ({
  postId,
  user,
  currentSaveId,
  isSaved,
}) => {
  if (!user?.$id || !user?.accountId) {
    throw new Error('Не вдалося визначити користувача.');
  }

  try {
    if (isSaved && currentSaveId) {
      await databases.deleteDocument(
        databaseId,
        savesCollectionId,
        currentSaveId
      );
    } else {
      await databases.createDocument(
        databaseId,
        savesCollectionId,
        ID.unique(),
        {
          postId,
          userId: user.$id,
        },
        [
          Permission.read(Role.user(user.accountId)),
          Permission.delete(Role.user(user.accountId)),
        ]
      );
    }

    return await getPostSaveState(postId, user.$id);
  } catch (error) {
    console.log('togglePostSave error:', error);
    throw new Error(error?.message || 'Не вдалося змінити збереження.');
  }
};

export const getSavedPosts = async (userId) => {
  if (!userId) {
    return [];
  }

  try {
    const saves = await databases.listDocuments(
      databaseId,
      savesCollectionId,
      [
        Query.equal('userId', userId),
        Query.orderDesc('$createdAt'),
      ]
    );

    const posts = await Promise.all(
      saves.documents.map(async (save) => {
        try {
          return await getPostById(save.postId);
        } catch {
          return null;
        }
      })
    );

    return posts.filter(Boolean);
  } catch (error) {
    console.log('getSavedPosts error:', error);
    return [];
  }
};



// FOLLOWS

export const getUserById = async (userId) => {
  return await databases.getDocument(
    databaseId,
    userCollectionId,
    userId
  );
};

export const getFollowState = async (targetUserId, currentUserId) => {
  if (!targetUserId || !currentUserId || targetUserId === currentUserId) {
    return {
      isFollowing: false,
      followId: null,
    };
  }

  try {
    const follows = await databases.listDocuments(
      databaseId,
      followsCollectionId,
      [
        Query.equal('followerId', currentUserId),
        Query.equal('followingId', targetUserId),
        Query.limit(1),
      ]
    );

    return {
      isFollowing: follows.documents.length > 0,
      followId: follows.documents[0]?.$id ?? null,
    };
  } catch (error) {
    console.log('getFollowState error:', error);

    return {
      isFollowing: false,
      followId: null,
    };
  }
};

export const toggleFollow = async ({
  targetUserId,
  user,
  isFollowing,
  currentFollowId,
}) => {
  if (!user?.$id || !user?.accountId) {
    throw new Error('Не вдалося визначити користувача.');
  }

  if (targetUserId === user.$id) {
    return {
      isFollowing: false,
      followId: null,
    };
  }

  try {
    if (isFollowing && currentFollowId) {
      await databases.deleteDocument(
        databaseId,
        followsCollectionId,
        currentFollowId
      );
    } else {
      await databases.createDocument(
        databaseId,
        followsCollectionId,
        ID.unique(),
        {
          followerId: user.$id,
          followingId: targetUserId,
        },
        [
          Permission.read(Role.users()),
          Permission.delete(Role.user(user.accountId)),
        ]
      );
    }

    return await getFollowState(targetUserId, user.$id);
  } catch (error) {
    console.log('toggleFollow error:', error);
    throw new Error(error?.message || 'Не вдалося змінити підписку.');
  }
};

export const getFollowersCount = async (userId) => {
  const followers = await databases.listDocuments(
    databaseId,
    followsCollectionId,
    [
      Query.equal('followingId', userId),
      Query.limit(1),
    ]
  );

  return followers.total ?? followers.documents.length;
};

export const getFollowingCount = async (userId) => {
  const following = await databases.listDocuments(
    databaseId,
    followsCollectionId,
    [
      Query.equal('followerId', userId),
      Query.limit(1),
    ]
  );

  return following.total ?? following.documents.length;
};



// -----------------------------
// COURSES & LESSONS
// -----------------------------

export const getAllCourses = async () => {
  const courses = await databases.listDocuments(
    databaseId,
    'courses',
    [Query.orderDesc('$createdAt')]
  );

  return courses.documents;
};

export const getCourseById = async (courseId) => {
  return await databases.getDocument(
    databaseId,
    'courses',
    courseId
  );
};

export const getCourseLessons = async (courseId) => {
  const lessons = await databases.listDocuments(
    databaseId,
    'lessons',
    [
      Query.equal('courseId', courseId),
      Query.orderAsc('lessonOrder'),
    ]
  );

  return lessons.documents.map((lesson) => ({
    ...lesson,
    videoUrl: lesson.videoId
      ? `${endpoint}/storage/buckets/${storageId}/files/${lesson.videoId}/view?project=${projectId}`
      : null,
    thumbnailUrl: lesson.thumbnailId
      ? `${endpoint}/storage/buckets/${storageId}/files/${lesson.thumbnailId}/view?project=${projectId}`
      : null,
  }));
};

export const getLessonById = async (lessonId) => {
  const lesson = await databases.getDocument(
    databaseId,
    'lessons',
    lessonId
  );

  return {
    ...lesson,
    videoUrl: lesson.videoId
      ? `${endpoint}/storage/buckets/${storageId}/files/${lesson.videoId}/view?project=${projectId}`
      : null,
    thumbnailUrl: lesson.thumbnailId
      ? `${endpoint}/storage/buckets/${storageId}/files/${lesson.thumbnailId}/view?project=${projectId}`
      : null,
  };
};

export const getLessonQuiz = async (lessonId) => {
  const quizzes = await databases.listDocuments(
    databaseId,
    'quizzes',
    [
      Query.equal('lessonId', lessonId),
      Query.limit(1),
    ]
  );

  return quizzes.documents[0] || null;
};


// -----------------------------
// CREATE COURSES & LESSONS
// -----------------------------

export const createCourse = async ({
  title,
  description,
  category,
  level,
  cover,
  user,
}) => {
  if (!user?.$id || !user?.accountId) {
    throw new Error('Не вдалося визначити автора курсу.');
  }

  const coverFile = cover
    ? await uploadFile(cover, 'image')
    : { url: null, id: null };

  return await databases.createDocument(
    databaseId,
    'courses',
    ID.unique(),
    {
      title: title.trim(),
      description: description.trim(),
      category,
      level,
      authorId: user.$id,
      authorName: user.username || 'Користувач Studdy',
      authorAvatar: user.avatar || null,
      coverUrl: coverFile.url,
      coverId: coverFile.id,
      isVerified: false,
      lessonsCount: 0,
    },
    [
      Permission.read(Role.any()),
      Permission.update(Role.user(user.accountId)),
      Permission.delete(Role.user(user.accountId)),
    ]
  );
};

export const createLesson = async ({
  courseId,
  title,
  description,
  content,
  mediaType,
  video,
  thumbnail,
  lessonOrder,
  estimatedMinutes,
  user,
}) => {
  if (!user?.accountId) {
    throw new Error('Не вдалося визначити автора уроку.');
  }

  try {
    const videoFile =
      mediaType === 'video'
        ? await uploadFile(video, 'video')
        : { url: null, id: null };

    const thumbnailFile =
      mediaType === 'video'
        ? await uploadFile(thumbnail, 'image')
        : { url: null, id: null };

    const lessonData = {
      courseId,
      title: title.trim(),
      mediaType,
      lessonOrder: Number(lessonOrder) || 1,
      estimatedMinutes: Number(estimatedMinutes) || 5,
    };

    if (description?.trim()) {
      lessonData.description = description.trim();
    }

    if (content?.trim()) {
      lessonData.content = content.trim();
    }

    if (videoFile.id) {
      lessonData.videoId = videoFile.id;
    }

    if (thumbnailFile.id) {
      lessonData.thumbnailId = thumbnailFile.id;
    }

    return await databases.createDocument(
      databaseId,
      'lessons',
      ID.unique(),
      lessonData,
      [
        Permission.read(Role.any()),
        Permission.update(Role.user(user.accountId)),
        Permission.delete(Role.user(user.accountId)),
      ]
    );
  } catch (error) {
    console.log('createLesson error:', error);
    throw new Error(error?.message || 'Не вдалося створити урок.');
  }
};

// -----------------------------
// QUIZ CREATION
// -----------------------------

export const createQuiz = async ({
  courseId,
  lessonId,
  title,
  passingScore,
  user,
}) => {
  if (!user?.accountId) {
    throw new Error('Не вдалося визначити автора тесту.');
  }

  return await databases.createDocument(
    databaseId,
    'quizzes',
    ID.unique(),
    {
      courseId,
      lessonId,
      title: title.trim(),
      passingScore: Number(passingScore) || 60,
    },
    [
      Permission.read(Role.any()),
      Permission.update(Role.user(user.accountId)),
      Permission.delete(Role.user(user.accountId)),
    ]
  );
};

export const getQuizById = async (quizId) => {
  return await databases.getDocument(
    databaseId,
    'quizzes',
    quizId
  );
};

export const getQuizQuestions = async (quizId) => {
  const questions = await databases.listDocuments(
    databaseId,
    'questions',
    [
      Query.equal('quizId', quizId),
      Query.orderAsc('questionOrder'),
    ]
  );

  return questions.documents;
};

export const createQuestion = async ({
  quizId,
  questionText,
  optionA,
  optionB,
  optionC,
  optionD,
  correctOption,
  explanation,
  topic,
  difficulty,
  questionOrder,
  user,
}) => {
  if (!user?.accountId) {
    throw new Error('Не вдалося визначити автора питання.');
  }

  try {
    const questionData = {
      quizId,
      questionText: questionText.trim(),
      optionA: optionA.trim(),
      optionB: optionB.trim(),
      optionC: optionC.trim(),
      optionD: optionD.trim(),
      correctOption,
      topic: topic.trim(),
      difficulty: Number(difficulty) || 1,
      questionOrder: Number(questionOrder) || 1,
    };

    if (explanation?.trim()) {
      questionData.explanation = explanation.trim();
    }

    return await databases.createDocument(
      databaseId,
      'questions',
      ID.unique(),
      questionData,
      [
        Permission.read(Role.any()),
        Permission.update(Role.user(user.accountId)),
        Permission.delete(Role.user(user.accountId)),
      ]
    );
  } catch (error) {
    console.log('createQuestion error:', error);
    throw new Error(error?.message || 'Не вдалося створити питання.');
  }
};



// -----------------------------
// DELETE LEARNING CONTENT
// -----------------------------

export const deleteCourse = async (courseId) => {
  return await databases.deleteDocument(
    databaseId,
    'courses',
    courseId
  );
};

export const deleteLesson = async (lessonId) => {
  return await databases.deleteDocument(
    databaseId,
    'lessons',
    lessonId
  );
};

export const deleteQuiz = async (quizId) => {
  return await databases.deleteDocument(
    databaseId,
    'quizzes',
    quizId
  );
};

export const deleteQuestion = async (questionId) => {
  return await databases.deleteDocument(
    databaseId,
    'questions',
    questionId
  );
};






// -----------------------------
// QUIZ ATTEMPTS
// -----------------------------

export const submitQuizAttempt = async ({
  quiz,
  questions,
  selectedAnswers,
  user,
}) => {
  if (!user?.$id || !user?.accountId) {
    throw new Error('Не вдалося визначити користувача.');
  }

  const totalQuestions = questions.length;

  const checkedAnswers = questions.map((question) => {
    const selectedOption = selectedAnswers[question.$id];
    const isCorrect = selectedOption === question.correctOption;

    return {
      question,
      selectedOption,
      isCorrect,
    };
  });

  const correctAnswers = checkedAnswers.filter((item) => item.isCorrect).length;
  const score =
    totalQuestions > 0
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : 0;

  const passed = score >= (quiz.passingScore ?? 60);

  const attempt = await databases.createDocument(
    databaseId,
    'quiz_attempts',
    ID.unique(),
    {
      userId: user.$id,
      courseId: quiz.courseId,
      lessonId: quiz.lessonId,
      quizId: quiz.$id,
      score,
      totalQuestions,
      correctAnswers,
      passed,
    },
    [Permission.read(Role.user(user.accountId))]
  );

  await Promise.all(
    checkedAnswers.map(({ question, selectedOption, isCorrect }) =>
      databases.createDocument(
        databaseId,
        'quiz_answers',
        ID.unique(),
        {
          attemptId: attempt.$id,
          userId: user.$id,
          questionId: question.$id,
          quizId: quiz.$id,
          topic: question.topic,
          difficulty: question.difficulty,
          selectedOption,
          correctOption: question.correctOption,
          isCorrect,
        },
        [Permission.read(Role.user(user.accountId))]
      )
    )
  );

  return {
    attempt,
    score,
    correctAnswers,
    totalQuestions,
    passed,
  };
};




// -----------------------------
// UPDATE LEARNING CONTENT
// -----------------------------

export const updateCourse = async ({
  courseId,
  title,
  description,
  category,
  level,
}) => {
  return await databases.updateDocument(
    databaseId,
    'courses',
    courseId,
    {
      title: title.trim(),
      description: description.trim(),
      category,
      level,
    }
  );
};

export const updateLesson = async ({
  lessonId,
  title,
  description,
  content,
  lessonOrder,
  estimatedMinutes,
}) => {
  const lessonData = {
    title: title.trim(),
    lessonOrder: Number(lessonOrder) || 1,
    estimatedMinutes: Number(estimatedMinutes) || 5,
  };

  if (description?.trim()) {
    lessonData.description = description.trim();
  } else {
    lessonData.description = '';
  }

  if (content?.trim()) {
    lessonData.content = content.trim();
  } else {
    lessonData.content = '';
  }

  return await databases.updateDocument(
    databaseId,
    'lessons',
    lessonId,
    lessonData
  );
};



export const updateQuiz = async ({
  quizId,
  title,
  passingScore,
}) => {
  return await databases.updateDocument(
    databaseId,
    'quizzes',
    quizId,
    {
      title: title.trim(),
      passingScore: Number(passingScore) || 60,
    }
  );
};

export const updateQuestion = async ({
  questionId,
  questionText,
  optionA,
  optionB,
  optionC,
  optionD,
  correctOption,
  explanation,
  topic,
  difficulty,
  questionOrder,
}) => {
  const questionData = {
    questionText: questionText.trim(),
    optionA: optionA.trim(),
    optionB: optionB.trim(),
    optionC: optionC.trim(),
    optionD: optionD.trim(),
    correctOption,
    topic: topic.trim(),
    difficulty: Number(difficulty) || 1,
    questionOrder: Number(questionOrder) || 1,
  };

  if (explanation?.trim()) {
    questionData.explanation = explanation.trim();
  } else {
    questionData.explanation = '';
  }

  return await databases.updateDocument(
    databaseId,
    'questions',
    questionId,
    questionData
  );
};

export const getQuestionById = async (questionId) => {
  return await databases.getDocument(
    databaseId,
    'questions',
    questionId
  );
};




// -----------------------------
// DELETE POSTS
// -----------------------------

export const deletePost = async (postId) => {
  return await databases.deleteDocument(
    databaseId,
    postsCollectionId,
    postId
  );
};


// -----------------------------
// LEARNING ANALYTICS
// -----------------------------

export const getUserQuizAttempts = async (userId) => {
  if (!userId) return [];

  const attempts = await databases.listDocuments(
    databaseId,
    'quiz_attempts',
    [
      Query.equal('userId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(100),
    ]
  );

  return attempts.documents;
};

export const getUserQuizAnswers = async (userId) => {
  if (!userId) return [];

  const answers = await databases.listDocuments(
    databaseId,
    'quiz_answers',
    [
      Query.equal('userId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(500),
    ]
  );

  return answers.documents;
};

export const getUserLearningStats = async (userId) => {
  if (!userId) {
    return {
      attemptsCount: 0,
      averageScore: 0,
      totalAnswers: 0,
      correctAnswers: 0,
      accuracy: 0,
      strongTopics: [],
      mediumTopics: [],
      weakTopics: [],
      recommendedTopics: [],
      topicStats: [],
    };
  }

  const [attempts, answers] = await Promise.all([
    getUserQuizAttempts(userId),
    getUserQuizAnswers(userId),
  ]);

  const attemptsCount = attempts.length;

  const averageScore =
    attemptsCount > 0
      ? Math.round(
          attempts.reduce(
            (sum, attempt) => sum + Number(attempt.score || 0),
            0
          ) / attemptsCount
        )
      : 0;

  const totalAnswers = answers.length;
  const correctAnswers = answers.filter((answer) => answer.isCorrect).length;

  const accuracy =
    totalAnswers > 0
      ? Math.round((correctAnswers / totalAnswers) * 100)
      : 0;

  const groupedByTopic = {};

  answers.forEach((answer) => {
    const topic = answer.topic || 'Без теми';

    if (!groupedByTopic[topic]) {
      groupedByTopic[topic] = {
        topic,
        total: 0,
        correct: 0,
        incorrect: 0,
        accuracy: 0,
        averageDifficulty: 0,
        difficultySum: 0,
        priorityScore: 0,
      };
    }

    groupedByTopic[topic].total += 1;
    groupedByTopic[topic].difficultySum += Number(answer.difficulty || 1);

    if (answer.isCorrect) {
      groupedByTopic[topic].correct += 1;
    } else {
      groupedByTopic[topic].incorrect += 1;
    }
  });

  const topicStats = Object.values(groupedByTopic)
    .map((item) => {
      const topicAccuracy = Math.round((item.correct / item.total) * 100);
      const averageDifficulty = Math.round(item.difficultySum / item.total);

      /*
        priorityScore — це підготовка до ML:
        чим нижча точність, більше помилок і вища складність,
        тим важливіше рекомендувати тему для повторення.
      */
      const priorityScore =
        (100 - topicAccuracy) * 0.6 +
        item.incorrect * 15 +
        averageDifficulty * 5;

      return {
        ...item,
        accuracy: topicAccuracy,
        averageDifficulty,
        priorityScore: Math.round(priorityScore),
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy);

  const weakTopics = topicStats
    .filter((topic) => topic.accuracy < 70)
    .slice(0, 5);

  const mediumTopics = topicStats
    .filter((topic) => topic.accuracy >= 70 && topic.accuracy < 85)
    .slice(0, 5);

  const strongTopics = [...topicStats]
    .filter((topic) => topic.accuracy >= 85)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 5);

  const recommendedTopics = [...topicStats]
    .filter((topic) => topic.accuracy < 85 || topic.incorrect > 0)
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 5);

  return {
    attemptsCount,
    averageScore,
    totalAnswers,
    correctAnswers,
    accuracy,
    strongTopics,
    mediumTopics,
    weakTopics,
    recommendedTopics,
    topicStats,
  };
};





// -----------------------------
// ML MODEL №1
// PERSONAL TOPIC RECOMMENDATIONS
// -----------------------------

export const getUserMlLearningRecommendations = async (userId) => {
  if (!userId) {
    return {
      trained: false,
      recommendations: [],
      samples: 0,
    };
  }

  const answers = await getUserQuizAnswers(userId);
  const mlResult = buildLearningMlModel(answers);

  if (!mlResult.trained || !mlResult.recommendations?.length) {
    return mlResult;
  }

  const topicToQuizId = {};

  answers.forEach((answer) => {
    const topic = answer.topic || 'Без теми';

    if (!topicToQuizId[topic] && answer.quizId) {
      topicToQuizId[topic] = answer.quizId;
    }
  });

  const enrichedRecommendations = await Promise.all(
    mlResult.recommendations.map(async (item) => {
      const quizId = topicToQuizId[item.topic];

      if (!quizId) {
        return item;
      }

      try {
        const quiz = await getQuizById(quizId);

        return {
          ...item,
          quizId,
          lessonId: quiz.lessonId,
          courseId: quiz.courseId,
        };
      } catch (error) {
        console.log('enrich ml recommendation error:', error);

        return item;
      }
    })
  );

  return {
    ...mlResult,
    recommendations: enrichedRecommendations,
  };
};



// -----------------------------
// ML MODEL №2
// KNOWLEDGE MASTERY MODEL
// -----------------------------

export const getUserKnowledgeMastery = async (userId) => {
  if (!userId) {
    return {
      trained: false,
      topics: [],
      samples: 0,
    };
  }

  const answers = await getUserQuizAnswers(userId);

  return buildKnowledgeMasteryModel(answers);
};




// -----------------------------
// ML MODEL №3
// CONTENT RECOMMENDATIONS
// -----------------------------

export const getAllLessonsForRecommendations = async () => {
  const lessons = await databases.listDocuments(
    databaseId,
    'lessons',
    [
      Query.orderDesc('$createdAt'),
      Query.limit(100),
    ]
  );

  return lessons.documents;
};

export const getAllPostsForRecommendations = async () => {
  const posts = await databases.listDocuments(
    databaseId,
    postsCollectionId,
    [
      Query.orderDesc('$createdAt'),
      Query.limit(100),
    ]
  );

  return posts.documents;
};

export const getUserContentRecommendations = async (userId) => {
  if (!userId) {
    return {
      trained: false,
      recommendations: [],
    };
  }

  const answers = await getUserQuizAnswers(userId);

  const mlLearning = buildLearningMlModel(answers);
  const mastery = buildKnowledgeMasteryModel(answers);

  const [courses, lessons, posts] = await Promise.all([
    getAllCourses(),
    getAllLessonsForRecommendations(),
    getAllPostsForRecommendations(),
  ]);

  return buildContentRecommendationModel({
    courses,
    lessons,
    posts,
    mlRecommendations: mlLearning.recommendations || [],
    masteryTopics: mastery.topics || [],
  });
};



// -----------------------------
// USER BEHAVIOR EVENTS
// -----------------------------

export const createViewEvent = async ({
  userId,
  permissionUserId,
  contentId,
  contentType,
  duration = 0,
  source = 'recommendation',
}) => {
  if (!userId || !contentId || !contentType) return null;

  try {
    return await databases.createDocument(
      databaseId,
      viewEventsCollectionId,
      ID.unique(),
      {
        userId,
        contentId,
        contentType,
        duration,
        source,
      },
      [
        Permission.read(Role.user(permissionUserId || userId)),
        Permission.update(Role.user(permissionUserId || userId)),
        Permission.delete(Role.user(permissionUserId || userId)),
      ]
    );
  } catch (error) {
    console.log('createViewEvent error:', error);
    return null;
  }
};

export const createSearchEvent = async ({
  userId,
  permissionUserId,
  query,
  screen = 'home',
}) => {
  if (!userId || !query?.trim()) return null;

  try {
    return await databases.createDocument(
      databaseId,
      searchEventsCollectionId,
      ID.unique(),
      {
        userId,
        query: query.trim(),
        screen,
      },
      [
        Permission.read(Role.user(permissionUserId || userId)),
        Permission.update(Role.user(permissionUserId || userId)),
        Permission.delete(Role.user(permissionUserId || userId)),
      ]
    );
  } catch (error) {
    console.log('createSearchEvent error:', error);
    return null;
  }
};



