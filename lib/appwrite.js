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

import { Platform } from 'react-native';

export const config = {
  endpoint: 'https://cloud.appwrite.io/v1',
  platform: 'com.lnu.studdy',
  projectId: '6738b5ec003cb69f2dae',
  databaseId: '6738b84f000268d0ebc7',

  userCollectionId: '6738b886001d02b1e41c',
  postsCollectionId: 'posts',
  commentsCollectionId: 'comments',
  likesCollectionId: 'likes',

  storageId: '6739c607003e49ff5ec2',
};

const {
  endpoint,
  platform,
  projectId,
  databaseId,
  userCollectionId,
  postsCollectionId,
  storageId,
} = config;

// React Native / Expo client
const client = new Client();

client
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setPlatform(platform);

const account = new Account(client);
const avatars = new Avatars(client);
const databases = new Databases(client);
const storage = new Storage(client);

// Web client only for browser file uploads
const webClient = new WebClient();

webClient
  .setEndpoint(endpoint)
  .setProject(projectId);

const webStorage = new WebStorage(webClient);

// -----------------------------
// AUTH
// -----------------------------

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

// -----------------------------
// POSTS
// -----------------------------

export const getAllPosts = async () => {
  const posts = await databases.listDocuments(
    databaseId,
    postsCollectionId,
    [Query.orderDesc('$createdAt')]
  );

  return posts.documents;
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

// -----------------------------
// FILE UPLOAD
// -----------------------------

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

// -----------------------------
// CREATE POST
// -----------------------------

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
      }
    );
  } catch (error) {
    console.log('createPost error:', error);
    throw new Error(error?.message || 'Не вдалося створити публікацію.');
  }
};


// -----------------------------
// LIKES
// -----------------------------

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
        config.likesCollectionId,
        [
          Query.equal('postId', postId),
          Query.limit(1),
        ]
      ),

      userId
        ? databases.listDocuments(
            databaseId,
            config.likesCollectionId,
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
        config.likesCollectionId,
        currentLikeId
      );
    } else {
      await databases.createDocument(
        databaseId,
        config.likesCollectionId,
        ID.unique(),
        {
          postId,
          userId: user.$id,
        },
        [
          Permission.delete(Role.user(user.accountId)),
        ]
      );
    }

    return await getPostLikeState(postId, user.$id);
  } catch (error) {
    console.log('togglePostLike error:', error);
    throw new Error(error?.message || 'Не вдалося змінити лайк.');
  }
};