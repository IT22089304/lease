import { initializeApp } from "firebase/app"
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore"
import * as readline from 'readline'

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Collections to clear (excluding 'users')
const collectionsToClear = [
  'properties',
  'leases',
  'notices',
  'invitations',
  'applications',
  'payments',
  'securityDeposits',
  'invoices',
  'filledLeases',
  'templates',
  'leaseTemplates',
  'userProfiles',
  'landlordProfiles',
  'renterProfiles',
]

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer)
    })
  })
}

async function clearCollection(collectionName: string) {
  try {
    console.log(`\n📁 Clearing collection: ${collectionName}`)
    const querySnapshot = await getDocs(collection(db, collectionName))
    
    if (querySnapshot.empty) {
      console.log(`   ⚪ Collection ${collectionName} is already empty`)
      return 0
    }

    console.log(`   📄 Found ${querySnapshot.size} documents to delete`)

    const deletePromises = querySnapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, collectionName, docSnapshot.id))
    )

    await Promise.all(deletePromises)
    console.log(`   ✅ Cleared ${querySnapshot.size} documents from ${collectionName}`)
    return querySnapshot.size
  } catch (error) {
    console.error(`   ❌ Error clearing collection ${collectionName}:`, error)
    return 0
  }
}

async function getCollectionStats() {
  const stats: { [key: string]: number } = {}
  
  for (const collectionName of collectionsToClear) {
    try {
      const querySnapshot = await getDocs(collection(db, collectionName))
      stats[collectionName] = querySnapshot.size
    } catch (error) {
      console.error(`Error getting stats for ${collectionName}:`, error)
      stats[collectionName] = 0
    }
  }
  
  return stats
}

async function clearAllCollections() {
  console.log("🚀 Firebase Database Cleanup Script")
  console.log("=".repeat(50))
  
  // Check environment variables
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.error("❌ Error: NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable is not set")
    process.exit(1)
  }

  console.log(`🏗️  Project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`)
  console.log("📋 Collections to clear:", collectionsToClear)
  console.log("👥 Users collection will be preserved")
  console.log("")

  // Get current stats
  console.log("📊 Current database statistics:")
  const stats = await getCollectionStats()
  let totalDocuments = 0
  
  for (const [collectionName, count] of Object.entries(stats)) {
    console.log(`   ${collectionName}: ${count} documents`)
    totalDocuments += count
  }
  
  console.log(`\n📈 Total documents to delete: ${totalDocuments}`)
  
  if (totalDocuments === 0) {
    console.log("\n🎉 Database is already clean! No documents to delete.")
    rl.close()
    return
  }

  // Ask for confirmation
  console.log("\n⚠️  WARNING: This will permanently delete all data except users!")
  const confirmation = await askQuestion("Are you sure you want to continue? (yes/no): ")
  
  if (confirmation.toLowerCase() !== 'yes') {
    console.log("❌ Operation cancelled by user")
    rl.close()
    return
  }

  const finalConfirmation = await askQuestion("Type 'DELETE' to confirm: ")
  
  if (finalConfirmation !== 'DELETE') {
    console.log("❌ Operation cancelled - incorrect confirmation")
    rl.close()
    return
  }

  console.log("\n🚀 Starting cleanup...")
  const startTime = Date.now()

  let totalDeleted = 0
  
  // Clear all collections except users
  for (const collectionName of collectionsToClear) {
    const deleted = await clearCollection(collectionName)
    totalDeleted += deleted
  }

  const endTime = Date.now()
  const duration = (endTime - startTime) / 1000

  console.log("\n" + "=".repeat(50))
  console.log("🎉 Firebase cleanup completed!")
  console.log(`⏱️  Total time: ${duration} seconds`)
  console.log(`🗑️  Total documents deleted: ${totalDeleted}`)
  console.log("✅ All collections cleared except users")
  console.log("👥 Users collection preserved")
  console.log("=".repeat(50))

  rl.close()
}

// Run the script
clearAllCollections()
  .then(() => {
    console.log("\n✅ Script completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error)
    rl.close()
    process.exit(1)
  }) 