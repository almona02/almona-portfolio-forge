import { create } from "zustand";

interface ProfileTuningStore {
  activeTab: string;
  currentProfileId?: string;
  setActiveTab: (tab: string) => void;
  setCurrentProfileId: (id: string) => void;
  loadProfile: (profileId: string) => Promise<void>;
}

export const useProfileTuningStore = create<ProfileTuningStore>((set) => ({
  activeTab: "calibration",
  currentProfileId: undefined,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setCurrentProfileId: (id) => set({ currentProfileId: id }),
  loadProfile: async (profileId: string) => {
    // Placeholder: in a fuller integration, fetch the profile by ID here
    set({ currentProfileId: profileId });
  },
}));

