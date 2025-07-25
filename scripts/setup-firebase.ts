import { auth, db } from "../lib/firebase"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"

const testAccounts = [
  {
    email: "landlord@test.com",
    password: "landlord123",
    name: "John Landlord",
    role: "landlord",
  },
  {
    email: "renter@test.com",
    password: "renter123",
    name: "Jane Renter",
    role: "renter",
  },
  {
    email: "admin@test.com",
    password: "admin123",
    name: "System Admin",
    role: "admin",
  },
]

async function setupTestAccounts() {
  try {
    for (const account of testAccounts) {
      // Create Firebase Auth user
      const { user } = await createUserWithEmailAndPassword(
        auth,
        account.email,
        account.password
      )

      // Add user data to Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: account.email,
        name: account.name,
        role: account.role,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      console.log(`Created account for ${account.email}`)
    }

    console.log("All test accounts created successfully!")
  } catch (error) {
    console.error("Error creating test accounts:", error)
  }
}

// Run the setup
setupTestAccounts() 