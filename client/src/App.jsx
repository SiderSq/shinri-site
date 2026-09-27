import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import CrtOverlay from './components/CrtOverlay';
import GatewayScreen from './components/GatewayScreen';
import BrokenScreen from './components/BrokenScreen';
import RecoveryAnimation from './components/RecoveryAnimation';
import LockoutScreen from './components/LockoutScreen';
import VictoryScreen from './components/VictoryScreen';
import Navigation from './components/Navigation';

// Mainframe Sections
import CaseOverview from './components/sections/CaseOverview';
import Documents from './components/sections/Documents';
import ForensicLab from './components/sections/ForensicLab';
import MediaViewer from './components/sections/MediaViewer';
import NameReconstruction from './components/sections/NameReconstruction';

// Secret Admin Panel
import AdminDashboard from './components/admin/AdminDashboard';

import { SoundFX } from './components/SoundFX';

export default function App() {
  // Global player workflow state: 'LOADING' | 'LOCKED' | 'NEW' | 'AUTHENTICATED' | 'RECOVERING' | 'RECOVERED' | 'SOLVED'
  const [appState, setAppState] = useState('LOADING');
  const [clientIp, setClientIp] = useState('127.0.0.1');
  const [lockoutInfo, setLockoutInfo] = useState({ remainingSeconds: 0, lockedUntil: null });

  // Mainframe state
  const [caseData, setCaseData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Victory scene info
  const [victoryData, setVictoryData] = useState(null);

  // Student identity (persisted in localStorage across the ~15 students)
  const [studentName, setStudentName] = useState(() => {
    try {
      return localStorage.getItem('shinri_student_name') || '';
    } catch {
      return '';
    }
  });

  const handleStudentNameChange = (name) => {
    const clean = (name || '').trim();
    setStudentName(clean);
    try {
      if (clean) {
        localStorage.setItem('shinri_student_name', clean);
      } else {
        localStorage.removeItem('shinri_student_name');
      }
    } catch {}
  };

  // Settings
  const [soundOn, setSoundOn] = useState(SoundFX.isEnabled());
  const [crtOn, setCrtOn] = useState(true);
  
  // Admin panel is hidden from public view. Opened only by direct /admin, #admin, or secret hotkey Ctrl+Shift+A
  const [isAdminOpen, setIsAdminOpen] = useState(
    window.location.pathname === '/admin' || window.location.hash === '#admin'
  );

  // Check server status on mount and periodically if locked
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/investigation/status');
      const data = await res.json();

      setClientIp(data.ip || '127.0.0.1');

      if (data.locked) {
        setLockoutInfo({
          remainingSeconds: data.remainingSeconds,
          lockedUntil: data.lockedUntil
        });
        setAppState('LOCKED');
        return;
      }

      // If unlocked, check session state
      if (data.sessionState === 'SOLVED') {
        setAppState('SOLVED');
        loadInvestigationData();
      } else if (data.sessionState === 'RECOVERED') {
        setAppState('RECOVERED');
        loadInvestigationData();
      } else if (data.sessionState === 'AUTHENTICATED') {
        setAppState('AUTHENTICATED');
      } else {
        setAppState('NEW');
      }
    } catch (err) {
      console.error('Error fetching server status:', err);
      setAppState('NEW');
    }
  };

  const loadInvestigationData = async () => {
    try {
      const res = await fetch('/api/investigation/data');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCaseData(data.data);
          if (data.data.isSolved) {
            setVictoryData({
              killer: data.data.killer || '???',
              solvedAt: new Date().toISOString(),
              quote: data.data.quote
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to load investigation data:', err);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Listen for hash changes for #admin
    const handleHash = () => {
      if (window.location.pathname === '/admin' || window.location.hash === '#admin') {
        setIsAdminOpen(true);
      }
    };
    window.addEventListener('hashchange', handleHash);

    // Secret Admin Hotkey: Ctrl + Shift + A
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toUpperCase() === 'A') {
        e.preventDefault();
        setIsAdminOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Handlers for state progression
  const handleLoginSuccess = (sessionId) => {
    setAppState('AUTHENTICATED');
  };

  const handleRecoveryInitiated = () => {
    setAppState('RECOVERING');
  };

  const handleRecoveryComplete = () => {
    setAppState('RECOVERED');
    loadInvestigationData();
  };

  const handleSolveSuccess = (solveResult) => {
    setVictoryData(solveResult);
    setAppState('SOLVED');
    loadInvestigationData();
  };

  const handleFailedSubmission = (remainingSeconds, lockedUntil) => {
    setLockoutInfo({ remainingSeconds, lockedUntil });
    setAppState('LOCKED');
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-gray-200 flex flex-col font-mono relative selection:bg-[#ff2a85] selection:text-white">
      {/* CRT Scanline and Vignette Effects */}
      <CrtOverlay enabled={crtOn} />

      {/* Persistent Terminal Header */}
      <Header
        state={appState}
        clientIp={clientIp}
        soundOn={soundOn}
        setSoundOn={setSoundOn}
        crtOn={crtOn}
        setCrtOn={setCrtOn}
        studentName={studentName}
        onStudentNameChange={handleStudentNameChange}
      />

      {/* Main Interactive View Router */}
      <main className="flex-1 flex flex-col relative z-10">
        
        {/* Loading State */}
        {appState === 'LOADING' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="p-4 font-mono text-sm text-[#00f3ff] animate-pulse flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00f3ff] animate-ping" />
              <span>ПОДКЛЮЧЕНИЕ К АРХИВУ ТЕРМИНАЛА...</span>
            </div>
          </div>
        )}

        {/* 10-Minute Lockout Screen (Highest priority if IP is locked) */}
        {appState === 'LOCKED' && (
          <LockoutScreen
            remainingSeconds={lockoutInfo.remainingSeconds}
            lockedUntil={lockoutInfo.lockedUntil}
            clientIp={clientIp}
            onUnlocked={() => {
              fetchStatus();
            }}
          />
        )}

        {/* Gateway Screen (Stage 1: Access Code Prompt) */}
        {appState === 'NEW' && (
          <GatewayScreen onLoginSuccess={handleLoginSuccess} />
        )}

        {/* Broken System Screen (Stage 2: Critical Data Deleted & Discovery) */}
        {appState === 'AUTHENTICATED' && (
          <BrokenScreen onRecoveryInitiated={handleRecoveryInitiated} />
        )}

        {/* Recovery Animation (Stage 3: Unpacking Snapshot) */}
        {appState === 'RECOVERING' && (
          <RecoveryAnimation onComplete={handleRecoveryComplete} />
        )}

        {/* Solved Victory Screen (Stage 5: TRUTH BREAK!) */}
        {appState === 'SOLVED' && victoryData && (
          <VictoryScreen
            killer={victoryData.killer}
            solvedAt={victoryData.solvedAt}
            quote={victoryData.quote}
            studentName={studentName}
            onStudentNameChange={handleStudentNameChange}
            onBackToDatabase={() => setAppState('RECOVERED')}
          />
        )}

        {/* Mainframe Investigation Dashboard (Stage 4) */}
        {appState === 'RECOVERED' && caseData && (
          <div className="flex-1 flex flex-col md:flex-row">
            {/* Sidebar Navigation (01 Обзор, 02 Документы, 03 Сообщения, 04 Журнал, 05 Медиа, 06 Реконструкция, 07 Заметки) */}
            <Navigation
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              mobileMenuOpen={mobileMenuOpen}
              setMobileMenuOpen={setMobileMenuOpen}
              isSolved={caseData.isSolved}
            />

            {/* Active Section Content Pane */}
            <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-6xl mx-auto w-full">
              {activeTab === 'overview' && (
                <CaseOverview
                  data={caseData}
                  onNavigateToSection={(tabId) => setActiveTab(tabId)}
                />
              )}

              {activeTab === 'documents' && (
                <Documents documents={caseData.documents} />
              )}

              {activeTab === 'media' && (
                <MediaViewer media={caseData.media} />
              )}

              {activeTab === 'puzzles' && (
                <ForensicLab onNavigateToReconstruction={() => setActiveTab('reconstruction')} />
              )}

              {activeTab === 'reconstruction' && (
                <NameReconstruction
                  killerLength={caseData.killerLength || 4}
                  availableLetters={caseData.availableLetters}
                  onSolveSuccess={handleSolveSuccess}
                  onFailedSubmission={handleFailedSubmission}
                />
              )}
            </div>
          </div>
        )}

      </main>

      {/* Secret Admin Panel Modal Overlay */}
      {isAdminOpen && (
        <AdminDashboard onClose={() => {
          setIsAdminOpen(false);
          if (window.location.hash === '#admin') {
            window.history.pushState(null, '', window.location.pathname);
          }
        }} />
      )}

      {/* Cyber Footer */}
      <footer className="border-t border-[#181f33] py-2.5 px-4 text-center text-[10px] font-mono text-gray-500 bg-[#06080e] select-none">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>SHINRI TRIAL // АРХИВ УЗЛА 04-271</span>
          <span className="text-gray-400">
            «Ради абсолютной надежды...» — Нагито Комаэда
          </span>
          <span className="text-[#00f3ff]">NODE 04-271 ACTIVE</span>
        </div>
      </footer>
    </div>
  );
}
