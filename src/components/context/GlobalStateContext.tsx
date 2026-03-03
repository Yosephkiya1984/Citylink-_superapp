import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, ViewState, UserRole, CityService, OnboardingStage, Journey, Transaction } from '../../types';

interface GlobalState {
  profile: UserProfile | null;
  userRole: UserRole;
  view: ViewState;
  selectedService: CityService | null;
  selectedTransaction: Transaction | null;
  onboardingStage: OnboardingStage;
  adminTerminalVisible: boolean;
  showDevSwitch: boolean;
  activeJourney: Journey | null;
  setProfile: (profile: UserProfile | null) => void;
  setUserRole: (role: UserRole) => void;
  setView: (view: ViewState) => void;
  setSelectedService: (service: CityService | null) => void;
  setSelectedTransaction: (tx: Transaction | null) => void;
  setOnboardingStage: (stage: OnboardingStage) => void;
  setAdminTerminalVisible: (visible: boolean) => void;
  setShowDevSwitch: (visible: boolean) => void;
  setActiveJourney: (journey: Journey | null) => void;
  pushView: (view: ViewState) => void;
}

const GlobalStateContext = createContext<GlobalState | undefined>(undefined);

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [userRole, setUserRoleState] = useState<UserRole>('citizen');

  // Custom setProfile to also update userRole and persist to local storage
  const setProfile = (newProfile: UserProfile | null) => {
    setProfileState(newProfile);
    if (newProfile) {
      setUserRoleState(newProfile.role);
      localStorage.setItem('userProfile', JSON.stringify(newProfile));
    } else {
      setUserRoleState('citizen');
      setOnboardingStage('WELCOME');
      localStorage.removeItem('userProfile');
    }
  };

  // Custom setUserRole for explicit role changes (e.g., admin override)
  const setUserRole = (newRole: UserRole) => {
    setUserRoleState(newRole);
  };

  useEffect(() => {
    // Load profile from local storage on initial mount
    const storedProfile = localStorage.getItem('userProfile');
    if (storedProfile) {
      try {
        const parsedProfile: UserProfile = JSON.parse(storedProfile);
        setProfile(parsedProfile);
      } catch (error) {
        console.error('Failed to parse stored profile:', error);
        localStorage.removeItem('userProfile');
      }
    }
  }, []); // Run only once on mount

  // Effect to update userRole whenever profile changes (e.g., after API calls)
  useEffect(() => {
    if (profile) {
      setUserRoleState(profile.role);
    } else {
      setUserRoleState('citizen');
    }
  }, [profile]); // Re-run when profile changes

  const [view, setView] = useState<ViewState>('home');
  const [selectedService, setSelectedService] = useState<CityService | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [onboardingStage, setOnboardingStage] = useState<OnboardingStage>('WELCOME');
  const [adminTerminalVisible, setAdminTerminalVisible] = useState(false);
  const [showDevSwitch, setShowDevSwitch] = useState(false);
  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);

  const pushView = (newView: ViewState) => {
    setView(newView);
  };

  return (
    <GlobalStateContext.Provider value={{
      profile, userRole, view, selectedService, selectedTransaction, onboardingStage, adminTerminalVisible, showDevSwitch, activeJourney,
      setProfile, setUserRole, setView, setSelectedService, setSelectedTransaction, setOnboardingStage, setAdminTerminalVisible, setShowDevSwitch, setActiveJourney,
      pushView
    }}>
      {children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (!context) throw new Error('useGlobalState must be used within GlobalProvider');
  return context;
};
