# Lease Agreement Viewing from Notifications

This document describes the functionality for opening and viewing lease agreements directly from notifications in the landlord dashboard.

## Overview

When landlords receive notifications about lease agreements (either completed or received from renters), they can click on these notifications to automatically open and view the lease agreement PDF in a dedicated viewer.

## Features

### 1. Automatic Lease Opening
- Clicking on lease-related notifications automatically opens the PDF viewer
- No need to navigate to separate pages or search for the lease
- Seamless user experience

### 2. PDF Viewer Capabilities
- **Zoom Controls**: Zoom in/out with buttons or mouse wheel
- **Download**: Direct download of lease agreements
- **Full Screen**: Maximize viewer for better readability
- **Landlord Actions**: Send invoices for completed leases

### 3. Notification Types Supported
- **lease_completed**: When a lease agreement is fully signed and completed
- **lease_received**: When a renter submits a completed lease for landlord review

## Implementation Details

### Notification Click Handler
```typescript
const handleNotificationClick = async (notification: any) => {
  // Handle lease agreement notifications - open the lease directly
  if (notification._type === "lease" && notification.leaseAgreementId) {
    await handleViewLease(notification);
    return;
  }
  // ... other navigation logic
}
```

### Lease Viewing Function
```typescript
const handleViewLease = async (notice: Notice) => {
  if (notice.leaseAgreementId) {
    try {
      const leaseRef = doc(db, "filledLeases", notice.leaseAgreementId);
      const leaseSnap = await getDoc(leaseRef);
      
      if (leaseSnap.exists()) {
        const leaseData = leaseSnap.data();
        const pdfUrl = leaseData.filledPdfUrl || leaseData.originalTemplateUrl;
        
        if (pdfUrl) {
          setSelectedPdfUrl(pdfUrl);
          setSelectedPdfTitle(leaseData.templateName || "Lease Agreement");
          setSelectedNotice(notice);
          setIsPdfViewerOpen(true);
          
          if (!notice.readAt) {
            await markNoticeAsRead(notice.id);
          }
        }
      }
    } catch (error) {
      console.error("Error opening lease PDF:", error);
    }
  }
};
```

### PDF Viewer Component
The PDF viewer provides:
- **isLandlordView**: Special mode for landlord actions
- **onDownload**: Download lease functionality
- **onSendInvoice**: Send invoice for completed leases
- **selectedNotice**: Context about the lease being viewed

## User Flow

1. **Landlord receives notification** about a lease agreement
2. **Click on notification** in the notifications dashboard
3. **PDF viewer opens automatically** with the lease agreement
4. **View, zoom, download** the lease as needed
5. **Take actions** like sending invoices for completed leases
6. **Notification marked as read** automatically

## Database Structure

### Notifications Collection
```typescript
interface Notification {
  id: string
  landlordId: string
  type: "lease_completed" | "lease_received"
  title: string
  message: string
  data?: {
    propertyId: string
    renterEmail: string
    leaseAgreementId?: string
  }
  readAt?: Date
  createdAt: Date
}
```

### Notices Collection
```typescript
interface Notice {
  id: string
  landlordId: string
  propertyId: string
  renterId: string
  type: "lease_completed" | "lease_received"
  subject: string
  message: string
  leaseAgreementId?: string
  sentAt: Date
  readAt?: Date
}
```

### Filled Leases Collection
```typescript
interface FilledLease {
  id: string
  filledPdfUrl: string
  originalTemplateUrl?: string
  templateName: string
  landlordId: string
  propertyId: string
  renterEmail: string
  status: "renter_completed" | "landlord_completed"
  createdAt: Date
  updatedAt: Date
}
```

## Testing

A test page is available at `/test-lease-viewing` to demonstrate the functionality with mock data.

### Test Features
- Mock lease notification display
- PDF viewer integration
- Download and invoice sending simulation
- Documentation of the user flow

## Error Handling

- **Missing lease agreement**: Shows error message if lease not found
- **Missing PDF URL**: Handles cases where PDF URL is not available
- **Network errors**: Graceful handling of Firebase connection issues
- **Invalid PDF**: Fallback to original template if filled PDF is corrupted

## Future Enhancements

1. **Batch Operations**: View multiple leases at once
2. **Annotations**: Add comments and annotations to lease PDFs
3. **Digital Signatures**: Integrated digital signature functionality
4. **Version History**: Track changes and versions of lease agreements
5. **Mobile Optimization**: Better mobile experience for PDF viewing

## Security Considerations

- **Access Control**: Only landlords can view their property leases
- **PDF Validation**: Ensure PDFs are valid and safe
- **Download Tracking**: Log download activities for audit
- **Data Privacy**: Secure handling of sensitive lease information

## Performance Optimizations

- **Lazy Loading**: PDFs loaded only when needed
- **Caching**: Cache frequently accessed lease PDFs
- **Compression**: Optimize PDF file sizes for faster loading
- **Progressive Loading**: Show PDF preview while full document loads 