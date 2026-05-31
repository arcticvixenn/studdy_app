import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();
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
  endpoint: 'http://192.168.1.104:8080/v1',
  Platform: 'com.lnu.studdy',
  projectId: '6a1ae727000328f56b72',
  databaseId: 'studdy_db',

  userCollectionId: 'users',
  postsCollectionId: 'posts',
  commentsCollectionId: 'comments',
  likesCollectionId: 'likes',
  savesCollectionId: 'saves',
  followsCollectionId: 'follows',
  viewEventsCollectionId: 'view_events',
  searchEventsCollectionId: 'search_events',

  storageId: 'studdy_storage',
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
  storageId,
} = config;


const client = new Client();

client
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setPlatform('host.exp.exponent');

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


const normalizeProfileUsername = (username) =>
  String(username || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9._-]/g, '');

export const createUser = async (email, password, username) => {
  try {
    const cleanEmail = String(email || '').trim();
    const cleanUsername = String(username || '').trim();
    const usernameLower = normalizeProfileUsername(cleanUsername);

    if (!cleanEmail || !password || !cleanUsername) {
      throw new Error('Заповни email, пароль і username.');
    }

    if (usernameLower.length < 3) {
      throw new Error('Username має містити мінімум 3 символи.');
    }

    const sameUsername = await databases.listDocuments(
      databaseId,
      userCollectionId,
      [Query.equal('usernameLower', usernameLower), Query.limit(1)]
    );

    let accountData = null;

    try {
      accountData = await account.create(
        ID.unique(),
        cleanEmail,
        password,
        cleanUsername
      );
    } catch (createError) {
      const alreadyExists =
        createError?.code === 409 ||
        String(createError?.message || '').toLowerCase().includes('already exists');

      if (!alreadyExists) {
        throw createError;
      }

      try {
        await signIn(cleanEmail, password);
        accountData = await account.get();
      } catch {
        throw new Error('Користувач з таким email уже існує. Увійди через сторінку входу або використай інший email.');
      }
    }

    try {
      await signIn(cleanEmail, password);
    } catch {}

    const currentAccount = await account.get();

    const existingProfile = await databases.listDocuments(
      databaseId,
      userCollectionId,
      [Query.equal('accountId', currentAccount.$id), Query.limit(1)]
    );

    if (existingProfile.documents.length > 0) {
      return existingProfile.documents[0];
    }

    if (sameUsername.documents.length > 0) {
      throw new Error('Такий username уже зайнятий.');
    }

    const avatarUrl = avatars.getInitials(cleanUsername);

    return await databases.createDocument(
      databaseId,
      userCollectionId,
      ID.unique(),
      {
        accountId: currentAccount.$id || accountData?.$id,
        email: currentAccount.email || cleanEmail,
        username: cleanUsername,
        usernameLower,
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
    throw new Error(error?.message || 'Р В РЎСџР В РЎвЂўР В РЎВР В РЎвЂР В Р’В»Р В РЎвЂќР В Р’В° Р В РЎвЂ”Р РЋРІР‚вЂњР В РўвЂ Р РЋРІР‚РЋР В Р’В°Р РЋР С“ Р В Р вЂ Р РЋРІР‚В¦Р В РЎвЂўР В РўвЂР РЋРЎвЂњ.');
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
      Query.orderDesc('$createdAt'),
      Query.limit(100),
    ]
  );

  return posts.documents.filter(
    (post) =>
      (post.mediaType === 'short_video' || post.mediaType === 'video') &&
      post.videoUrl
  );
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
    throw new Error('Р В РІР‚ВР РЋР вЂљР В Р’В°Р РЋРЎвЂњР В Р’В·Р В Р’ВµР РЋР вЂљ Р В Р вЂ¦Р В Р’Вµ Р В РЎвЂ”Р В Р’ВµР РЋР вЂљР В Р’ВµР В РўвЂР В Р’В°Р В Р вЂ  Р В РЎвЂќР В РЎвЂўР РЋР вЂљР В Р’ВµР В РЎвЂќР РЋРІР‚С™Р В Р вЂ¦Р В РЎвЂР В РІвЂћвЂ“ Р РЋРІР‚С›Р В Р’В°Р В РІвЂћвЂ“Р В Р’В» Р В РўвЂР В Р’В»Р РЋР РЏ Р В Р’В·Р В Р’В°Р В Р вЂ Р В Р’В°Р В Р вЂ¦Р РЋРІР‚С™Р В Р’В°Р В Р’В¶Р В Р’ВµР В Р вЂ¦Р В Р вЂ¦Р РЋР РЏ.');
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
    throw new Error(error?.message || 'Р В РЎСљР В Р’Вµ Р В Р вЂ Р В РўвЂР В Р’В°Р В Р’В»Р В РЎвЂўР РЋР С“Р РЋР РЏ Р В Р’В·Р В Р’В°Р В Р вЂ Р В Р’В°Р В Р вЂ¦Р РЋРІР‚С™Р В Р’В°Р В Р’В¶Р В РЎвЂР РЋРІР‚С™Р В РЎвЂ Р РЋРІР‚С›Р В Р’В°Р В РІвЂћвЂ“Р В Р’В».');
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
    throw new Error('Р СњР Вµ Р Р†Р Т‘Р В°Р В»Р С•РЎРѓРЎРЏ Р Р†Р С‘Р В·Р Р…Р В°РЎвЂЎР С‘РЎвЂљР С‘ Р В°Р Р†РЎвЂљР С•РЎР‚Р В°.');
  }

  try {
    const isImage = mediaType === 'image';
    const isVideo = mediaType === 'video' || mediaType === 'short_video';
    const isShortVideo = mediaType === 'short_video';

    const imageFile = isImage
      ? await uploadFile(image, 'image')
      : { url: null, id: null };

    const videoFile = isVideo
      ? await uploadFile(video, 'video')
      : { url: null, id: null };

    const thumbnailFile =
      mediaType === 'video' && thumbnail
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
        mediaType: isShortVideo ? 'short_video' : mediaType,

        imageUrl: imageFile.url,
        imageId: imageFile.id,

        videoUrl: videoFile.url,
        videoId: videoFile.id,

        thumbnailUrl: thumbnailFile.url,
        thumbnailId: thumbnailFile.id,

        authorId: user.$id,
        authorName: user.username || user.name || 'Р С™Р С•РЎР‚Р С‘РЎРѓРЎвЂљРЎС“Р Р†Р В°РЎвЂЎ Studdy',
        authorAvatar: user.avatar || null,

        likesCount: 0,
        commentsCount: 0,
      },
      [
        Permission.read(Role.any()),
        Permission.update(Role.user(user.accountId)),
        Permission.delete(Role.user(user.accountId)),
      ]
    );
  } catch (error) {
    console.log('createPost error:', error);
    throw new Error(error?.message || 'Р СњР Вµ Р Р†Р Т‘Р В°Р В»Р С•РЎРѓРЎРЏ РЎРѓРЎвЂљР Р†Р С•РЎР‚Р С‘РЎвЂљР С‘ Р С—РЎС“Р В±Р В»РЎвЂ“Р С”Р В°РЎвЂ РЎвЂ“РЎР‹.');
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
    throw new Error('Р В РЎСљР В Р’Вµ Р В Р вЂ Р В РўвЂР В Р’В°Р В Р’В»Р В РЎвЂўР РЋР С“Р РЋР РЏ Р В Р вЂ Р В РЎвЂР В Р’В·Р В Р вЂ¦Р В Р’В°Р РЋРІР‚РЋР В РЎвЂР РЋРІР‚С™Р В РЎвЂ Р В РЎвЂќР В РЎвЂўР РЋР вЂљР В РЎвЂР РЋР С“Р РЋРІР‚С™Р РЋРЎвЂњР В Р вЂ Р В Р’В°Р РЋРІР‚РЋР В Р’В°.');
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

    await createViewEvent({
      userId: user.$id,
      permissionUserId: user.accountId,
      contentId: postId,
      contentType: 'post',
      duration: 0,
      source: isLiked ? 'post_unlike' : 'post_like',
    });

    return await getPostLikeState(postId, user.$id);
  } catch (error) {
    console.log('togglePostLike error:', error);
    throw new Error(error?.message || 'Р В РЎСљР В Р’Вµ Р В Р вЂ Р В РўвЂР В Р’В°Р В Р’В»Р В РЎвЂўР РЋР С“Р РЋР РЏ Р В Р’В·Р В РЎВР РЋРІР‚вЂњР В Р вЂ¦Р В РЎвЂР РЋРІР‚С™Р В РЎвЂ Р В Р’В»Р В Р’В°Р В РІвЂћвЂ“Р В РЎвЂќ.');
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
    throw new Error('Р В РЎСљР В Р’Вµ Р В Р вЂ Р В РўвЂР В Р’В°Р В Р’В»Р В РЎвЂўР РЋР С“Р РЋР РЏ Р В Р вЂ Р В РЎвЂР В Р’В·Р В Р вЂ¦Р В Р’В°Р РЋРІР‚РЋР В РЎвЂР РЋРІР‚С™Р В РЎвЂ Р В РЎвЂќР В РЎвЂўР РЋР вЂљР В РЎвЂР РЋР С“Р РЋРІР‚С™Р РЋРЎвЂњР В Р вЂ Р В Р’В°Р РЋРІР‚РЋР В Р’В°.');
  }

  return await databases.createDocument(
    databaseId,
    commentsCollectionId,
    ID.unique(),
    {
      postId,
      authorId: user.$id,
      authorName: user.username || 'Р В РЎв„ўР В РЎвЂўР РЋР вЂљР В РЎвЂР РЋР С“Р РЋРІР‚С™Р РЋРЎвЂњР В Р вЂ Р В Р’В°Р РЋРІР‚РЋ Studdy',
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
    throw new Error('Р В РЎСљР В Р’Вµ Р В Р вЂ Р В РўвЂР В Р’В°Р В Р’В»Р В РЎвЂўР РЋР С“Р РЋР РЏ Р В Р вЂ Р В РЎвЂР В Р’В·Р В Р вЂ¦Р В Р’В°Р РЋРІР‚РЋР В РЎвЂР РЋРІР‚С™Р В РЎвЂ Р В РЎвЂќР В РЎвЂўР РЋР вЂљР В РЎвЂР РЋР С“Р РЋРІР‚С™Р РЋРЎвЂњР В Р вЂ Р В Р’В°Р РЋРІР‚РЋР В Р’В°.');
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

    await createViewEvent({
      userId: user.$id,
      permissionUserId: user.accountId,
      contentId: postId,
      contentType: 'post',
      duration: 0,
      source: isSaved ? 'post_unsave' : 'post_save',
    });

    return await getPostSaveState(postId, user.$id);
  } catch (error) {
    console.log('togglePostSave error:', error);
    throw new Error(error?.message || 'Р В РЎСљР В Р’Вµ Р В Р вЂ Р В РўвЂР В Р’В°Р В Р’В»Р В РЎвЂўР РЋР С“Р РЋР РЏ Р В Р’В·Р В РЎВР РЋРІР‚вЂњР В Р вЂ¦Р В РЎвЂР РЋРІР‚С™Р В РЎвЂ Р В Р’В·Р В Р’В±Р В Р’ВµР РЋР вЂљР В Р’ВµР В Р’В¶Р В Р’ВµР В Р вЂ¦Р В Р вЂ¦Р РЋР РЏ.');
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
    throw new Error('Р В РЎСљР В Р’Вµ Р В Р вЂ Р В РўвЂР В Р’В°Р В Р’В»Р В РЎвЂўР РЋР С“Р РЋР РЏ Р В Р вЂ Р В РЎвЂР В Р’В·Р В Р вЂ¦Р В Р’В°Р РЋРІР‚РЋР В РЎвЂР РЋРІР‚С™Р В РЎвЂ Р В РЎвЂќР В РЎвЂўР РЋР вЂљР В РЎвЂР РЋР С“Р РЋРІР‚С™Р РЋРЎвЂњР В Р вЂ Р В Р’В°Р РЋРІР‚РЋР В Р’В°.');
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
    throw new Error(error?.message || 'Р В РЎСљР В Р’Вµ Р В Р вЂ Р В РўвЂР В Р’В°Р В Р’В»Р В РЎвЂўР РЋР С“Р РЋР РЏ Р В Р’В·Р В РЎВР РЋРІР‚вЂњР В Р вЂ¦Р В РЎвЂР РЋРІР‚С™Р В РЎвЂ Р В РЎвЂ”Р РЋРІР‚вЂњР В РўвЂР В РЎвЂ”Р В РЎвЂР РЋР С“Р В РЎвЂќР РЋРЎвЂњ.');
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
    throw new Error('Р В РЎСљР В Р’Вµ Р В Р вЂ Р В РўвЂР В Р’В°Р В Р’В»Р В РЎвЂўР РЋР С“Р РЋР РЏ Р В Р вЂ Р В РЎвЂР В Р’В·Р В Р вЂ¦Р В Р’В°Р РЋРІР‚РЋР В РЎвЂР РЋРІР‚С™Р В РЎвЂ Р В Р’В°Р В Р вЂ Р РЋРІР‚С™Р В РЎвЂўР РЋР вЂљР В Р’В° Р В РЎвЂќР РЋРЎвЂњР РЋР вЂљР РЋР С“Р РЋРЎвЂњ.');
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
      authorName: user.username || 'Р В РЎв„ўР В РЎвЂўР РЋР вЂљР В РЎвЂР РЋР С“Р РЋРІР‚С™Р РЋРЎвЂњР В Р вЂ Р В Р’В°Р РЋРІР‚РЋ Studdy',
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
    throw new Error('Р В РЎСљР В Р’Вµ Р В Р вЂ Р В РўвЂР В Р’В°Р В Р’В»Р В РЎвЂўР РЋР С“Р РЋР РЏ Р В Р вЂ Р В РЎвЂР В Р’В·Р В Р вЂ¦Р В Р’В°Р РЋРІР‚РЋР В РЎвЂР РЋРІР‚С™Р В РЎвЂ Р В Р’В°Р В Р вЂ Р РЋРІР‚С™Р В РЎвЂўР РЋР вЂљР В Р’В° Р РЋРЎвЂњР РЋР вЂљР В РЎвЂўР В РЎвЂќР РЋРЎвЂњ.');
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
    throw new Error(error?.message || 'Р В РЎСљР В Р’Вµ Р В Р вЂ Р В РўвЂР В Р’В°Р В Р’В»Р В РЎвЂўР РЋР С“Р РЋР РЏ Р РЋР С“Р РЋРІР‚С™Р В Р вЂ Р В РЎвЂўР РЋР вЂљР В РЎвЂР РЋРІР‚С™Р В РЎвЂ Р РЋРЎвЂњР РЋР вЂљР В РЎвЂўР В РЎвЂќ.');
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
    throw new Error('Р В РЎСљР В Р’Вµ Р В Р вЂ Р В РўвЂР В Р’В°Р В Р’В»Р В РЎвЂўР РЋР С“Р РЋР РЏ Р В Р вЂ Р В РЎвЂР В Р’В·Р В Р вЂ¦Р В Р’В°Р РЋРІР‚РЋР В РЎвЂР РЋРІР‚С™Р В РЎвЂ Р В Р’В°Р В Р вЂ Р РЋРІР‚С™Р В РЎвЂўР РЋР вЂљР В Р’В° Р РЋРІР‚С™Р В Р’ВµР РЋР С“Р РЋРІР‚С™Р РЋРЎвЂњ.');
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
    throw new Error('Р В РЎСљР В Р’Вµ Р В Р вЂ Р В РўвЂР В Р’В°Р В Р’В»Р В РЎвЂўР РЋР С“Р РЋР РЏ Р В Р вЂ Р В РЎвЂР В Р’В·Р В Р вЂ¦Р В Р’В°Р РЋРІР‚РЋР В РЎвЂР РЋРІР‚С™Р В РЎвЂ Р В Р’В°Р В Р вЂ Р РЋРІР‚С™Р В РЎвЂўР РЋР вЂљР В Р’В° Р В РЎвЂ”Р В РЎвЂР РЋРІР‚С™Р В Р’В°Р В Р вЂ¦Р В Р вЂ¦Р РЋР РЏ.');
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
    throw new Error(error?.message || 'Р В РЎСљР В Р’Вµ Р В Р вЂ Р В РўвЂР В Р’В°Р В Р’В»Р В РЎвЂўР РЋР С“Р РЋР РЏ Р РЋР С“Р РЋРІР‚С™Р В Р вЂ Р В РЎвЂўР РЋР вЂљР В РЎвЂР РЋРІР‚С™Р В РЎвЂ Р В РЎвЂ”Р В РЎвЂР РЋРІР‚С™Р В Р’В°Р В Р вЂ¦Р В Р вЂ¦Р РЋР РЏ.');
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
    throw new Error('Р В РЎСљР В Р’Вµ Р В Р вЂ Р В РўвЂР В Р’В°Р В Р’В»Р В РЎвЂўР РЋР С“Р РЋР РЏ Р В Р вЂ Р В РЎвЂР В Р’В·Р В Р вЂ¦Р В Р’В°Р РЋРІР‚РЋР В РЎвЂР РЋРІР‚С™Р В РЎвЂ Р В РЎвЂќР В РЎвЂўР РЋР вЂљР В РЎвЂР РЋР С“Р РЋРІР‚С™Р РЋРЎвЂњР В Р вЂ Р В Р’В°Р РЋРІР‚РЋР В Р’В°.');
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
    const topic = answer.topic || 'Р В РІР‚ВР В Р’ВµР В Р’В· Р РЋРІР‚С™Р В Р’ВµР В РЎВР В РЎвЂ';

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
        priorityScore Р Р†Р вЂљРІР‚Сњ Р РЋРІР‚В Р В Р’Вµ Р В РЎвЂ”Р РЋРІР‚вЂњР В РўвЂР В РЎвЂ“Р В РЎвЂўР РЋРІР‚С™Р В РЎвЂўР В Р вЂ Р В РЎвЂќР В Р’В° Р В РўвЂР В РЎвЂў ML:
        Р РЋРІР‚РЋР В РЎвЂР В РЎВ Р В Р вЂ¦Р В РЎвЂР В Р’В¶Р РЋРІР‚РЋР В Р’В° Р РЋРІР‚С™Р В РЎвЂўР РЋРІР‚РЋР В Р вЂ¦Р РЋРІР‚вЂњР РЋР С“Р РЋРІР‚С™Р РЋР Р‰, Р В Р’В±Р РЋРІР‚вЂњР В Р’В»Р РЋР Р‰Р РЋРІвЂљВ¬Р В Р’Вµ Р В РЎвЂ”Р В РЎвЂўР В РЎВР В РЎвЂР В Р’В»Р В РЎвЂўР В РЎвЂќ Р РЋРІР‚вЂњ Р В Р вЂ Р В РЎвЂР РЋРІР‚В°Р В Р’В° Р РЋР С“Р В РЎвЂќР В Р’В»Р В Р’В°Р В РўвЂР В Р вЂ¦Р РЋРІР‚вЂњР РЋР С“Р РЋРІР‚С™Р РЋР Р‰,
        Р РЋРІР‚С™Р В РЎвЂР В РЎВ Р В Р вЂ Р В Р’В°Р В Р’В¶Р В Р’В»Р В РЎвЂР В Р вЂ Р РЋРІР‚вЂњР РЋРІвЂљВ¬Р В Р’Вµ Р РЋР вЂљР В Р’ВµР В РЎвЂќР В РЎвЂўР В РЎВР В Р’ВµР В Р вЂ¦Р В РўвЂР РЋРЎвЂњР В Р вЂ Р В Р’В°Р РЋРІР‚С™Р В РЎвЂ Р РЋРІР‚С™Р В Р’ВµР В РЎВР РЋРЎвЂњ Р В РўвЂР В Р’В»Р РЋР РЏ Р В РЎвЂ”Р В РЎвЂўР В Р вЂ Р РЋРІР‚С™Р В РЎвЂўР РЋР вЂљР В Р’ВµР В Р вЂ¦Р В Р вЂ¦Р РЋР РЏ.
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
// ML MODEL Р Р†РІР‚С›РІР‚вЂњ1
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
  const socialSignals = await getUserSocialLearningSignals(userId);
  const mlResult = buildLearningMlModel(answers);

  if (!mlResult.trained || !mlResult.recommendations?.length) {
    return mlResult;
  }

  const topicToQuizId = {};

  answers.forEach((answer) => {
    const topic = answer.topic || 'Р В РІР‚ВР В Р’ВµР В Р’В· Р РЋРІР‚С™Р В Р’ВµР В РЎВР В РЎвЂ';

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
// ML MODEL Р Р†РІР‚С›РІР‚вЂњ2
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
// ML MODEL Р Р†РІР‚С›РІР‚вЂњ3
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



const NLP_STOP_WORDS = new Set([
  'РЎвЂ“', 'Р в„–', 'РЎвЂљР В°', 'Р В°Р В±Р С•', 'Р В°Р В»Р Вµ', 'РЎвЂ°Р С•', 'РЎвЂ Р Вµ', 'РЎРЏР С”', 'Р Т‘Р В»РЎРЏ', 'Р Р…Р В°', 'РЎС“', 'Р Р†', 'Р Т‘Р С•',
  'Р В·', 'РЎвЂ“Р В·', 'Р В·Р В°', 'Р С—РЎР‚Р С•', 'Р С—РЎР‚Р С‘', 'Р Р†РЎвЂ“Р Т‘', 'Р Р…Р В°Р Т‘', 'Р С—РЎвЂ“Р Т‘', 'Р СРЎвЂ“Р В¶', 'РЎвЂЎР ВµРЎР‚Р ВµР В·', 'Р В±Р ВµР В·',
  'РЎвЂќ', 'Р В±РЎС“РЎвЂљР С‘', 'Р В±РЎС“Р В»Р С•', 'Р В±РЎС“Р В»Р С‘', 'Р СР С•Р В¶Р Вµ', 'Р СР С•Р В¶РЎС“РЎвЂљРЎРЉ', 'Р СР В°РЎвЂќ', 'Р СР В°РЎР‹РЎвЂљРЎРЉ',
  'РЎРЏР С”Р С‘Р в„–', 'РЎРЏР С”Р В°', 'РЎРЏР С”Р Вµ', 'РЎРЏР С”РЎвЂ“', 'РЎвЂљР В°Р С”Р С•Р В¶', 'РЎвЂљР С•Р СРЎС“', 'Р Р…Р В°Р С—РЎР‚Р С‘Р С”Р В»Р В°Р Т‘',
  'Р Р†Р С•Р Р…Р В°', 'Р Р†Р С•Р Р…Р С‘', 'Р Р†Р С•Р Р…Р С•', 'Р Р†РЎвЂ“Р Р…', 'РЎвЂ Р ВµР в„–', 'РЎвЂ РЎРЏ', 'Р в„–Р С•Р С–Р С•', 'РЎвЂ”РЎвЂ”',
  'the', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with', 'is', 'are'
]);

const normalizeRecommendationText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[РўвЂ]/g, 'Р С–')
    .replace(/[^a-zР В°-РЎРЏРЎвЂ“РЎвЂ”РЎвЂќ0-9\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenizeRecommendationText = (value) => {
  const normalized = normalizeRecommendationText(value);

  return normalized
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .filter((token) => !NLP_STOP_WORDS.has(token));
};

const buildTextVector = (value) => {
  const tokens = tokenizeRecommendationText(value);
  const vector = new Map();

  tokens.forEach((token) => {
    vector.set(token, (vector.get(token) || 0) + 1);
  });

  return vector;
};

const cosineTextSimilarity = (a, b) => {
  const vectorA = buildTextVector(a);
  const vectorB = buildTextVector(b);

  if (!vectorA.size || !vectorB.size) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  vectorA.forEach((value, key) => {
    dot += value * (vectorB.get(key) || 0);
    normA += value * value;
  });

  vectorB.forEach((value) => {
    normB += value * value;
  });

  if (!normA || !normB) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const getRecommendationText = (item) => {
  if (!item) return '';

  return [
    item.title,
    item.name,
    item.description,
    item.content,
    item.category,
    item.topic,
    item.matchedTopic,
    item.reason,
    item.explanation,
  ]
    .filter(Boolean)
    .join(' ');
};

const getRecommendationId = (item) =>
  item?.id ||
  item?.$id ||
  item?.contentId ||
  item?.postId ||
  item?.lessonId ||
  item?.courseId ||
  null;

const getRecommendationType = (item) =>
  item?.type ||
  item?.recommendationType ||
  item?.contentType ||
  item?.entityType ||
  'material';

const getUserSocialLearningSignals = async (userId) => {
  if (!userId) {
    return {
      interactedPostIds: [],
      preferredCategories: [],
      preferredAuthors: [],
      interactionProfileText: '',
      totalSignals: 0,
    };
  }

  try {
    const [likes, saves, comments] = await Promise.all([
      databases.listDocuments(databaseId, likesCollectionId, [
        Query.equal('userId', userId),
        Query.limit(100),
      ]),
      databases.listDocuments(databaseId, savesCollectionId, [
        Query.equal('userId', userId),
        Query.limit(100),
      ]),
      databases.listDocuments(databaseId, commentsCollectionId, [
        Query.equal('authorId', userId),
        Query.limit(100),
      ]),
    ]);

    const weightedPostIds = new Map();

    const addSignal = (postId, weight) => {
      if (!postId) return;
      weightedPostIds.set(postId, (weightedPostIds.get(postId) || 0) + weight);
    };

    likes.documents.forEach((item) => addSignal(item.postId, 3));
    saves.documents.forEach((item) => addSignal(item.postId, 5));
    comments.documents.forEach((item) => addSignal(item.postId, 4));

    const interactedPostIds = [...weightedPostIds.keys()];

    const interactedPosts = await Promise.all(
      interactedPostIds.map(async (postId) => {
        try {
          return await getPostById(postId);
        } catch {
          return null;
        }
      })
    );

    const categoryScores = new Map();
    const authorScores = new Map();
    const profileTextParts = [];

    interactedPosts.filter(Boolean).forEach((post) => {
      const weight = weightedPostIds.get(post.$id) || 1;

      const postText = [
        post.title,
        post.description,
        post.content,
        post.category,
        post.authorName,
      ]
        .filter(Boolean)
        .join(' ');

      for (let index = 0; index < weight; index += 1) {
        profileTextParts.push(postText);
      }

      if (post.category) {
        categoryScores.set(
          post.category,
          (categoryScores.get(post.category) || 0) + weight
        );
      }

      if (post.authorId) {
        authorScores.set(
          post.authorId,
          (authorScores.get(post.authorId) || 0) + weight
        );
      }
    });

    return {
      interactedPostIds,
      preferredCategories: [...categoryScores.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([category, score]) => ({ category, score })),
      preferredAuthors: [...authorScores.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([authorId, score]) => ({ authorId, score })),
      interactionProfileText: profileTextParts.join(' '),
      totalSignals:
        likes.documents.length + saves.documents.length + comments.documents.length,
    };
  } catch (error) {
    console.log('getUserSocialLearningSignals error:', error);

    return {
      interactedPostIds: [],
      preferredCategories: [],
      preferredAuthors: [],
      interactionProfileText: '',
      totalSignals: 0,
    };
  }
};

const applySocialSignalsToRecommendations = (result, socialSignals) => {
  if (!result?.recommendations?.length) {
    return {
      ...result,
      socialSignals,
      recommendationPolicy: 'nlp_text_similarity',
      modelType: result?.modelType || 'Studdy NLP recommendation model',
    };
  }

  const interactedPostIds = new Set(socialSignals?.interactedPostIds || []);

  const preferredCategories = new Map(
    (socialSignals?.preferredCategories || []).map((item) => [
      item.category,
      Number(item.score || 0),
    ])
  );

  const preferredAuthors = new Map(
    (socialSignals?.preferredAuthors || []).map((item) => [
      item.authorId,
      Number(item.score || 0),
    ])
  );

  const interactionProfileText = socialSignals?.interactionProfileText || '';

  const normalized = result.recommendations.map((item) => {
    const id = getRecommendationId(item);
    const type = getRecommendationType(item);
    const itemText = getRecommendationText(item);
    const category = item.category || item.matchedTopic || item.topic || null;
    const authorId = item.authorId || item.creatorId || item.userId || null;

    const isExactInteractedPost =
      type === 'post' && id && interactedPostIds.has(id);

    const textSimilarity = cosineTextSimilarity(interactionProfileText, itemText);
    const textSimilarityBoost = Math.round(textSimilarity * 35);

    let boost = textSimilarityBoost;
    const reasons = [];

    if (textSimilarityBoost > 0) {
      reasons.push(`NLP-РЎРѓРЎвЂ¦Р С•Р В¶РЎвЂ“РЎРѓРЎвЂљРЎРЉ РЎвЂљР ВµР С”РЎРѓРЎвЂљРЎС“: ${Math.round(textSimilarity * 100)}%`);
    }

    if (category && preferredCategories.has(category)) {
      const categoryBoost = Math.min(12, preferredCategories.get(category));
      boost += categoryBoost;
      reasons.push(`РЎРѓРЎвЂ¦Р С•Р В¶Р В° Р С”Р В°РЎвЂљР ВµР С–Р С•РЎР‚РЎвЂ“РЎРЏ: "${category}"`);
    }

    if (authorId && preferredAuthors.has(authorId)) {
      const authorBoost = Math.min(8, preferredAuthors.get(authorId));
      boost += authorBoost;
      reasons.push('РЎРѓРЎвЂ¦Р С•Р В¶Р С‘Р в„– Р В°Р Р†РЎвЂљР С•РЎР‚ Р В°Р В±Р С• Р Т‘Р В¶Р ВµРЎР‚Р ВµР В»Р С•');
    }

    if (isExactInteractedPost) {
      boost -= 100;
      reasons.push('РЎвЂ Р ВµР в„– Р СР В°РЎвЂљР ВµРЎР‚РЎвЂ“Р В°Р В» РЎС“Р В¶Р Вµ Р В±РЎС“Р Р† РЎС“ Р Р†Р В·Р В°РЎвЂќР СР С•Р Т‘РЎвЂ“РЎРЏРЎвЂ¦ Р С”Р С•РЎР‚Р С‘РЎРѓРЎвЂљРЎС“Р Р†Р В°РЎвЂЎР В°');
    }

    const baseScore = Number(
      item.score ||
      item.recommendationScore ||
      item.priorityScore ||
      50
    );

    const nextScore = Math.max(0, Math.min(100, Math.round(baseScore + boost)));

    const previousReason = item.reason || item.explanation || 'Р В Р ВµР С”Р С•Р СР ВµР Р…Р Т‘Р С•Р Р†Р В°Р Р…Р С• Studdy ML.';
    const socialReason =
      reasons.length && !isExactInteractedPost
        ? ` Р вЂќР С•Р Т‘Р В°РЎвЂљР С”Р С•Р Р†Р С• Р Р†РЎР‚Р В°РЎвЂ¦Р С•Р Р†Р В°Р Р…Р С•: ${reasons.join(', ')}.`
        : '';

    return {
      ...item,
      id,
      type,
      category,
      authorId,
      score: nextScore,
      recommendationScore: nextScore,
      textSimilarity: Number(textSimilarity.toFixed(4)),
      isExactInteractedPost,
      reason: `${previousReason}${socialReason}`,
    };
  });

  const filtered = normalized
    .filter((item) => !item.isExactInteractedPost)
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));

  const categoryLimits = new Map();
  const typeLimits = new Map();
  const diversified = [];

  for (const item of filtered) {
    const category = item.category || 'general';
    const type = item.type || 'material';

    const categoryCount = categoryLimits.get(category) || 0;
    const typeCount = typeLimits.get(type) || 0;

    if (categoryCount >= 3 || typeCount >= 6) {
      continue;
    }

    diversified.push(item);
    categoryLimits.set(category, categoryCount + 1);
    typeLimits.set(type, typeCount + 1);
  }

  return {
    ...result,
    recommendations: diversified.length ? diversified : filtered,
    socialSignals,
    recommendationPolicy:
      'nlp_text_similarity_without_recommending_exact_interacted_posts',
    modelType: result.modelType
      ? `${result.modelType} + NLP text similarity + diversity filter`
      : 'Studdy ML + NLP text similarity + diversity filter',
  };
};


const SEARCH_NLP_STOP_WORDS = new Set([
  'РЎвЂ“', 'Р в„–', 'РЎвЂљР В°', 'Р В°Р В±Р С•', 'Р В°Р В»Р Вµ', 'РЎвЂ°Р С•', 'РЎвЂ Р Вµ', 'РЎРЏР С”', 'Р Т‘Р В»РЎРЏ', 'Р Р…Р В°', 'РЎС“', 'Р Р†', 'Р Т‘Р С•',
  'Р В·', 'РЎвЂ“Р В·', 'Р В·Р В°', 'Р С—РЎР‚Р С•', 'Р С—РЎР‚Р С‘', 'Р Р†РЎвЂ“Р Т‘', 'Р Р…Р В°Р Т‘', 'Р С—РЎвЂ“Р Т‘', 'Р СРЎвЂ“Р В¶', 'РЎвЂЎР ВµРЎР‚Р ВµР В·', 'Р В±Р ВµР В·',
  'РЎвЂќ', 'Р В±РЎС“РЎвЂљР С‘', 'Р В±РЎС“Р В»Р С•', 'Р В±РЎС“Р В»Р С‘', 'Р СР С•Р В¶Р Вµ', 'Р СР С•Р В¶РЎС“РЎвЂљРЎРЉ', 'Р СР В°РЎвЂќ', 'Р СР В°РЎР‹РЎвЂљРЎРЉ',
  'РЎРЏР С”Р С‘Р в„–', 'РЎРЏР С”Р В°', 'РЎРЏР С”Р Вµ', 'РЎРЏР С”РЎвЂ“', 'РЎвЂљР В°Р С”Р С•Р В¶', 'РЎвЂљР С•Р СРЎС“', 'Р Р…Р В°Р С—РЎР‚Р С‘Р С”Р В»Р В°Р Т‘',
  'Р Р†Р С•Р Р…Р В°', 'Р Р†Р С•Р Р…Р С‘', 'Р Р†Р С•Р Р…Р С•', 'Р Р†РЎвЂ“Р Р…', 'РЎвЂ Р ВµР в„–', 'РЎвЂ РЎРЏ', 'Р в„–Р С•Р С–Р С•', 'РЎвЂ”РЎвЂ”',
  'the', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with', 'is', 'are'
]);

const searchNormalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[РўвЂ]/g, 'Р С–')
    .replace(/[^a-zР В°-РЎРЏРЎвЂ“РЎвЂ”РЎвЂќ0-9\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const searchTokenizeText = (value) => {
  const normalized = searchNormalizeText(value);

  const baseTokens = normalized
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .filter((token) => !SEARCH_NLP_STOP_WORDS.has(token));

  const tokens = [...baseTokens];

  for (let index = 0; index < baseTokens.length - 1; index += 1) {
    tokens.push(baseTokens[index] + ' ' + baseTokens[index + 1]);
  }

  return tokens;
};

const searchBuildVector = (value) => {
  const tokens = searchTokenizeText(value);
  const vector = new Map();

  tokens.forEach((token) => {
    vector.set(token, (vector.get(token) || 0) + 1);
  });

  return vector;
};

const searchCosineSimilarity = (query, text) => {
  const vectorA = searchBuildVector(query);
  const vectorB = searchBuildVector(text);

  if (!vectorA.size || !vectorB.size) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  vectorA.forEach((value, key) => {
    dot += value * (vectorB.get(key) || 0);
    normA += value * value;
  });

  vectorB.forEach((value) => {
    normB += value * value;
  });

  if (!normA || !normB) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const searchTextCoverage = (query, text) => {
  const queryTokens = searchTokenizeText(query).filter((token) => !token.includes(' '));
  const textTokens = new Set(searchTokenizeText(text));

  if (!queryTokens.length || !textTokens.size) return 0;

  const matched = queryTokens.filter((token) => textTokens.has(token)).length;

  return matched / queryTokens.length;
};

const getSearchItemText = (item) =>
  [
    item.title,
    item.name,
    item.description,
    item.content,
    item.category,
    item.topic,
    item.authorName,
  ]
    .filter(Boolean)
    .join(' ');

const toSearchResult = (item, type, query) => {
  const text = getSearchItemText(item);
  const normalizedQuery = searchNormalizeText(query);
  const normalizedText = searchNormalizeText(text);
  const normalizedTitle = searchNormalizeText(item.title || item.name || '');

  const cosine = searchCosineSimilarity(query, text);
  const coverage = searchTextCoverage(query, text);

  let score = Math.round(cosine * 65 + coverage * 25);

  if (normalizedQuery && normalizedTitle.includes(normalizedQuery)) {
    score += 25;
  }

  if (normalizedQuery && normalizedText.includes(normalizedQuery)) {
    score += 15;
  }

  if (item.category && normalizedQuery && searchNormalizeText(item.category).includes(normalizedQuery)) {
    score += 12;
  }

  score = Math.max(0, Math.min(100, score));

  return {
    ...item,
    id: item.$id,
    type,
    searchScore: score,
    textSimilarity: Number(cosine.toFixed(4)),
    tokenCoverage: Number(coverage.toFixed(4)),
    reason:
      score > 0
        ? 'Р вЂ”Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р С• РЎвЂЎР ВµРЎР‚Р ВµР В· NLP-РЎРѓРЎвЂ¦Р С•Р В¶РЎвЂ“РЎРѓРЎвЂљРЎРЉ РЎвЂљР ВµР С”РЎРѓРЎвЂљРЎС“, Р Р…Р В°Р В·Р Р†Р С‘, Р С•Р С—Р С‘РЎРѓРЎС“ РЎвЂљР В° Р С”Р В°РЎвЂљР ВµР С–Р С•РЎР‚РЎвЂ“РЎвЂ”.'
        : 'Р СљР В°РЎвЂљР ВµРЎР‚РЎвЂ“Р В°Р В» Р СР В°РЎвЂќ Р Р…Р С‘Р В·РЎРЉР С”РЎС“ РЎРѓРЎвЂ¦Р С•Р В¶РЎвЂ“РЎРѓРЎвЂљРЎРЉ РЎвЂ“Р В· Р В·Р В°Р С—Р С‘РЎвЂљР С•Р С.',
  };
};

export const searchContentWithNlp = async ({ query, limit = 30 } = {}) => {
  const cleanedQuery = String(query || '').trim();

  if (!cleanedQuery) {
    return {
      query: '',
      modelType: 'NLP text similarity search',
      results: [],
    };
  }

  const safeList = async (collectionId, queries = []) => {
    try {
      const result = await databases.listDocuments(
        databaseId,
        collectionId,
        queries
      );

      return result.documents || [];
    } catch (error) {
      console.log('searchContentWithNlp safeList error:', collectionId, error);
      return [];
    }
  };

  const [courses, lessons, posts] = await Promise.all([
    safeList(coursesCollectionId, [
      Query.limit(100),
      Query.orderDesc('$createdAt'),
    ]),
    safeList(lessonsCollectionId, [
      Query.limit(100),
      Query.orderDesc('$createdAt'),
    ]),
    safeList(postsCollectionId, [
      Query.limit(100),
      Query.orderDesc('$createdAt'),
    ]),
  ]);

  const results = [
    ...courses.map((item) => toSearchResult(item, 'course', cleanedQuery)),
    ...lessons.map((item) => toSearchResult(item, 'lesson', cleanedQuery)),
    ...posts.map((item) => toSearchResult(item, 'post', cleanedQuery)),
  ]
    .filter((item) => item.searchScore >= 8)
    .sort((a, b) => b.searchScore - a.searchScore)
    .slice(0, limit);

  return {
    query: cleanedQuery,
    modelType: 'NLP text similarity search',
    resultCount: results.length,
    results,
  };
};


export const getUserContentRecommendations = async (userId) => {
  if (!userId) {
    return {
      trained: false,
      recommendations: [],
    };
  }

  const answers = await getUserQuizAnswers(userId);
  const socialSignals = await getUserSocialLearningSignals(userId);

  const mlLearning = buildLearningMlModel(answers);
  const mastery = buildKnowledgeMasteryModel(answers);

  const [courses, lessons, posts] = await Promise.all([
    getAllCourses(),
    getAllLessonsForRecommendations(),
    getAllPostsForRecommendations(),
  ]);

  const baseRecommendations = buildContentRecommendationModel({
    courses,
    lessons,
    posts,
    mlRecommendations: mlLearning.recommendations || [],
    masteryTopics: mastery.topics || [],
  });

  return applySocialSignalsToRecommendations(baseRecommendations, socialSignals);
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


const normalizeCorrectOption = (value) => {
  const option = String(value || '').trim().toUpperCase();

  if (['A', 'B', 'C', 'D'].includes(option)) {
    return option;
  }

  return 'A';
};

export async function saveMlGeneratedQuiz({
  lessonId,
  courseId,
  title,
  questions,
}) {
  if (!lessonId) {
    throw new Error('lessonId is required for saving generated quiz.');
  }

  if (!courseId) {
    throw new Error('courseId is required for saving generated quiz.');
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Generated quiz has no questions.');
  }

  const user = await getCurrentUser();

  if (!user?.accountId) {
    throw new Error('Р В РЎСљР В Р’Вµ Р В Р вЂ Р В РўвЂР В Р’В°Р В Р’В»Р В РЎвЂўР РЋР С“Р РЋР РЏ Р В Р вЂ Р В РЎвЂР В Р’В·Р В Р вЂ¦Р В Р’В°Р РЋРІР‚РЋР В РЎвЂР РЋРІР‚С™Р В РЎвЂ Р В РЎвЂќР В РЎвЂўР РЋР вЂљР В РЎвЂР РЋР С“Р РЋРІР‚С™Р РЋРЎвЂњР В Р вЂ Р В Р’В°Р РЋРІР‚РЋР В Р’В° Р В РўвЂР В Р’В»Р РЋР РЏ Р В Р’В·Р В Р’В±Р В Р’ВµР РЋР вЂљР В Р’ВµР В Р’В¶Р В Р’ВµР В Р вЂ¦Р В Р вЂ¦Р РЋР РЏ Р РЋРІР‚С™Р В Р’ВµР РЋР С“Р РЋРІР‚С™Р РЋРЎвЂњ.');
  }

  const quizDocument = await createQuiz({
    courseId,
    lessonId,
    title: title || 'ML-Р В Р’В·Р В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р В Р’ВµР РЋР вЂљР В РЎвЂўР В Р вЂ Р В Р’В°Р В Р вЂ¦Р В РЎвЂР В РІвЂћвЂ“ Р РЋРІР‚С™Р В Р’ВµР РЋР С“Р РЋРІР‚С™',
    passingScore: 60,
    user,
  });

  const createdQuestions = [];

  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];

    const createdQuestion = await createQuestion({
      quizId: quizDocument.$id,
      questionText: question.questionText || '',
      optionA: question.optionA || '',
      optionB: question.optionB || '',
      optionC: question.optionC || '',
      optionD: question.optionD || '',
      correctOption: normalizeCorrectOption(question.correctOption),
      explanation: question.explanation || '',
      topic: question.topic || title || 'ML Quiz',
      difficulty: Number(question.difficulty) || 1,
      questionOrder: Number(question.questionOrder) || index + 1,
      user,
    });

    createdQuestions.push(createdQuestion);
  }

  return {
    quiz: quizDocument,
    questions: createdQuestions,
  };
}










export const getUserGamificationProfile = async (userId) => {
  if (!userId) {
    return {
      xp: 0,
      level: 1,
      rank: 'Р СњР С•Р Р†Р В°РЎвЂЎР С•Р С”',
      levelProgress: 0,
      nextLevelXp: 280,
      counters: {},
      dailyQuest: {},
      achievements: [],
    };
  }

  const safeList = async (collectionId, queries) => {
    try {
      const result = await databases.listDocuments(databaseId, collectionId, queries);
      return result.documents || [];
    } catch (error) {
      console.log('gamification safeList error:', collectionId, error);
      return [];
    }
  };

  const isToday = (dateValue) => {
    if (!dateValue) return false;

    const date = new Date(dateValue);
    const today = new Date();

    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const getRank = (level) => {
    if (level >= 26) return 'Studdy Master';
    if (level >= 19) return 'Data Specialist';
    if (level >= 13) return 'ML Explorer';
    if (level >= 8) return 'Р С’Р Р…Р В°Р В»РЎвЂ“РЎвЂљР С‘Р С”';
    if (level >= 4) return 'Р вЂќР С•РЎРѓР В»РЎвЂ“Р Т‘Р Р…Р С‘Р С”';
    return 'Р СњР С•Р Р†Р В°РЎвЂЎР С•Р С”';
  };

  const getCorrectValue = (answer) => {
    if (typeof answer?.isCorrect === 'boolean') return answer.isCorrect;
    if (typeof answer?.correct === 'boolean') return answer.correct;
    if (typeof answer?.isRight === 'boolean') return answer.isRight;

    if (
      answer?.selectedOption &&
      answer?.correctOption &&
      answer.selectedOption === answer.correctOption
    ) {
      return true;
    }

    return false;
  };

  try {
    const [answers, likes, saves, comments, viewEvents, searchEvents] =
      await Promise.all([
        getUserQuizAnswers(userId),
        safeList(likesCollectionId, [
          Query.equal('userId', userId),
          Query.limit(100),
        ]),
        safeList(savesCollectionId, [
          Query.equal('userId', userId),
          Query.limit(100),
        ]),
        safeList(commentsCollectionId, [
          Query.equal('authorId', userId),
          Query.limit(100),
        ]),
        safeList(viewEventsCollectionId, [
          Query.equal('userId', userId),
          Query.limit(100),
        ]),
        safeList(searchEventsCollectionId, [
          Query.equal('userId', userId),
          Query.limit(100),
        ]),
      ]);

    const totalAnswers = answers.length;
    const correctAnswers = answers.filter(getCorrectValue).length;
    const incorrectAnswers = Math.max(totalAnswers - correctAnswers, 0);

    const todayAnswers = answers.filter((item) => isToday(item.$createdAt));
    const todayLikes = likes.filter((item) => isToday(item.$createdAt));
    const todaySaves = saves.filter((item) => isToday(item.$createdAt));
    const todayComments = comments.filter((item) => isToday(item.$createdAt));
    const todayViews = viewEvents.filter((item) => isToday(item.$createdAt));
    const todaySearches = searchEvents.filter((item) => isToday(item.$createdAt));

    const videoViews = viewEvents.filter(
      (item) => item.source === 'video_feed' || item.source === 'shorts'
    );

    const lessonViews = viewEvents.filter((item) => item.contentType === 'lesson');
    const courseViews = viewEvents.filter((item) => item.contentType === 'course');

    const todayVideoViews = todayViews.filter(
      (item) => item.source === 'video_feed' || item.source === 'shorts'
    );

    const todayRecommendationViews = todayViews.filter(
      (item) =>
        item.source === 'ml_recommendation' ||
        item.source === 'recommendation' ||
        item.source === 'home_feed'
    );

    const activeDates = new Set(
      [
        ...answers,
        ...likes,
        ...saves,
        ...comments,
        ...viewEvents,
        ...searchEvents,
      ]
        .map((item) => item.$createdAt)
        .filter(Boolean)
        .map((date) => new Date(date).toDateString())
    );

    let streakDays = 0;
    const cursor = new Date();

    while (activeDates.has(cursor.toDateString())) {
      streakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const accuracy = totalAnswers
      ? Math.round((correctAnswers / totalAnswers) * 100)
      : 0;

    const xp =
      correctAnswers * 16 +
      incorrectAnswers * 4 +
      likes.length * 4 +
      saves.length * 8 +
      comments.length * 10 +
      viewEvents.length * 3 +
      searchEvents.length * 2 +
      videoViews.length * 6 +
      lessonViews.length * 10 +
      courseViews.length * 18 +
      streakDays * 20;

    const xpPerLevel = 280;
    const level = Math.max(1, Math.floor(xp / xpPerLevel) + 1);
    const levelBase = (level - 1) * xpPerLevel;
    const nextLevelXp = level * xpPerLevel;
    const levelProgress = Math.min(
      100,
      Math.max(0, Math.round(((xp - levelBase) / xpPerLevel) * 100))
    );

    const dailyQuest = {
      watchedShort: todayVideoViews.length > 0,
      interacted:
        todayLikes.length + todaySaves.length + todayComments.length > 0,
      quizCompleted: todayAnswers.length > 0,
      openedRecommendation: todayRecommendationViews.length > 0,
      todayActions:
        todayAnswers.length +
        todayLikes.length +
        todaySaves.length +
        todayComments.length +
        todayViews.length +
        todaySearches.length,
    };

    return {
      xp,
      level,
      rank: getRank(level),
      levelProgress,
      nextLevelXp,
      accuracy,
      streakDays,
      counters: {
        totalAnswers,
        correctAnswers,
        incorrectAnswers,
        likesCount: likes.length,
        savesCount: saves.length,
        commentsCount: comments.length,
        viewsCount: viewEvents.length,
        searchesCount: searchEvents.length,
        videoViewsCount: videoViews.length,
        lessonViewsCount: lessonViews.length,
        courseViewsCount: courseViews.length,
        todayActions: dailyQuest.todayActions,
      },
      dailyQuest,
      achievements: [
        {
          icon: 'СЂСџР‹Р‡',
          title: 'Р СџР ВµРЎР‚РЎв‚¬Р С‘Р в„– Р С—РЎР‚Р С•РЎР‚Р С‘Р Р†',
          description: '10 Р С—РЎР‚Р В°Р Р†Р С‘Р В»РЎРЉР Р…Р С‘РЎвЂ¦ Р Р†РЎвЂ“Р Т‘Р С—Р С•Р Р†РЎвЂ“Р Т‘Р ВµР в„–',
          unlocked: correctAnswers >= 10,
        },
        {
          icon: 'СЂСџР‹В¬',
          title: 'Shorts-Р Р…Р В°Р Р†РЎвЂЎР В°Р Р…Р Р…РЎРЏ',
          description: '5 Р С”Р С•РЎР‚Р С•РЎвЂљР С”Р С‘РЎвЂ¦ Р Р†РЎвЂ“Р Т‘Р ВµР С•',
          unlocked: videoViews.length >= 5,
        },
        {
          icon: 'СЂСџвЂ™В¬',
          title: 'Р С’Р С”РЎвЂљР С‘Р Р†Р Р…Р С‘Р в„– РЎС“РЎвЂЎР В°РЎРѓР Р…Р С‘Р С”',
          description: '3 Р С”Р С•Р СР ВµР Р…РЎвЂљР В°РЎР‚РЎвЂ“',
          unlocked: comments.length >= 3,
        },
        {
          icon: 'СЂСџвЂ™С•',
          title: 'Р С™Р С•Р В»Р ВµР С”РЎвЂ РЎвЂ“Р С•Р Р…Р ВµРЎР‚ Р В·Р Р…Р В°Р Р…РЎРЉ',
          description: '3 Р В·Р В±Р ВµРЎР‚Р ВµР В¶Р ВµР Р…РЎвЂ“ Р СР В°РЎвЂљР ВµРЎР‚РЎвЂ“Р В°Р В»Р С‘',
          unlocked: saves.length >= 3,
        },
        {
          icon: 'СЂСџВ§В ',
          title: 'Р СћР С•РЎвЂЎР Р…Р С‘Р в„– Р СР С•Р В·Р С•Р С”',
          description: '70%+ РЎвЂљР С•РЎвЂЎР Р…Р С•РЎРѓРЎвЂљРЎвЂ“',
          unlocked: accuracy >= 70 && totalAnswers >= 5,
        },
        {
          icon: 'СЂСџС™Р‚',
          title: 'Р СњР С•Р Р†Р С‘Р в„– РЎР‚РЎвЂ“Р Р†Р ВµР Р…РЎРЉ',
          description: 'Р вЂќР С•РЎРѓРЎРЏР С–Р Р…Р С‘ РЎР‚РЎвЂ“Р Р†Р Р…РЎРЏ 5',
          unlocked: level >= 5,
        },
      ],
    };
  } catch (error) {
    console.log('getUserGamificationProfile error:', error);

    return {
      xp: 0,
      level: 1,
      rank: 'Р СњР С•Р Р†Р В°РЎвЂЎР С•Р С”',
      levelProgress: 0,
      nextLevelXp: 280,
      accuracy: 0,
      streakDays: 0,
      counters: {},
      dailyQuest: {},
      achievements: [],
    };
  }
};














