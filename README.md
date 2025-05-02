# nextiett – Istanbul Public Transport Companion

[🇹🇷 Türkçe](./README.tr.md)

nextiett is a feature-rich, open-source mobile application built with Expo and React Native, designed to make Istanbul's public transport system more accessible, informative, and user-friendly. Below, you'll find a detailed breakdown of the application's core features and how they benefit users.

---

## 🚀 Key Features

### 1. **Vehicle Search**
- **Search by Plate or Door Code:** Instantly query IETT buses by entering either the license plate or vehicle door code.
- **Live Status:** View real-time information about the selected vehicle, including its location, speed, garage, and last update time.
- **Line Details:** Fetch and display the line (route) information for any vehicle.
- **Error Handling:** User-friendly error messages for invalid input or unreachable servers.

### 2. **Station Search**
- **Smart Suggestions:** As you type, the app suggests matching stations with code, name, and direction.
- **Arrivals & Schedules:** See all upcoming buses for a selected stop, including estimated arrival times, bus line, and vehicle details.
- **Real-Time Refresh:** Easily refresh arrival data with a single tap.
- **No Arrivals Indicator:** Clear messaging when no buses are currently scheduled to arrive.
- **Accessibility & Amenities:** Icons indicate if buses support wheelchair access, bicycles, WiFi, USB charging, and air conditioning.
- **Map Integration:** Tap to open the vehicle's last known location in Google Maps for easy navigation.

### 3. **Interactive Map**
- **Live Vehicle Tracking:** See all active IETT vehicles on a map, updated in real time.
- **Station & Garage Layers:** Toggle visibility of stations and garages for a customizable map view.
- **Detailed Popups:** Tap any marker (vehicle, station, or garage) to see detailed information, such as line, location, and amenities.
- **Region Focus:** The map is centered on Istanbul, with intuitive zoom and pan controls.

### 4. **Modern Tabbed Navigation**
- **File-Based Routing:** Uses Expo Router for clean, scalable navigation between Home, Vehicle, Station, and Map tabs.
- **Custom Tab Bar:** Features animated, haptic-enabled tab buttons and a blurred background for a native feel.
- **Themed UI:** Supports both light and dark modes, with smooth transitions and custom color schemes.

### 5. **Performance & User Experience**
- **Optimized Loading:** Fonts and data are loaded asynchronously for a fast, smooth startup.
- **Responsive Design:** Layouts adapt to all screen sizes and orientations.
- **Accessibility:** Clear icons, high-contrast color schemes, and support for assistive technologies.
- **Error Feedback:** All network and input errors are handled gracefully, with actionable feedback.

### 6. **Reusable Components & Hooks**
- **Component Library:** Modular UI components such as Collapsible panels, ThemedText, and HapticTab for maintainable code.
- **Custom Hooks:** For theme management and color scheme detection.

### 7. **Open Data & Privacy**
- **Live Data Source:** All real-time information is fetched from the public IETT API (`https://iett.deno.dev`).
- **No Tracking:** The app does not collect or store any user data.

---

## 📱 How Each Feature Helps Users
- **Plan Ahead:** Know exactly when your bus will arrive and where it is on the map.
- **Find Your Way:** Quickly locate any station or vehicle, and get directions instantly.
- **Stay Informed:** Access up-to-date information about amenities and accessibility for every bus.
- **Enjoy the Experience:** Benefit from a modern, responsive, and visually appealing app that feels at home on both Android and iOS.

---

## 🏗️ Technologies Used
- **React Native & Expo**: Cross-platform mobile development
- **expo-router**: File-based navigation
- **react-native-maps**: Interactive maps
- **@expo/vector-icons**: Iconography
- **Custom Hooks & Components**: Modular, maintainable code

---

## 🙏 Acknowledgements
- Istanbul Electric Tram and Tunnel Company (IETT) for open data
- Expo and React Native communities

---

*For screenshots, contribution guidelines, and more, please see the full project documentation or open an issue!*
