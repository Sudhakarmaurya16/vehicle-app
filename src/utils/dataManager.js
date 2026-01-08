// src/utils/dataManager.js

const API_BASE_URL = "https://vehicle-backend-seow.onrender.com/api";

// --- HELPER FUNCTION FOR API CALLS ---
const apiRequest = async (endpoint, method = "GET", body = null) => {
  try {
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Request Failed: ${endpoint}`, error);
    return null; // Return null or empty array on failure
  }
};

// ==============================
//          USERS (CENTERS)
// ==============================

// Get all users (Centers) from DB
export const getUsers = async () => {
  const data = await apiRequest("/users/all");
  return data || [];
};

// Add a new user (Center)
export const addUser = async (newUser) => {
  return await apiRequest("/users/add", "POST", newUser);
};

// Update user details
export const updateUser = async (updatedUser) => {
  // MongoDB uses '_id', ensure we pass that in the URL
  return await apiRequest(
    `/users/update/${updatedUser._id}`,
    "PUT",
    updatedUser
  );
};

// Delete a user
export const deleteUser = async (userId) => {
  return await apiRequest(`/users/delete/${userId}`, "DELETE");
};

// ==============================
//          RECORDS
// ==============================

// Get all records (Arrival & Dispatch)
export const getRecords = async () => {
  const data = await apiRequest("/records/all");
  return data || [];
};

// Add a new record
export const addRecord = async (record) => {
  // Remove frontend generated 'id' if present, let MongoDB handle it
  const { id, ...recordData } = record;
  return await apiRequest("/records/add", "POST", recordData);
};

// Update a record (e.g., Manual Unload update)
export const updateRecord = async (updatedRecord) => {
  // Use _id for MongoDB updates
  return await apiRequest(
    `/records/update/${updatedRecord._id}`,
    "PUT",
    updatedRecord
  );
};

// Delete a record
export const deleteRecord = async (recordId) => {
  return await apiRequest(`/records/delete/${recordId}`, "DELETE");
};

// ==============================
//          MASTER DATA
// ==============================

export const getMasterData = async () => {
  const data = await apiRequest("/master/all");
  return data || [];
};

export const addMasterDataBulk = async (dataArray) => {
  return await apiRequest("/master/bulk-add", "POST", dataArray);
};

export const clearMasterDataDB = async () => {
  return await apiRequest("/master/clear", "DELETE");
};
