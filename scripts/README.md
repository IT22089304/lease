# Firebase Cleanup Script

This script clears all Firebase Firestore collections except the `users` collection.

## Usage

### Prerequisites

1. Make sure your environment variables are set in your `.env.local` file:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Script

```bash
npm run clear-firebase
```

Or directly with tsx:
```bash
npx tsx scripts/clear-firebase.ts
```

## What it does

The script will:

1. **Show current database statistics** - Display how many documents exist in each collection
2. **Ask for confirmation** - Require you to type "yes" and then "DELETE" to proceed
3. **Clear all collections** except `users`:
   - `properties`
   - `leases`
   - `notices`
   - `invitations`
   - `applications`
   - `payments`
   - `securityDeposits`
   - `invoices`
   - `filledLeases`
   - `templates`
   - `leaseTemplates`
   - `userProfiles`
   - `landlordProfiles`
   - `renterProfiles`

4. **Preserve users** - The `users` collection is never touched
5. **Show results** - Display total documents deleted and time taken

## Safety Features

- **Double confirmation** - Requires "yes" and "DELETE" to proceed
- **Environment check** - Verifies Firebase configuration is set
- **Statistics preview** - Shows what will be deleted before proceeding
- **Error handling** - Continues even if some collections fail to clear
- **Detailed logging** - Shows progress for each collection

## Example Output

```
🚀 Firebase Database Cleanup Script
==================================================
🏗️  Project: your-project-id
📋 Collections to clear: [properties, leases, notices, ...]
👥 Users collection will be preserved

📊 Current database statistics:
   properties: 5 documents
   leases: 3 documents
   notices: 12 documents
   invoices: 2 documents
   ...

📈 Total documents to delete: 25

⚠️  WARNING: This will permanently delete all data except users!
Are you sure you want to continue? (yes/no): yes
Type 'DELETE' to confirm: DELETE

🚀 Starting cleanup...

📁 Clearing collection: properties
   📄 Found 5 documents to delete
   ✅ Cleared 5 documents from properties

📁 Clearing collection: leases
   📄 Found 3 documents to delete
   ✅ Cleared 3 documents from leases

...

==================================================
🎉 Firebase cleanup completed!
⏱️  Total time: 2.3 seconds
🗑️  Total documents deleted: 25
✅ All collections cleared except users
👥 Users collection preserved
==================================================
```

## Warning

⚠️ **This script permanently deletes data!** Make sure you have backups if needed before running this script.

## Troubleshooting

- **Environment variables not set**: Make sure your `.env.local` file contains all required Firebase configuration
- **Permission errors**: Ensure your Firebase project allows write operations
- **Network errors**: Check your internet connection and Firebase project status 