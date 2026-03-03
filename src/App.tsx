import React, { useState, useEffect } from 'react';
import { GlobalProvider, useGlobalState } from './components/context/GlobalStateContext';
import GlobalHeader from './components/GlobalHeader';
import CitizenPortal from './components/features/citizen/CitizenPortal';
import ServicesPage from './components/features/citizen/ServicesPage';
import TransportHub from './components/features/transport/TransportHub';
import CityReport from './components/features/citizen/CityReport';
import EkubHub from './components/features/citizen/EkubHub';
import Marketplace from './components/features/citizen/Marketplace';
import ProfilePage from './components/features/citizen/ProfilePage';
import PendingReview from './components/features/merchant/PendingReview';
import ServiceDetail from './components/features/citizen/ServiceDetail';
import MerchantPortal from './components/MerchantPortal';
import ParkingCitizenHub from './components/features/citizen/ParkingCitizenHub';
import TrafficFinePayment from './components/features/citizen/TrafficFinePayment';
import SchoolFeePayment from './components/features/citizen/SchoolFeePayment';
import WalletFunding from './components/features/citizen/WalletFunding';
import PaymentReceipt from './components/features/citizen/PaymentReceipt';
import CitizenJobDashboard from './components/features/citizen/CitizenJobDashboard';
import EmployerDashboard from './components/features/merchant/EmployerDashboard';
import EkubMerchantDashboard from './components/features/merchant/EkubMerchantDashboard';
import ParkingMerchantDashboard from './components/features/merchant/ParkingMerchantDashboard';
import BusMerchantDashboard from './components/features/merchant/BusMerchantDashboard';
import MinisterialDashboard from './components/MinisterialDashboard';
import BottomNav from './components/BottomNav';
import OnboardingFlow from './components/features/onboarding/OnboardingFlow';
import AppErrorBoundary from './components/context/AppErrorBoundary';

import DevFloatingButton from './components/DevFloatingButton';
import TransactionHistory from './components/features/citizen/TransactionHistory';
import { ViewState, Transaction } from './types';
// Force cache invalidation
import { api } from './services/api';

import DeveloperSwitch from './components/DeveloperSwitch';

const UniversalRouter: React.FC = () => {
  const { 
    userRole, profile, setProfile, view, setView,
    adminTerminalVisible, setAdminTerminalVisible,
    showDevSwitch, setShowDevSwitch
  } = useGlobalState();

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const navigateTo = (newView: ViewState) => {
    setView(newView);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setAdminTerminalVisible(!adminTerminalVisible);
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDevSwitch(!showDevSwitch);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [adminTerminalVisible, setAdminTerminalVisible, showDevSwitch, setShowDevSwitch]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const txRef = params.get('tx_ref');
    
    if (paymentStatus === 'success') {
      if (txRef) {
        // Verify payment with backend
        api.get(`/verify-payment/${txRef}`).then((res) => {
          if (res.status === 'success') {
            alert('Payment Verified & Successful! Thank you.');
            // Refresh profile to update balance if it was a wallet funding
            if (profile?.id) {
              api.getProfile(profile.id).then(p => {
                if (p) setProfile(p);
              });
            }
          } else {
            alert('Payment verification failed or pending.');
          }
        }).catch(err => {
          console.error("Verification error:", err);
          alert('Could not verify payment status. Please check your transaction history.');
        });
      } else {
        alert('Payment Successful! Thank you.');
      }
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (paymentStatus === 'cancelled') {
      alert('Payment was cancelled.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [profile?.id]);

  const renderFlow = () => {
    // If not logged in, always show OnboardingFlow
    if (!profile?.isLoggedIn) {
      return <OnboardingFlow />;
    }

    // If logged in, but not fully onboarded or approved, show relevant onboarding screens
    const isApprovedMerchant = profile.role === 'merchant' && profile.merchant_status === 'APPROVED';
    
    if ((!profile.registration_complete && !isApprovedMerchant) || (profile.role === 'merchant' && profile.merchant_status !== 'APPROVED')) {
      // If they are a merchant and pending, show PendingReview
      if (profile.role === 'merchant' && profile.merchant_status === 'PENDING') {
        return <PendingReview />;
      }
      // Otherwise, if logged in but not fully onboarded/approved, show OnboardingFlow
      return <OnboardingFlow />;
    }

    // If logged in AND fully onboarded/approved, then route to their respective portals
    if (userRole === 'citizen') {
      if (view === 'service_detail') {
        return <ServiceDetail onSelectTransaction={(tx) => {
          setSelectedTransaction(tx);
          navigateTo('payment_receipt');
        }} />;
      }
      if (view === 'services') {
        return <ServicesPage />;
      }
      if (view === 'transport_hub') {
        return <TransportHub />;
      }
      if (view === 'city_report') {
        return <CityReport />;
      }
      if (view === 'ekub') {
        return <EkubHub />;
      }
      if (view === 'parking_citizen_hub') {
        return <ParkingCitizenHub />;
      }
      if (view === 'traffic_fines') {
        return <TrafficFinePayment />;
      }
      if (view === 'school_fees') {
        return <SchoolFeePayment />;
      }
      if (view === 'wallet_funding') {
        return <WalletFunding />;
      }
      if (view === 'payment_receipt') {
        return <PaymentReceipt />;
      }
      if (view === 'marketplace') {
        return <Marketplace />;
      }
      if (view === 'transaction_history' || view === 'wallet') {
        return <TransactionHistory 
          setView={navigateTo} 
          isMainTab={view === 'wallet'}
          onSelectTransaction={(tx) => {
            setSelectedTransaction(tx);
            navigateTo('payment_receipt');
          }} 
        />;
      }

      if (view === 'job_dashboard') {
        return <CitizenJobDashboard />;
      }

      if (view === 'profile') {
        return <ProfilePage />;
      }
      return <CitizenPortal currentView={view} setView={navigateTo} onSelectTransaction={(tx) => {
        setSelectedTransaction(tx);
        navigateTo('payment_receipt');
      }} />;
    }

    if (userRole === 'merchant') {
      if (profile?.merchant_status === 'PENDING') {
        return <PendingReview />;
      }
      if (profile?.merchant_type === 'employer' || view === 'employer_dashboard') {
        return <EmployerDashboard />;
      }
      if (profile?.merchant_type === 'seller') {
        return <MerchantPortal />;
      }
      if (profile?.merchant_type === 'ekub') {
        if (view === 'ekub_merchant_dashboard') {
          return <EkubMerchantDashboard />;
        }
        return <EkubMerchantDashboard />; // Default to Ekub dashboard if merchant type is ekub
      }
      if (profile?.merchant_type === 'parking') {
        return <ParkingMerchantDashboard />;
      }
      if (profile?.merchant_type === 'bus') {
        return <BusMerchantDashboard />;
      }
      // Fallback for unknown merchant types or states
      return <MerchantPortal />;
    }

    if (userRole === 'minister') {
      return <MinisterialDashboard onClose={() => setAdminTerminalVisible(false)} />;
    }

    return <CitizenPortal currentView={view} setView={navigateTo} onSelectTransaction={(tx) => {
      setSelectedTransaction(tx);
      navigateTo('payment_receipt');
    }} />;
  };

  const isDashboardView = userRole === 'merchant' || userRole === 'minister' || adminTerminalVisible;

  return (
    <AppErrorBoundary>
      <div className={`mx-auto min-h-screen relative flex flex-col overflow-x-hidden bg-[#020617] ${isDashboardView ? 'max-w-none' : 'max-w-xl shadow-2xl shadow-black'}`}>
        {profile?.isLoggedIn && !adminTerminalVisible && view !== 'service_detail' && view !== 'transaction_history' && view !== 'payment_receipt' && userRole === 'citizen' && (
          <GlobalHeader currentView={view} onNavigate={navigateTo} />
        )}
        
        <main className="flex-grow">
          {renderFlow()}
        </main>

        {profile?.isLoggedIn && !adminTerminalVisible && userRole === 'citizen' && view !== 'service_detail' && view !== 'transaction_history' && view !== 'payment_receipt' && (
          <BottomNav activeView={view} setView={navigateTo} />
        )}

        {adminTerminalVisible && (
          <MinisterialDashboard onClose={() => setAdminTerminalVisible(false)} />
        )}

        {showDevSwitch && <DeveloperSwitch />}
        
        {!adminTerminalVisible && <DevFloatingButton />}
      </div>
    </AppErrorBoundary>
  );
};

export default function App() {
  return (
    <GlobalProvider>
      <UniversalRouter />
    </GlobalProvider>
  );
}
