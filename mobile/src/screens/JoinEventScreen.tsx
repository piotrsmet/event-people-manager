import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

export default function JoinEventScreen() {
  const { loadEvents, signOut, user } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setError("Wpisz kod zaproszenia.");
      return;
    }
    if (cleanCode.length !== 6) {
      setError("Kod musi składać się dokładnie z 6 znaków.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await api.joinEvent(cleanCode);
      // Pomyślnie dołączono - załaduj listę wydarzeń z kontekstu
      await loadEvents();
    } catch (err: any) {
      setError(err.message || "Wystąpił błąd podczas dołączania");
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.greeting}>Cześć, {user?.username}!</Text>
            <Text style={styles.title}>Dołącz do wydarzenia</Text>
            <Text style={styles.instructions}>
              Aby rozpocząć pracę, wpisz 6-znakowy kod zaproszenia wygenerowany przez Koordynatora wydarzenia.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Kod zaproszenia</Text>
              <TextInput
                style={styles.input}
                placeholder="np. XYZ123"
                placeholderTextColor="#64748B"
                value={code}
                onChangeText={(text) => setCode(text.toUpperCase())}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleJoin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Dołącz do Wydarzenia</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
              <Text style={styles.signOutText}>Wyloguj się</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A", // Slate 900
  },
  inner: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: "center",
    marginTop: 60,
  },
  greeting: {
    fontSize: 18,
    color: "#3B82F6", // Blue 500
    fontWeight: "600",
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#F8FAFC", // Slate 50
    letterSpacing: -0.5,
    textAlign: "center",
  },
  instructions: {
    fontSize: 14,
    color: "#94A3B8", // Slate 400
    marginTop: 12,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  form: {
    width: "100%",
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "#EF4444",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: "center",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 14,
    fontWeight: "500",
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    color: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 4,
  },
  button: {
    backgroundColor: "#10B981", // Emerald 500 (premium green for positive action)
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: "#059669",
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    alignItems: "center",
  },
  signOutButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  signOutText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
