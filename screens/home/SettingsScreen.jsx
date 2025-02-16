import React, { useState, useEffect } from "react";
import { View, SafeAreaView, Text, ActivityIndicator, StyleSheet, Alert, StatusBar, Pressable, Modal, Switch, TextInput, Button } from "react-native";
import { Feather } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import { getBackendDataWithRetry, postBackendDataWithPhoto } from "../../utils/backendAPI";
import { useIsFocused } from '@react-navigation/native';
import AvatarPicker from "../../components/AvatarPicker";
import { ButtonGroup, Divider } from "@rneui/themed";
import firestore from "@react-native-firebase/firestore";
import PrimaryButton from "../../components/PrimaryButton";
import {
  schedulePushNotification,
  registerForPushNotificationsAsync,
} from "../../utils/notificationManager";

export default function SettingsScreen() {
  const [userData, setUserData] = useState(null);
  const [photoObject, setPhotoObject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showEditProfileettings, setShowEditProfileSettings] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const handleToggle = async (newValue) => {
    setNotificationsEnabled(newValue);
    if (newValue) {
      console.log("Notifications have been enabled");
      await registerForPushNotificationsAsync();
      await schedulePushNotification();
      // Add any other actions you want to perform when enabled
    } else {
      console.log("Notifications have been disabled");
      // Add any other actions you want to perform when disabled
    }
  };
  // const handleNotificationToggle = async () => {
  //   setNotificationsEnabled(!notificationsEnabled);
  //   if (!notificationsEnabled) {
  //     await registerForPushNotificationsAsync();
  //     await schedulePushNotification();
  //   }
  // };

  const [editProfileData, setEditProfileData] = useState({
    height: "",
    weight: "",
    gender: "",
    expLevel: "",
  });

  const [selectedGender, setSelectedGender] = useState(0);
  const genders = ["Male", "Female", "Other"]
  const [selectedExpLevel, setSelectedExpLevel] = useState(0);
  const expLevels = ["Beginner", "Intermediate", "Advanced"];

  const updateUserProfile = async () => {
    try {
      setLoading(true);

      // Check if age is an integer
      const ageRegex = /^\d+$/;
      if (!ageRegex.test(editProfileData.age)) {
        Alert.alert("Invalid Age", "Please enter a valid age.");
        return;
      }

      // Check if height is a float (optimal decimal point)
      const heightRegex = /^[0-9]+(\.[0-9]+)?$/;
      if (!heightRegex.test(editProfileData.height)) {
        Alert.alert("Invalid Height", "Please enter a valid height.");
        return;
      } else if (!editProfileData.height.includes('.')) {
        // Convert height from integer to float with one decimal point
        editProfileData.height = parseFloat(editProfileData.height).toFixed(1);
      }

      // Check if weight is an integer
      const weightRegex = /^\d+$/;
      if (!weightRegex.test(editProfileData.weight)) {
        Alert.alert("Invalid Weight", "Please enter a valid weight.");
        return;
      }

      // Query firestore and see if there is a document that matches the user's email.
      // Then, make changes to that document.
      const userRef = firestore().collection("users").where("email", "==", userData.email);
      const snapshot = await userRef.get();
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        await doc.ref.update(editProfileData);

        // Handle changing user exp level
        handleEditExpLevel(editProfileData.expLevel);

        Alert.alert("Changes saved.");
        setShowEditProfileSettings(false);
      } else {
        Alert.alert("An error occured.");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("An error occured.");
    } finally {
      setLoading(false);
    }
  };

  // Modifies status bar color ONLY on Settings screen
  function FocusAwareStatusBar(props) {
    const isFocused = useIsFocused();
    return isFocused ? <StatusBar {...props} /> : null;
  }



  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const userData = await getBackendDataWithRetry("/user");
        setUserData(userData);
        setPhotoObject({ uri: userData.photoURL })
        setEditProfileData({
          name: userData.name,
          age: userData.age,
          height: userData.height,
          weight: userData.weight,
          gender: userData.gender,
          expLevel: userData.expLevel,
        })
        setSelectedGender(genders.indexOf(userData.gender))
        setSelectedExpLevel(expLevels.indexOf(userData.expLevel));
      } catch (error) {
        Alert.alert("An error occurred", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleEditExpLevel(newExpLevel) {
    let newRecommendedWorkouts = [];
    const recommendedWorkoutsSnapshot = await firestore().collection("premade_workouts").where("expLevel", "==", newExpLevel.toLowerCase()).get();
    recommendedWorkoutsSnapshot.forEach(snapshot => {
      newRecommendedWorkouts.push(snapshot.id);
    })

    await firestore().collection("users").doc(auth().currentUser.uid).update({
      recommendedWorkouts: newRecommendedWorkouts
    })
  }

  async function handleEditPhoto(photoObject) {
    setPhotoObject(photoObject);
    try {
      await postBackendDataWithPhoto("user/photo", { photoObject });
    } catch (error) {
      Alert.alert(error.message);
    }
  }

  // Logout confirmation dialog
  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: () => {
            auth().signOut();
          }
        },
      ],
      { cancelable: true }
    );
  };

  const toggleNotificationSettings = () => {
    setShowNotificationSettings(!showNotificationSettings);
  };

  const toggleEditProfileSettings = () => {
    setShowEditProfileSettings(!showEditProfileettings);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <FocusAwareStatusBar
          translucent
          backgroundColor="transparent"
          barStyle={"dark-content"}
        />
        <View style={styles.header}>
          <Text style={styles.headerText}>Settings</Text>
        </View>
        {loading || !userData ? (
          <ActivityIndicator />
        ) : (
          <View style={styles.contentContainer}>
            {/* Profile picture, name, and email */}
            <View style={styles.profileContainer}>
              <AvatarPicker
                photoObject={photoObject.uri ? { uri: photoObject.uri } : null}
                setPhotoObject={handleEditPhoto}
              />
              <Text style={styles.profileName}>
                {userData.name.split(" ")[0]}
              </Text>
              <Text style={styles.profileEmail}>{userData.email}</Text>
            </View>
            <View style={styles.horizontalLine}></View>
            {/* Buttons */}
            <View style={styles.buttonsContainer}>
              {/* To be implemented (User information like weight, height, etc.) */}
              <Pressable onPress={toggleEditProfileSettings}>
                <View style={styles.buttonRow}>
                  <Feather
                    name="user"
                    size={24}
                    color="black"
                    style={styles.icon}
                  />
                  <Text style={styles.button}>Edit Profile</Text>
                </View>
              </Pressable>

              {/* Notifications settings */}
              <Pressable onPress={toggleNotificationSettings}>
                <View style={styles.buttonRow}>
                  <Feather
                    name="bell"
                    size={24}
                    color="black"
                    style={styles.icon}
                  />
                  <Text style={styles.button}>Notifications</Text>
                </View>
              </Pressable>

              {/* Logout button */}
              <Pressable onPress={handleLogout}>
                <View style={styles.buttonRow}>
                  <Feather
                    name="log-out"
                    size={24}
                    color="black"
                    style={styles.icon}
                  />
                  <Text style={styles.button}>Logout</Text>
                </View>
              </Pressable>
            </View>
          </View>
        )}
        {/* Notifications settings tab */}
        <Modal
          animationType="slide"
          // transparent={true}
          visible={showNotificationSettings}
          onRequestClose={toggleNotificationSettings}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.notificationSettingsContainer}>
              <View style={styles.notificationsHeader}>
                <Pressable onPress={toggleNotificationSettings}>
                  <Feather name="arrow-left" size={26} color="black" />
                </Pressable>
                <Text style={styles.notificationsHeader}> Notifications</Text>
              </View>
              {/* Buttons */}
              <View style={styles.notificationSettings}>
                <Text style={styles.notificationText}>General notifications</Text>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleToggle}
                />
              </View>
            </View>
          </SafeAreaView>
        </Modal>

        <Modal
          animationType="slide"
          //transparent={true}
          visible={showEditProfileettings}
          onRequestClose={toggleEditProfileSettings}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.notificationSettingsContainer}>
              <View style={styles.notificationsHeader}>
                <Pressable onPress={toggleEditProfileSettings}>
                  <Feather name="arrow-left" size={26} color="black" />
                </Pressable>
                <Text style={styles.notificationsHeader}> Edit Profile</Text>
              </View>
              <View>
                <View style={[styles.editcontainer, { flexDirection: "row" }]}>
                  <Text style={styles.edittitle}>Name</Text>
                  <TextInput
                    onChangeText={(e) => {
                      setEditProfileData({ ...editProfileData, name: e });
                    }}
                    style={styles.inputComponent}
                    value={editProfileData.name || ""}
                  />
                </View>
                <Divider />
                <View style={[styles.editcontainer, { flexDirection: "row" }]}>
                  <Text style={styles.edittitle}>Age</Text>
                  <TextInput
                    onChangeText={(e) => {
                      setEditProfileData({ ...editProfileData, age: e });
                    }}
                    style={styles.inputComponent}
                    value={editProfileData.age || ""}
                  />
                </View>
                <Divider />
                <View style={[styles.editcontainer, { flexDirection: "row" }]}>
                  <Text style={styles.edittitle}>Email</Text>
                  <TextInput
                    editable={false}
                    style={styles.inputComponent}
                    value={userData && userData.email ? userData.email : ""}
                  />
                </View>
                <Divider />
                <View style={[styles.editcontainer, { flexDirection: "row" }]}>
                  <Text style={styles.edittitle}>Height (ft.in)</Text>
                  <TextInput
                    onChangeText={(e) => {
                      setEditProfileData({ ...editProfileData, height: e });
                    }}
                    style={styles.inputComponent}
                    value={editProfileData.height || ""}
                  />
                </View>
                <Divider />
                <View style={[styles.editcontainer, { flexDirection: "row" }]}>
                  <Text style={styles.edittitle}>Weight (lbs)</Text>
                  <TextInput
                    onChangeText={(e) => {
                      setEditProfileData({ ...editProfileData, weight: e });
                    }}
                    style={styles.inputComponent}
                    value={editProfileData.weight || ""}
                  />
                </View>
                <Divider />
                <View style={{ flexDirection: "col" }}>
                  <Text style={styles.edittitle}> Gender</Text>
                  <ButtonGroup
                    buttons={genders}
                    selectedIndex={selectedGender}
                    onPress={(value) => {
                      setSelectedGender(value);
                      setEditProfileData({
                        ...editProfileData,
                        gender: genders[value],
                      });
                    }}
                    containerStyle={{ marginBottom: 20 }}
                  />
                </View>
                <Divider />
                <View style={{ flexDirection: "col" }}>
                  <Text style={styles.edittitle}> Experience Level</Text>
                  <ButtonGroup
                    buttons={expLevels}
                    selectedIndex={selectedExpLevel}
                    onPress={(value) => {
                      setSelectedExpLevel(value);
                      setEditProfileData({
                        ...editProfileData,
                        expLevel: expLevels[value],
                      });
                    }}
                    containerStyle={{ marginBottom: 20 }}
                  />
                </View>
              </View>
              <View style={{ marginTop: 90 }}>
                <PrimaryButton
                  title="Save Changes"
                  handleOnPress={() => updateUserProfile()}
                  disabled={
                    editProfileData.expLevel === "" ||
                    editProfileData.weight === "" ||
                    editProfileData.height === "" ||
                    editProfileData.gender === ""
                  }
                />
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    paddingHorizontal: "10%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    fontSize: 26,
    fontWeight: "bold",
    marginLeft: 10,
    marginTop: 10,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileContainer: {
    alignItems: "center",
    marginBottom: 20,
    bottom: 40,
  },
  profileName: {
    marginTop: 10,
    fontSize: 22,
  },
  horizontalLine: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    marginTop: 20,
  },
  buttonsContainer: {
    alignSelf: "flex-start",
    marginLeft: "5%",
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  button: {
    fontSize: 22,
    color: "#000000",
    marginTop: 30,
  },
  icon: {
    marginRight: 20,
    top: 17,
  },
  profileEmail: {
    marginTop: 5,
    fontSize: 17,
    color: "gray",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationsHeader: {
    fontSize: 26,
    fontWeight: "bold",
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 10,
    marginBottom: 20,
  },
  editcontainer: {
    height: 50,
    alignItems: "center",
    justifyContent: "space-between",
    margin: 5,
  },
  edittitle: {
    fontWeight: "600",
    fontSize: 20,
    margin: 10,
  },
  notificationSettingsContainer: {
    backgroundColor: "white",
    width: "100%",
    height: "100%",
    paddingHorizontal: 30,
  },
  notificationSettings: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  notificationText: {
    fontSize: 20,
  },
});