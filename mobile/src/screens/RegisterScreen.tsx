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
  ScrollView,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

interface RegisterScreenProps {
  onBackToLogin: () => void;
}

type GlobalRole = "VOLUNTEER" | "SECURITY" | "COORDINATOR";

export default function RegisterScreen({ onBackToLogin }: RegisterScreenProps) {
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<GlobalRole>("VOLUNTEER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const cleanUsername = username.trim();
    if (!cleanUsername || !password || !confirmPassword) {
      setError("Wszystkie pola są wymagane.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Hasła nie są identyczne.");
      return;
    }

    if (password.length < 4) {
      setError("Hasło musi mieć co najmniej 4 znaki.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const registerRes = await api.register(cleanUsername, password, role);
      if (!registerRes.success) {
        throw new Error(registerRes.error || "Nie udało się zarejestrować");
      }

      // Po pomyślnej rejestracji, automatycznie zaloguj użytkownika
      const loginRes = await signIn(cleanUsername, password);
      if (!loginRes.success) {
        throw new Error(loginRes.error || "Rejestracja udana, ale automatyczne logowanie nie powiodło się.");
      }
    } catch (err: any) {
      setError(err.message || "Wystąpił błąd podczas rejestracji");
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.inner}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Stwórz konto</Text>
              <Text style={styles.subtitle}>Zarejestruj się do systemu Event Manager</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nazwa użytkownika</Text>
                <TextInput
                  style={styles.input}
                  placeholder="np. jan_kowalski"
                  placeholderTextColor="#64748B"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Hasło</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#64748B"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Potwierdź hasło</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#64748B"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Text style={styles.label}>Twoja główna rola:</Text>
              <View style={styles.rolesGrid}>
                {(["VOLUNTEER", "SECURITY", "COORDINATOR"] as GlobalRole[]).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleBtn,
                      role === r && styles.roleBtnSelected,
                    ]}
                    onPress={() => setRole(r)}
                  >
                    <Text
                      style={[
                        styles.roleBtnText,
                        role === r && styles.roleBtnTextSelected,
                      ]}
                    >
                      {r === "VOLUNTEER" && "🙋‍♂️ WOLONTARIUSZ"}
                      {r === "SECURITY" && "🛡️ OCHRONA"}
                      {r === "COORDINATOR" && "🔑 KOORDYNATOR"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Zarejestruj się</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Back to Login */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.backButton} onPress={onBackToLogin}>
                <Text style={styles.backButtonText}>Masz już konto? Zaloguj się</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  inner: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#F8FAFC",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 8,
    textAlign: "center",
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
    marginBottom: 16,
  },
  label: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    color: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  rolesGrid: {
    flexDirection: "column",
    marginBottom: 24,
  },
  roleBtn: {
    backgroundColor: "#1E293B",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
  },
  roleBtnSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  roleBtnText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "700",
  },
  roleBtnTextSelected: {
    color: "#60A5FA",
  },
  button: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: "#1D4ED8",
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    alignItems: "center",
    marginTop: 30,
  },
  backButton: {
    paddingVertical: 10,
  },
  backButtonText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
