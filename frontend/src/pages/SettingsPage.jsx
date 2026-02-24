// src/pages/SettingsPage.jsx

import { useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import api from "../api/axios.jsx";
import {
  UserCircleIcon,
  KeyIcon,
  BellIcon,
  LinkIcon,
  TrashIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";

/** Simple inline confirmation modal */
function ConfirmModal({ title, message, confirmLabel = "Confirm", onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-600 text-sm mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-md text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-md bg-red-600 text-white font-medium hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { auth, logout, updateUser } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(auth?.user?.name || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  // --- Name save ---
  const handleNameSave = async (e) => {
    e.preventDefault();
    setIsSavingName(true);
    try {
      await api.patch(
        "/auth/update-name",
        { name },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      toast("Display name updated!", "success");
      updateUser({ name });   // update sidebar / greeting immediately
      setIsEditingName(false);
    } catch (err) {
      // If the endpoint isn't implemented yet, show a graceful message
      if (err.response?.status === 404 || err.response?.status === 405) {
        toast("Name update not yet supported by the server.", "info");
      } else {
        toast(err.response?.data?.detail || "Failed to update name.", "error");
      }
    } finally {
      setIsSavingName(false);
    }
  };

  // --- Password change ---
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError("");
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    try {
      await api.post(
        "/auth/change-password",
        { current_password: currentPassword, new_password: newPassword },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      toast("Password updated successfully!", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const detail = err.response?.data?.detail || "Failed to change password.";
      setPasswordError(detail);
    }
  };

  // --- Delete account ---
  const handleDeleteAccount = async () => {
    setShowDeleteConfirm(false);
    try {
      await api.delete("/auth/delete-account", {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      toast("Account deleted. Goodbye.", "info");
      setTimeout(() => logout(), 1500);
    } catch (err) {
      toast(err.response?.data?.detail || "Could not delete account. Please try again.", "error");
    }
  };

  // --- Invite ---
  const handleInvite = async (e) => {
    e.preventDefault(); // prevents page reload
    if (!inviteEmail.trim()) return;
    try {
      await api.post(
        "/connections/invite",
        { email: inviteEmail },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      toast(`Invitation sent to ${inviteEmail}!`, "success");
      setInviteEmail("");
    } catch (err) {
      toast(err.response?.data?.detail || "Failed to send invite.", "error");
    }
  };

  return (
    <Layout>
      <h2 className="text-3xl font-bold text-slate-800 mb-8 pt-6">Settings</h2>

      <div className="space-y-8 max-w-4xl mx-auto pb-8">

        {/* Account */}
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
                    disabled={isSavingName}
                    className="bg-sky-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-sky-600 disabled:opacity-60"
                  >
                    {isSavingName ? "Saving…" : "Save"}
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

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
              <p className="text-slate-500 bg-slate-50 p-2 rounded-md border border-slate-200">
                {auth?.user?.email || "Not available"}{" "}
                <span className="text-xs text-slate-400">(Cannot be changed)</span>
              </p>
            </div>

            {/* Change Password */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-3">
                Change Password
              </label>
              <form
                onSubmit={handlePasswordChange}
                className="space-y-3 border p-4 rounded-md bg-slate-50"
              >
                {passwordError && (
                  <p className="text-sm text-red-600 bg-red-100 p-2 rounded">{passwordError}</p>
                )}
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
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-slate-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700"
                >
                  Update Password
                </button>
              </form>
            </div>

            {/* Delete Account */}
            <div className="border-t pt-6 mt-6 border-red-200">
              <h4 className="text-md font-medium text-red-700 mb-2">Danger Zone</h4>
              <p className="text-sm text-slate-600 mb-3">
                Permanently delete your account and all associated data. This action cannot be
                undone.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-red-700"
              >
                <TrashIcon className="h-4 w-4" />
                Delete My Account
              </button>
            </div>
          </div>
        </section>

        {/* Connections */}
        <section className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-100">
          <h3 className="text-xl font-semibold text-slate-700 mb-6 flex items-center">
            <LinkIcon className="h-6 w-6 mr-3 text-green-600" />
            Connections
          </h3>

          {auth?.user?.role === "user" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 mb-4">
                Manage caregivers or doctors who can view your progress and receive alerts.
              </p>
              <div className="border p-4 rounded-md bg-slate-50">
                <p className="text-slate-500 text-center text-sm">
                  No connections yet. Invite someone below.
                </p>
              </div>
              {/* Fixed: now has onSubmit handler */}
              <form onSubmit={handleInvite} className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="Guardian or Doctor email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="border border-slate-300 rounded-md p-2 flex-grow focus:ring-sky-500 focus:border-sky-500 text-sm"
                  required
                />
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
                >
                  Invite
                </button>
              </form>
            </div>
          )}

          {(auth?.user?.role === "guardian" || auth?.user?.role === "doctor") && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 mb-4">
                View and manage users you are connected with.
              </p>
              <div className="border p-4 rounded-md bg-slate-50">
                <p className="text-slate-500 text-center text-sm">No connected patients yet.</p>
              </div>
            </div>
          )}
        </section>

        {/* Preferences */}
        <section className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-100">
          <h3 className="text-xl font-semibold text-slate-700 mb-6 flex items-center">
            <BellIcon className="h-6 w-6 mr-3 text-purple-600" />
            Preferences & Notifications
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-md">
              <label htmlFor="checkin-reminders" className="text-sm font-medium text-slate-700">
                Enable check-in reminders
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="checkin-reminders"
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
              </label>
            </div>
            <div className="border p-4 rounded-md bg-slate-50">
              <p className="text-slate-500 text-sm">Reminder time settings — coming soon.</p>
            </div>
          </div>
        </section>
      </div>

      {/* Delete account confirmation modal */}
      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete your account?"
          message="This will permanently delete your account and all your data. This action cannot be undone."
          confirmLabel="Yes, delete my account"
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </Layout>
  );
}
