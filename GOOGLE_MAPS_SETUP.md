# Google Maps Integration Setup

This application uses Google Maps for location picking and display. Follow these steps to set up the integration:

## 1. Get a Google Maps API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Create credentials (API Key)
5. Restrict the API key to your domain for security

## 2. Set Environment Variable

Create a `.env.local` file in the root directory and add:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

Replace `your_actual_api_key_here` with your actual Google Maps API key.

## 3. Features

- **Property Creation/Edit**: Users can pick a location on the map when creating or editing properties
- **Property View**: The property details page shows a map with the property location marked
- **Current Location**: Users can use their current location as a starting point

## 4. Security Notes

- The API key is prefixed with `NEXT_PUBLIC_` so it's exposed to the client
- Make sure to restrict the API key to your domain in Google Cloud Console
- Consider using a separate API key for development and production

## 5. Usage

Once set up, the map picker will appear in the property creation and edit forms, and the property view page will display the map with the property location. 