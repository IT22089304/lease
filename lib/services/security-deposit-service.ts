import { collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export type SecurityDeposit = {
  leaseId: string;
  renterId: string;
  landlordId: string;
  amount: number;
  paidDate: Date;
  paymentMethod: string;
  transactionId?: string;
  invoiceId?: string;
  createdAt?: Date;
};

export const securityDepositService = {
  async createDeposit(deposit: Omit<SecurityDeposit, "createdAt">): Promise<string> {
    const docRef = await addDoc(collection(db, "securityDeposits"), {
      ...deposit,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async getDepositsByLease(leaseId: string): Promise<SecurityDeposit[]> {
    const q = query(collection(db, "securityDeposits"), where("leaseId", "==", leaseId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      paidDate: doc.data().paidDate?.toDate?.() || doc.data().paidDate,
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    })) as SecurityDeposit[];
  },
}; 