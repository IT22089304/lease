// One-time script to fix renter statuses that were incorrectly moved to "lease" stage
// Run this in Firebase Functions or as a Node.js script

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc, query, where } = require('firebase/firestore');

// Your Firebase config
const firebaseConfig = {
  // Add your Firebase config here
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixRenterStatuses() {
  try {
    console.log('Starting renter status migration...');
    
    // Find all renter statuses that are in "lease" stage but should be in "application" stage
    // These are likely renters whose applications were approved but don't actually have lease agreements yet
    const renterStatusQuery = query(
      collection(db, 'renterStatus'),
      where('status', '==', 'lease')
    );
    
    const snapshot = await getDocs(renterStatusQuery);
    const updates = [];
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      
      // Check if this renter has an actual lease agreement
      // If they only have an applicationId but no leaseId, they should be in "application" stage
      if (data.applicationId && !data.leaseId) {
        console.log(`Fixing status for renter: ${data.renterEmail} in property: ${data.propertyId}`);
        
        updates.push(
          updateDoc(doc(db, 'renterStatus', docSnapshot.id), {
            status: 'application',
            notes: 'Application approved',
            updatedAt: new Date()
          })
        );
      }
    }
    
    // Execute all updates
    await Promise.all(updates);
    
    console.log(`Migration completed! Fixed ${updates.length} renter statuses.`);
    
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

// Run the migration
fixRenterStatuses();