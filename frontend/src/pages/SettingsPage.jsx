// src/pages/SettingsPage.jsx

import { useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { UserCircleIcon, KeyIcon, BellIcon, LinkIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

export default function SettingsPage() {
  const { auth } = useAuth(); 
  const [name, setName] = useState(auth?.user?.name || ""); 
  const [isEditingName, setIsEditingName] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // TODO: Add state and handlers for Preferences and Connections

  // Placeholder handler for saving name
  const handleNameSave = (e) => {
    e.preventDefault();
    // TODO: Add API call to update name
    console.log("Saving new name:", name);
    setIsEditingName(false);
    // You might want to update the auth context user name here too
  };

  // Placeholder handler for changing password
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) { // Example validation
        setPasswordError("Password must be at least 8 characters.");
        return;
    }
    try {
        // TODO: Add API call to change password
        // await api.post('/auth/change-password', { currentPassword, newPassword }, { headers: ... });
        console.log("Changing password...");
        setPasswordSuccess("Password updated successfully!");
        // Clear fields after success
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
    } catch (err) {
        setPasswordError(err.response?.data?.detail || "Failed to change password.");
    }
  };

  return (
    <Layout>
       <h2 className="text-3xl font-bold text-slate-800 mb-8 pt-6">Settings</h2>

       <div className="space-y-8 max-w-4xl mx-auto pb-8"> {/* Centered content */}

         {/* --- Account Management Section --- */}
         <section className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-100">
           <h3 className="text-xl font-semibold text-slate-700 mb-6 flex items-center">
             <UserCircleIcon className="h-6 w-6 mr-3 text-sky-600" />
             Account
           </h3>
           <div className="space-y-6">
             {/* Display Name */}
             <div>
               <label className="block text-sm font-medium text-slate-600 mb-1">Display Name</label>
               {!isEditingName ? (
                 <div className="flex items-center justify-between">
                   <p className="text-slate-800">{name}</p>
                   <button
                     onClick={() => setIsEditingName(true)}
                     className="text-sm text-sky-600 hover:underline flex items-center"
                   >
                     <PencilIcon className="h-4 w-4 mr-1" /> Edit
                   </button>
                 </div>
               ) : (
                 <form onSubmit={handleNameSave} className="flex items-center gap-2">
                   <input
                     type="text"
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     className="border border-slate-300 rounded-md p-2 flex-grow focus:ring-sky-500 focus:border-sky-500"
                     required
                   />
                   <button
                     type="submit"
                     className="bg-sky-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-sky-600"
                   >
                     Save
                   </button>
                   <button
                     type="button"
                     onClick={() => setIsEditingName(false)}
                     className="text-slate-500 px-3 py-2 rounded-md text-sm hover:bg-slate-100"
                   >
                     Cancel
                   </button>
                 </form>
               )}
             </div>

             {/* Email Address */}
             <div>
               <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
               <p className="text-slate-500 bg-slate-50 p-2 rounded-md border border-slate-200">
                 {auth?.user?.email || "Not available"} (Cannot be changed)
               </p>
             </div>

             {/* Change Password */}
             <div>
               <label className="block text-sm font-medium text-slate-600 mb-3">Change Password</label>
               <form onSubmit={handlePasswordChange} className="space-y-3 border p-4 rounded-md bg-slate-50">
                 {passwordError && <p className="text-sm text-red-600 bg-red-100 p-2 rounded">{passwordError}</p>}
                 {passwordSuccess && <p className="text-sm text-green-600 bg-green-100 p-2 rounded">{passwordSuccess}</p>}
                 <input
                   type="password"
                   placeholder="Current Password"
                   value={currentPassword}
                   onChange={(e) => setCurrentPassword(e.target.value)}
                   className="border w-full p-2 rounded-md border-slate-300"
                   required
                 />
                 <input
                   type="password"
                   placeholder="New Password (min. 8 characters)"
                   value={newPassword}
                   onChange={(e) => setNewPassword(e.target.value)}
                   className="border w-full p-2 rounded-md border-slate-300"
                   required
                 />
                 <input
                   type="password"
                   placeholder="Confirm New Password"
                   value={confirmPassword}
                   onChange={(e) => setConfirmPassword(e.target.value)}
                   className="border w-full p-2 rounded-md border-slate-300"
                   required
                 />
                 <button type="submit" className="w-full sm:w-auto bg-slate-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700">
                   Update Password
                 </button>
               </form>
             </div>

             {/* Account Deletion */}
             <div className="border-t pt-6 mt-6 border-red-200">
                <h4 className="text-md font-medium text-red-700 mb-2">Delete Account</h4>
                <p className="text-sm text-slate-600 mb-3">Permanently delete your account and all associated data. This action cannot be undone.</p>
                 <button className="bg-red-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-red-700">
                   Delete My Account
                 </button>
             </div>

           </div>
         </section>

         {/* --- Connections Section --- */}
         <section className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-100">
           <h3 className="text-xl font-semibold text-slate-700 mb-6 flex items-center">
             <LinkIcon className="h-6 w-6 mr-3 text-green-600" />
             Connections
           </h3>
           {/* Logic here depends on user role */}
           {auth?.user?.role === 'user' && (
             <div className="space-y-4">
                <p className="text-sm text-slate-600 mb-4">Manage caregivers or doctors who can view your progress and receive alerts.</p>
                {/* TODO: Add list of current connections with permission settings */}
                <div className="border p-4 rounded-md bg-slate-50">
                    <p className="text-slate-500 text-center">[List of Connected Guardians/Doctors Placeholder]</p>
                </div>
                {/* TODO: Add Invite Form */}
                <form className="flex items-center gap-2">
                    <input type="email" placeholder="Invite Guardian/Doctor Email" className="border border-slate-300 rounded-md p-2 flex-grow focus:ring-sky-500 focus:border-sky-500" />
                    <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700">Invite</button>
                </form>
             </div>
           )}
           {(auth?.user?.role === 'guardian' || auth?.user?.role === 'doctor') && (
              <div className="space-y-4">
                 <p className="text-sm text-slate-600 mb-4">View and manage users you are connected with.</p>
                 {/* TODO: Add list of connected patients/users */}
                 <div className="border p-4 rounded-md bg-slate-50">
                    <p className="text-slate-500 text-center">[List of Connected Patients/Users Placeholder]</p>
                 </div>
              </div>
           )}
         </section>

         {/* --- Preferences Section --- */}
         <section className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-100">
           <h3 className="text-xl font-semibold text-slate-700 mb-6 flex items-center">
             <BellIcon className="h-6 w-6 mr-3 text-purple-600" />
             Preferences & Notifications
           </h3>
           <div className="space-y-4">
             <div className="flex items-center justify-between p-3 border rounded-md">
                 <label htmlFor="checkin-reminders" className="text-sm font-medium text-slate-700">Enable check-in reminders</label>
                 {/* Basic Toggle Placeholder */}
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="checkin-reminders" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                 </label>
             </div>
              {/* TODO: Add preferred time window selection */}
              <div className="border p-4 rounded-md bg-slate-50">
                 <p className="text-slate-500 text-sm">[Preferred Reminder Time Settings Placeholder]</p>
              </div>
           </div>
         </section>

       </div>
    </Layout>
  );
}

