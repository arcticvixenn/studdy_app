import {
  Account,
  Client,
  ID,
  Avatars,
  Databases,
  Query,
  Storage,
} from 'react-native-appwrite';

export const config = {
  endpoint: 'https://cloud.appwrite.io/v1',
  platform: 'com.lnu.studdy',
  projectId: '6738b5ec003cb69f2dae',
  databaseId: '6738b84f000268d0ebc7',
  userCollectionId: '6738b886001d02b1e41c',
  videoCollectionId: '6738b8af0028eced2e77',
  storageId: '6739c607003e49ff5ec2',
};

const {
  endpoint,
  platform,
  projectId,
  databaseId,
  userCollectionId,
  videoCollectionId,
  storageId,
} = config;

const client = new Client();

client
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setPlatform(platform);

const account = new Account(client);
const avatars = new Avatars(client);
const databases = new Databases(client);
const storage = new Storage(client);

export const createUser = async (email, password, username) => {
  try {
    const newAccount = await account.create(
      ID.unique(),
      email,
      password,
      username
    );

    if (!newAccount) {
      throw new Error('Не вдалося створити обліковий запис.');
    }

    const avatarUrl = avatars.getInitials(username);

    await signIn(email, password);

    const newUser = await databases.createDocument(
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

    return newUser;
  } catch (error) {
    console.log('createUser error:', error);
    throw new Error(error?.message || 'Помилка під час реєстрації.');
  }
};

export const signIn = async (email, password) => {
  try {
    const session = await account.createEmailPasswordSession(email, password);
    return session;
  } catch (error) {
    console.log('signIn error:', error);
    throw new Error(error?.message || 'Помилка під час входу.');
  }
};

export const getCurrentUser = async () => {
  try {
    const currentAccount = await account.get();

    if (!currentAccount) {
      return null;
    }

    const currentUser = await databases.listDocuments(
      databaseId,
      userCollectionId,
      [Query.equal('accountId', currentAccount.$id)]
    );

    return currentUser.documents[0] || null;
  } catch (error) {
    console.log('getCurrentUser error:', error);
    return null;
  }
};

export const getAllPosts = async () => {
  try {
    const posts = await databases.listDocuments(
      databaseId,
      videoCollectionId,
      [Query.orderDesc('$createdAt')]
    );

    return posts.documents;
  } catch (error) {
    console.log('getAllPosts error:', error);
    throw new Error(error?.message || 'Не вдалося завантажити пости.');
  }
};

export const getLatestPosts = async () => {
  try {
    const posts = await databases.listDocuments(
      databaseId,
      videoCollectionId,
      [Query.orderDesc('$createdAt'), Query.limit(7)]
    );

    return posts.documents;
  } catch (error) {
    console.log('getLatestPosts error:', error);
    throw new Error(error?.message || 'Не вдалося завантажити останні пости.');
  }
};

export const searchPosts = async (query) => {
  try {
    const posts = await databases.listDocuments(
      databaseId,
      videoCollectionId,
      [Query.search('title', query)]
    );

    return posts.documents;
  } catch (error) {
    console.log('searchPosts error:', error);
    throw new Error(error?.message || 'Помилка під час пошуку.');
  }
};

export const getUserPosts = async (userId) => {
  try {
    const posts = await databases.listDocuments(
      databaseId,
      videoCollectionId,
      [Query.equal('creator', userId), Query.orderDesc('$createdAt')]
    );

    return posts.documents;
  } catch (error) {
    console.log('getUserPosts error:', error);
    throw new Error(error?.message || 'Не вдалося завантажити пости користувача.');
  }
};

export const signOut = async () => {
  try {
    const session = await account.deleteSession('current');
    return session;
  } catch (error) {
    console.log('signOut error:', error);
    throw new Error(error?.message || 'Помилка під час виходу.');
  }
};

export const getFilePreview = async (fileId, type) => {
  try {
    if (type === 'video') {
      return storage.getFileView(storageId, fileId);
    }

    if (type === 'image') {
      return storage.getFilePreview(
        storageId,
        fileId,
        2000,
        2000,
        'top',
        100
      );
    }

    throw new Error('Невідомий тип файлу.');
  } catch (error) {
    console.log('getFilePreview error:', error);
    throw new Error(error?.message || 'Не вдалося сформувати посилання на файл.');
  }
};

export const uploadFile = async (file, type) => {
  if (!file) {
    return null;
  }

  const asset = {
    name: file.fileName,
    type: file.mimeType,
    size: file.fileSize,
    uri: file.uri,
  };

  try {
    const uploadedFile = await storage.createFile(
      storageId,
      ID.unique(),
      asset
    );

    const fileUrl = await getFilePreview(uploadedFile.$id, type);

    return fileUrl;
  } catch (error) {
    console.log('uploadFile error:', error);
    throw new Error(error?.message || 'Не вдалося завантажити файл.');
  }
};

export const createVideo = async (form) => {
  try {
    const [thumbnailUrl, videoUrl] = await Promise.all([
      uploadFile(form.thumbnail, 'image'),
      uploadFile(form.video, 'video'),
    ]);

    const newPost = await databases.createDocument(
      databaseId,
      videoCollectionId,
      ID.unique(),
      {
        title: form.title,
        thumbnail: thumbnailUrl,
        video: videoUrl,
        prompt: form.prompt,
        creator: form.userId,
      }
    );

    return newPost;
  } catch (error) {
    console.log('createVideo error:', error);
    throw new Error(error?.message || 'Не вдалося створити публікацію.');
  }
};