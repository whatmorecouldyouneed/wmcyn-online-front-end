import { useEffect, useState } from 'react';
import { firestore } from '../utils/lib/firebase';
import { collection, query, getDocs, doc, deleteDoc, setDoc, getDoc, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export function useUserProducts() {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) {
      setProducts([]);
      return;
    }
    if (!firestore) {
      console.error('Firestore not initialized');
      return;
    }

    const fetchProducts = async () => {
      if (!firestore) {
        console.error('Firestore not initialized');
        return;
      }
      const q = query(collection(firestore, `users/${currentUser.uid}/products`));
      const snapshot = await getDocs(q);
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    fetchProducts();
  }, [currentUser]);

  const transferProduct = async (productId: string, toEmail: string) => {
    if (!currentUser) throw new Error('No user logged in');
    if (!firestore) throw new Error('Firestore not initialized');

    // Find target user by email
    const usersQuery = query(collection(firestore, 'users'), where('email', '==', toEmail));
    const usersSnapshot = await getDocs(usersQuery);
    if (usersSnapshot.empty) throw new Error('User not found');
    const targetUid = usersSnapshot.docs[0].id;

    // Get product data
    const productRef = doc(firestore, `users/${currentUser.uid}/products`, productId);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) throw new Error('Product not found');
    const productData = productSnap.data();

    // Add to target user
    await setDoc(doc(firestore, `users/${targetUid}/products`, productId), productData);

    // Remove from current
    await deleteDoc(productRef);

    // Refresh products
    const q = query(collection(firestore, `users/${currentUser.uid}/products`));
    const snapshot = await getDocs(q);
    setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  return { products, transferProduct };
} 