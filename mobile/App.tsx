import React from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import JoinEventScreen from "./src/screens/JoinEventScreen";
import ShiftScreen from "./src/screens/ShiftScreen";

function MainAppContent() {
  const { token, selectedEvent, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // Wybierz odpowiedni ekran na podstawie stanu sesji
  if (!token) {
    return <LoginScreen />;
  }

  if (!selectedEvent) {
    return <JoinEventScreen />;
  }

  return <ShiftScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <View style={styles.container}>
        <MainAppContent />
        <StatusBar style="light" />
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A", // Slate 900 matching the premium dark theme
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
  },
});
