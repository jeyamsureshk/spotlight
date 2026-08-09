import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Loader } from "@/components/Loader";

export default function EditProfile() {
  const router = useRouter();
  const { userId: clerkUserId } = useAuth();
  
  const currentUser = useQuery(api.users.getUserByClerkId, clerkUserId ? { clerkId: clerkUserId } : "skip");
const updateProfile = useMutation(api.users.updateProfile);

  const [formData, setFormData] = useState({
    fullname: "",
    bio: "",
    age: "",
    phone: "",
    gender: "",
    dob: "",
  });

  const [isSaving, setIsSaving] = useState(false);

  // Pre-fill the form once the user data loads
  useEffect(() => {
    if (currentUser) {
      setFormData({
        fullname: currentUser.fullname || "",
        bio: currentUser.bio || "",
        age: currentUser.age?.toString() || "",
        phone: currentUser.phone || "",
        gender: currentUser.gender || "",
        dob: currentUser.dob || "",
      });
    }
  }, [currentUser]);

const handleSave = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      // REMOVED: userId: currentUser._id
      await updateProfile({
        fullname: formData.fullname,
        bio: formData.bio,
        age: formData.age ? parseInt(formData.age) : undefined,
        phone: formData.phone,
        gender: formData.gender,
        dob: formData.dob,
      });
      router.back(); 
    } catch (error) {
      console.error("Failed to update profile", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentUser) return <Loader />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={formData.fullname}
            onChangeText={(text) => setFormData({ ...formData, fullname: text })}
            placeholderTextColor={COLORS.grey}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: "top" }]}
            value={formData.bio}
            onChangeText={(text) => setFormData({ ...formData, bio: text })}
            multiline
            placeholderTextColor={COLORS.grey}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            value={formData.age}
            keyboardType="numeric"
            onChangeText={(text) => setFormData({ ...formData, age: text })}
            placeholder="e.g. 25"
            placeholderTextColor={COLORS.grey}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            keyboardType="phone-pad"
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            placeholder="+1 234 567 890"
            placeholderTextColor={COLORS.grey}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender</Text>
          <TextInput
            style={styles.input}
            value={formData.gender}
            onChangeText={(text) => setFormData({ ...formData, gender: text })}
            placeholder="e.g. Male, Female, Other"
            placeholderTextColor={COLORS.grey}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date of Birth</Text>
          <TextInput
            style={styles.input}
            value={formData.dob}
            onChangeText={(text) => setFormData({ ...formData, dob: text })}
            placeholder="MM/DD/YYYY"
            placeholderTextColor={COLORS.grey}
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
          <Text style={styles.saveButtonText}>{isSaving ? "Saving..." : "Save Changes"}</Text>
        </TouchableOpacity>
        
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.white,
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: COLORS.grey,
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#efefef",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    color: COLORS.white,
    padding: 14,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 40,
  },
  saveButtonText: {
    color: COLORS.background, // or COLORS.white depending on your primary color
    fontSize: 16,
    fontWeight: "bold",
  },
});
