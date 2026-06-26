import { firestore as db } from '../firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  doc,
  updateDoc
} from 'firebase/firestore';

// -- PRODUCTS --
export const addProduct = async (productData: any) => {
  try {
    const docRef = await addDoc(collection(db, 'products'), {
      ...productData,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding product: ", error);
    throw error;
  }
};

export const getProducts = async (wholesalerId?: string) => {
  try {
    let q = collection(db, 'products');
    if (wholesalerId) {
      q = query(q, where("wholesalerId", "==", wholesalerId));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting products: ", error);
    throw error;
  }
};

// -- POSTS --
export const addPost = async (postData: any) => {
  try {
    const docRef = await addDoc(collection(db, 'posts'), {
      ...postData,
      likes: 0,
      comments: 0,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding post: ", error);
    throw error;
  }
};

export const subscribeToPosts = (callback: (posts: any[]) => void) => {
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (querySnapshot) => {
    const posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(posts);
  });
};

// -- PROBLEMS & SOLUTIONS --
export const addProblem = async (problemData: any) => {
  try {
    const docRef = await addDoc(collection(db, 'problems'), {
      ...problemData,
      status: 'open',
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding problem: ", error);
    throw error;
  }
};

export const addSolution = async (solutionData: any) => {
  try {
    const docRef = await addDoc(collection(db, 'solutions'), {
      ...solutionData,
      upvotes: 0,
      isAccepted: false,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding solution: ", error);
    throw error;
  }
};

// -- PROFILES --
export const updateProfile = async (userId: string, profileData: any) => {
  try {
    const profileRef = doc(db, 'profiles', userId);
    await updateDoc(profileRef, profileData);
  } catch (error) {
    console.error("Error updating profile: ", error);
    throw error;
  }
};
