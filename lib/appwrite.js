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

const client = new Client();

client
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setPlatform(platform);

const account = new Account(client);
const avatars = new Avatars(client);
const databases = new Databases(client);
const storage = new Storage(client);

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

export const signOut = async () => {
  try {
    const session = await account.deleteSession('current');
    return session;
  } catch (error) {
    console.log('signOut error:', error);
    throw new Error(error?.message || 'Помилка під час виходу.');
  }
};

// -----------------------------
// POSTS
// -----------------------------

export const getAllPosts = async () => {
  try {
    const posts = await databases.listDocuments(
      databaseId,
      postsCollectionId,
      [Query.orderDesc('$createdAt')]
    );

    return posts.documents;
  } catch (error) {
    console.log('getAllPosts error:', error);
    throw new Error(error?.message || 'Не вдалося завантажити публікації.');
  }
};

export const getUserPosts = async (userId) => {
  if (!userId) {
    return [];
  }

  try {
    const posts = await databases.listDocuments(
      databaseId,
      postsCollectionId,
      [
        Query.equal('authorId', userId),
        Query.orderDesc('$createdAt'),
      ]
    );

    return posts.documents;
  } catch (error) {
    console.log('getUserPosts error:', error);
    throw new Error(
      error?.message || 'Не вдалося завантажити публікації користувача.'
    );
  }
};

export const searchPosts = async (query) => {
  const cleanQuery = typeof query === 'string' ? query.trim() : '';

  if (!cleanQuery) {
    return [];
  }

  try {
    const posts = await databases.listDocuments(
      databaseId,
      postsCollectionId,
      [Query.search('title', cleanQuery)]
    );

    return posts.documents;
  } catch (error) {
    console.log('searchPosts error:', error);
    throw new Error(error?.message || 'Помилка під час пошуку публікацій.');
  }
};

// -----------------------------
// STORAGE FOR POST IMAGES
// -----------------------------

const getImagePreview = async (fileId) => {
  try {
    return storage.getFilePreview(
      storageId,
      fileId,
      2000,
      2000,
      'top',
      100
    );
  } catch (error) {
    console.log('getImagePreview error:', error);
    throw new Error(
      error?.message || 'Не вдалося сформувати посилання на зображення.'
    );
  }
};

const uploadPostImage = async (image) => {
  if (!image) {
    return {
      imageUrl: null,
      imageId: null,
    };
  }

  const asset = {
    name: image.fileName || `studdy-post-${Date.now()}.jpg`,
    type: image.mimeType || 'image/jpeg',
    size: image.fileSize || 0,
    uri: image.uri,
  };

  try {
    const uploadedFile = await storage.createFile(
      storageId,
      ID.unique(),
      asset
    );

    const imageUrl = await getImagePreview(uploadedFile.$id);

    return {
      imageUrl,
      imageId: uploadedFile.$id,
    };
  } catch (error) {
    console.log('uploadPostImage error:', error);
    throw new Error(error?.message || 'Не вдалося завантажити зображення.');
  }
};

export const createPost = async ({
  title,
  content,
  category,
  image,
  user,
}) => {
  if (!user?.$id) {
    throw new Error('Не вдалося визначити автора публікації.');
  }

  try {
    const { imageUrl, imageId } = await uploadPostImage(image);

    const newPost = await databases.createDocument(
      databaseId,
      postsCollectionId,
      ID.unique(),
      {
        title: title.trim(),
        content: content.trim(),
        category,
        authorId: user.$id,
        authorName: user.username || 'Користувач Studdy',
        authorAvatar: user.avatar || null,
        imageUrl,
        imageId,
        likesCount: 0,
        commentsCount: 0,
      }
    );

    return newPost;
  } catch (error) {
    console.log('createPost error:', error);
    throw new Error(error?.message || 'Не вдалося створити публікацію.');
  }
};