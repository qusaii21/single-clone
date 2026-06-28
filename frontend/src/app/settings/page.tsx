"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { authService } from "@/services";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import {
  ArrowLeft, Bell, Eye, Monitor, Smartphone, Phone, BookImage,
  Lock, User, Shield, ChevronRight,
} from "lucide-react";

type Section =
  | "profile" | "notifications" | "privacy" | "appearance"
  | "linked-devices" | "calls" | "stories" | null;

const menuItems = [
  { key: "profile", icon: User, label: "Profile", description: "Name, bio, avatar" },
  { key: "notifications", icon: Bell, label: "Notifications", description: "Message alerts, sounds" },
  { key: "privacy", icon: Lock, label: "Privacy", description: "Read receipts, who can contact you" },
  { key: "appearance", icon: Monitor, label: "Appearance", description: "Theme, font size, wallpaper" },
  { key: "linked-devices", icon: Smartphone, label: "Linked Devices", description: "Manage connected devices" },
  { key: "calls", icon: Phone, label: "Calls", description: "Voice & video call settings" },
  { key: "stories", icon: BookImage, label: "Stories", description: "Story privacy and archive" },
] as const;

export default function SettingsPage() {
  const router = useRouter();
  const { currentUser, setAuth } = useAppStore();
  const [section, setSection] = useState<Section>(null);

  // Profile edit state
  const [displayName, setDisplayName] = useState(currentUser?.display_name ?? "");
  const [bio, setBio] = useState(currentUser?.bio ?? "");
  const [avatarColor, setAvatarColor] = useState(currentUser?.avatar_color ?? "#5B5EA6");
  const [saving, setSaving] = useState(false);

  const AVATAR_COLORS = [
    "#5B5EA6","#2E9E6F","#C06C84","#F67280","#355C7D",
    "#6C63FF","#E17055","#00B894","#0984E3","#A29BFE",
    "#FD79A8","#FDCB6E","#6D214F","#1B1B2F","#182C61",
  ];

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await authService.updateProfile({ display_name: displayName, bio, avatar_color: avatarColor });
      setAuth(res.data, useAppStore.getState().token!);
      toast("Profile updated", "success");
    } catch {
      toast("Could not save profile", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#111213]">
      {/* Sidebar */}
      <aside className="w-[360px] flex-shrink-0 flex flex-col bg-[#1b1c1f] border-r border-[#2a2b2f]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2b2f]">
          <button
            onClick={() => router.push("/")}
            className="p-1.5 rounded-full text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a2b2f]"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-semibold text-[#e9edef]">Settings</h1>
        </div>

        {/* User info card */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[#2a2b2f]">
          <Avatar
            name={currentUser.display_name}
            avatarUrl={currentUser.avatar_url}
            avatarColor={currentUser.avatar_color}
            size="lg"
          />
          <div>
            <p className="font-semibold text-[#e9edef]">{currentUser.display_name}</p>
            <p className="text-sm text-[#8696a0]">@{currentUser.username}</p>
            <p className="text-xs text-[#8696a0] mt-0.5">{currentUser.phone}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {menuItems.map(({ key, icon: Icon, label, description }) => (
            <button
              key={key}
              onClick={() => setSection(key as Section)}
              className={`flex items-center gap-4 w-full px-4 py-3.5 hover:bg-[#222325] transition-colors ${section === key ? "bg-[#2a2b2f]" : ""}`}
            >
              <div className="w-9 h-9 rounded-full bg-[#2a2b2f] flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-[#3a76f0]" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-medium text-[#e9edef]">{label}</p>
                <p className="text-xs text-[#8696a0]">{description}</p>
              </div>
              <ChevronRight size={16} className="text-[#8696a0]" />
            </button>
          ))}
        </nav>
      </aside>

      {/* Detail pane */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {section === "profile" ? (
          <div className="max-w-lg mx-auto w-full px-6 py-8">
            <h2 className="text-xl font-semibold text-[#e9edef] mb-6">Edit Profile</h2>
            <div className="flex justify-center mb-6">
              <Avatar
                name={displayName || currentUser.display_name}
                avatarUrl={currentUser.avatar_url}
                avatarColor={avatarColor}
                size="xl"
              />
            </div>
            <div className="flex flex-col gap-4">
              <Input
                label="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[#8696a0] uppercase tracking-wider">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Tell people about yourself…"
                  className="w-full bg-[#2a2b2f] border border-[#3a3b40] rounded-lg text-[#e9edef] placeholder-[#8696a0] px-3 py-2.5 text-sm outline-none focus:border-[#3a76f0] resize-none"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[#8696a0] uppercase tracking-wider">Avatar color</label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setAvatarColor(color)}
                      className="w-8 h-8 rounded-full transition-transform hover:scale-110 focus:outline-none"
                      style={{
                        backgroundColor: color,
                        outline: avatarColor === color ? `3px solid white` : "none",
                        outlineOffset: "2px",
                      }}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={saveProfile} loading={saving}>Save changes</Button>
            </div>
          </div>
        ) : section ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center px-6">
            <div className="w-20 h-20 rounded-2xl bg-[#1b1c1f] border border-[#2a2b2f] flex items-center justify-center">
              <Shield size={36} className="text-[#3a76f0]" />
            </div>
            <h2 className="text-xl font-semibold text-[#e9edef]">
              {menuItems.find((m) => m.key === section)?.label}
            </h2>
            <p className="text-[#8696a0] text-sm max-w-xs">
              This feature is coming soon. We're working on bringing you full Signal-level controls.
            </p>
            <span className="text-xs bg-[#1b1c1f] border border-[#2a2b2f] text-[#8696a0] rounded-full px-4 py-1.5">
              Coming Soon
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-[#1b1c1f] border border-[#2a2b2f] flex items-center justify-center">
              <Lock size={28} className="text-[#3a76f0]" />
            </div>
            <p className="text-[#8696a0] text-sm">Select a setting from the left</p>
          </div>
        )}
      </main>
    </div>
  );
}
