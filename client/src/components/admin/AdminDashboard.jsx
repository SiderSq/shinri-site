import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Key,
  Database,
  FileText,
  MessageSquare,
  ListOrdered,
  Image as ImageIcon,
  Users,
  HelpCircle,
  Lock,
  Unlock,
  AlertTriangle,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  LogOut,
  CheckCircle2,
  X,
  Upload,
  Camera,
  RotateCcw,
  UserCheck
} from 'lucide-react';
import { SoundFX } from '../SoundFX';

export default function AdminDashboard({ onClose }) {
  const [authToken, setAuthToken] = useState(localStorage.getItem('shinri_admin_token') || '');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Admin Sub-tab
  const [activeTab, setActiveTab] = useState('case');
  const [caseData, setCaseData] = useState(null);
  const [locks, setLocks] = useState([]);
  const [audit, setAudit] = useState([]);
  const [playerSessions, setPlayerSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

  // Reset Game Session Modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // GMod Screenshot Upload State
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadTime, setUploadTime] = useState('21:40');
  const [uploadCategory, setUploadCategory] = useState('Улика с места преступления');
  const [uploadCamera, setUploadCamera] = useState("Снимок Нагито (GMod)");
  const [uploadDesc, setUploadDesc] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Check auth and load data
  useEffect(() => {
    if (authToken) {
      loadAllAdminData();
    }
  }, [authToken]);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Case Data
      const caseRes = await fetch('/api/admin/case', {
        headers: { 'x-admin-token': authToken }
      });
      if (caseRes.status === 401) {
        handleLogout();
        return;
      }
      const caseJson = await caseRes.json();
      if (caseJson.success) setCaseData(caseJson.data);

      // 2. Fetch Locks
      const locksRes = await fetch('/api/admin/locks', {
        headers: { 'x-admin-token': authToken }
      });
      const locksJson = await locksRes.json();
      if (locksJson.success) setLocks(locksJson.locks);

      // 3. Fetch Audit
      const auditRes = await fetch('/api/admin/audit', {
        headers: { 'x-admin-token': authToken }
      });
      const auditJson = await auditRes.json();
      if (auditJson.success) setAudit(auditJson.audit);

      // 4. Fetch Active Player Sessions
      try {
        const sessRes = await fetch('/api/admin/sessions', {
          headers: { 'x-admin-token': authToken }
        });
        const sessJson = await sessRes.json();
        if (sessJson.success) setPlayerSessions(sessJson.sessions || []);
      } catch (sessErr) {
        console.warn('Failed to fetch player sessions:', sessErr);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!passwordInput.trim() || isLoggingIn) return;

    SoundFX.playClick();
    setIsLoggingIn(true);
    setAuthError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        SoundFX.playAccessGranted();
        setAuthToken(data.token);
        localStorage.setItem('shinri_admin_token', data.token);
        setPasswordInput('');
      } else {
        SoundFX.playAccessDenied();
        setAuthError(data.error || 'Неверный пароль администратора.');
      }
    } catch (err) {
      SoundFX.playAccessDenied();
      setAuthError('Ошибка соединения с сервером.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    SoundFX.playClick();
    setAuthToken('');
    localStorage.removeItem('shinri_admin_token');
  };

  const showSuccess = (msg) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const showError = (msg) => {
    setSaveErrorMsg(msg);
    setTimeout(() => setSaveErrorMsg(''), 4000);
  };

  // Reset Game Session (Idea 2)
  const handleResetGameSession = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/admin/reset-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': authToken
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        SoundFX.playAccessGranted();
        showSuccess(data.message || 'СЕССИЯ РАССЛЕДОВАНИЯ СБРОШЕНА!');
        loadAllAdminData();
        setIsResetModalOpen(false);
      } else {
        SoundFX.playAccessDenied();
        showError(data.error || 'Ошибка сброса сессии');
      }
    } catch (err) {
      SoundFX.playAccessDenied();
      showError('Сетевая ошибка при сбросе сессии');
    } finally {
      setIsResetting(false);
    }
  };

  // Handle Garry's Mod Screenshot selection (Idea 4)
  const handleFileSelected = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showError('Пожалуйста, выберите файл изображения (PNG, JPG, WebP).');
      return;
    }
    setUploadFile(file);
    if (!uploadTitle) {
      const rawName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setUploadTitle(rawName);
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle Garry's Mod Screenshot Upload to Server (Idea 4)
  const handleUploadScreenshot = async (e) => {
    if (e) e.preventDefault();
    if (!uploadPreview) {
      showError('Сначала выберите или перетащите скриншот!');
      return;
    }
    setIsUploading(true);
    try {
      const payload = {
        title: uploadTitle || 'Скриншот с места преступления',
        time: uploadTime || '21:40',
        tag: uploadCategory || 'Улика с места преступления',
        camera: uploadCamera || 'GMOD CAMERA',
        desc: uploadDesc || '',
        imageBase64: uploadPreview,
        filename: uploadFile?.name || 'screenshot.png'
      };

      const res = await fetch('/api/admin/upload-screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': authToken
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        SoundFX.playAccessGranted();
        showSuccess('Скриншот успешно загружен и опубликован в фотоархиве суда!');
        setUploadFile(null);
        setUploadPreview('');
        setUploadTitle('');
        setUploadDesc('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadAllAdminData();
      } else {
        SoundFX.playAccessDenied();
        showError(data.error || 'Ошибка загрузки изображения');
      }
    } catch (err) {
      SoundFX.playAccessDenied();
      showError('Ошибка соединения при отправке скриншота');
    } finally {
      setIsUploading(false);
    }
  };

  // 1. Save Core Case Settings
  const handleSaveCaseSettings = async () => {
    SoundFX.playClick();
    try {
      const res = await fetch('/api/admin/case', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': authToken
        },
        body: JSON.stringify({
          title: caseData.title,
          subtitle: caseData.subtitle,
          accessCode: caseData.accessCode,
          recoveryKey: caseData.recoveryKey,
          killer: caseData.killer,
          victim: caseData.victim,
          location: caseData.location,
          incidentTime: caseData.incidentTime,
          weapon: caseData.weapon,
          status: caseData.status,
          quote: caseData.quote
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        SoundFX.playAccessGranted();
        showSuccess('Настройки дела успешно обновлены!');
      } else {
        showError(data.error || 'Ошибка при сохранении.');
      }
    } catch (err) {
      showError('Ошибка соединения.');
    }
  };

  // 2. Unlock single IP
  const handleUnlockIp = async (ip) => {
    SoundFX.playClick();
    try {
      const res = await fetch('/api/admin/locks/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': authToken
        },
        body: JSON.stringify({ ip })
      });
      if (res.ok) {
        SoundFX.playAccessGranted();
        showSuccess(`IP ${ip} успешно разблокирован.`);
        loadAllAdminData();
      }
    } catch (err) {
      showError('Ошибка при разблокировке.');
    }
  };

  // 3. Clear all locks
  const handleClearAllLocks = async () => {
    SoundFX.playClick();
    try {
      const res = await fetch('/api/admin/locks/clear-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': authToken
        }
      });
      if (res.ok) {
        SoundFX.playAccessGranted();
        showSuccess('Все блокировки сняты.');
        loadAllAdminData();
      }
    } catch (err) {
      showError('Ошибка очистки блокировок.');
    }
  };

  // If not logged in as Admin, show login screen
  if (!authToken) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
        <div className="w-full max-w-md cyber-panel p-6 sm:p-8 bg-[#0b0e18] border-2 border-[#ff2a85] shadow-[0_0_30px_rgba(255,42,133,0.3)] space-y-5">
          <div className="flex items-center justify-between border-b border-[#1f2842] pb-3">
            <div className="flex items-center gap-2">
              <Shield className="text-[#ff2a85]" size={22} />
              <h2 className="font-cyber font-bold text-white text-lg">
                ПАНЕЛЬ КУРАТОРА
              </h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white font-mono text-lg">
              ✕
            </button>
          </div>

          <p className="text-xs font-mono text-gray-400">
            Введите пароль администратора для настройки параметров дела, замены убийцы, редактирования улик и управления блокировками IP.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1.5">
                ПАРОЛЬ АДМИНИСТРАТОРА:
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Пароль..."
                  autoFocus
                  className="dr-input font-mono pl-9"
                />
                <Lock className="absolute left-3 top-3 text-[#ff2a85]" size={16} />
              </div>
            </div>

            {authError && (
              <div className="p-2.5 bg-[#ff2a85]/15 border border-[#ff2a85] text-[#ff2a85] text-xs font-mono rounded">
                {authError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 dr-btn py-2 text-xs font-mono"
              >
                ОТМЕНА
              </button>
              <button
                type="submit"
                disabled={isLoggingIn || !passwordInput.trim()}
                className="flex-1 dr-btn dr-btn-primary py-2 text-xs font-cyber font-bold"
              >
                {isLoggingIn ? 'ПРОВЕРКА...' : 'ВОЙТИ'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Admin tabs navigation
  const adminTabs = [
    { id: 'case', label: 'Параметры Дела', icon: Database },
    { id: 'players', label: `Игроки (${playerSessions.length})`, icon: UserCheck, highlight: playerSessions.length > 0 },
    { id: 'documents', label: 'Файл Монокумы', icon: FileText },
    { id: 'media', label: 'Фото и Скриншоты', icon: ImageIcon },
    { id: 'suspects', label: 'Подозреваемые и Загадки', icon: Users },
    { id: 'hints', label: 'Подсказки', icon: HelpCircle },
    { id: 'locks', label: `Блокировки IP (${locks.length})`, icon: Unlock, highlight: locks.length > 0 },
    { id: 'audit', label: 'Аудит', icon: Shield }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#070910] text-gray-200 overflow-y-auto">
      
      {/* Admin Top Bar */}
      <header className="border-b border-[#202945] bg-[#0c101c] px-4 py-3 sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Shield className="text-[#ff2a85]" size={22} />
          <div>
            <h1 className="font-cyber font-bold text-white text-base">
              ПАНЕЛЬ УПРАВЛЕНИЯ КУРАТОРА // SHINRI CONTROL
            </h1>
            <span className="text-[11px] font-mono text-gray-400">
              Настройка сценариев расследования без перезапуска сервера
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAllAdminData}
            title="Обновить данные"
            className="p-2 rounded bg-[#131a2d] border border-[#232f4e] hover:border-[#00f3ff] text-gray-300"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleLogout}
            className="dr-btn py-1.5 px-3 text-xs font-mono text-gray-400 hover:text-red-400 border-gray-700 flex items-center gap-1"
          >
            <LogOut size={13} />
            <span>ВЫЙТИ</span>
          </button>

          <button
            onClick={() => {
              SoundFX.playClick();
              setIsResetModalOpen(true);
            }}
            title="Сбросить игру для нового раунда"
            className="dr-btn py-1.5 px-3 text-xs font-cyber font-bold text-amber-400 border-amber-500/50 hover:bg-amber-500/20 hover:border-amber-400 flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
          >
            <RotateCcw size={13} />
            <span>СБРОС ИГРЫ (НОВАЯ СЕССИЯ)</span>
          </button>

          <button
            onClick={onClose}
            className="dr-btn dr-btn-cyan py-1.5 px-3 text-xs font-cyber"
          >
            В ТЕРМИНАЛ
          </button>
        </div>
      </header>

      {/* Status Toasts */}
      {saveSuccessMsg && (
        <div className="max-w-4xl mx-auto mt-3 p-3 bg-[#00ff88]/15 border border-[#00ff88] text-[#00ff88] font-mono text-xs rounded flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {saveErrorMsg && (
        <div className="max-w-4xl mx-auto mt-3 p-3 bg-[#ff2a85]/15 border border-[#ff2a85] text-[#ff2a85] font-mono text-xs rounded flex items-center gap-2 animate-shake">
          <AlertTriangle size={16} />
          <span>{saveErrorMsg}</span>
        </div>
      )}

      {/* Main Admin Content Container */}
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-[#1b233a] pb-2">
          {adminTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  SoundFX.playClick();
                  setActiveTab(tab.id);
                }}
                className={`px-3 py-2 rounded text-xs font-mono flex items-center gap-1.5 transition-all border ${
                  isActive
                    ? 'bg-[#182138] border-[#00f3ff] text-white font-bold shadow-[0_0_10px_rgba(0,243,255,0.2)]'
                    : tab.highlight
                    ? 'bg-[#ff2a85]/15 border-[#ff2a85] text-[#ff2a85]'
                    : 'bg-[#0e121e] border-[#182035] text-gray-400 hover:text-white'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Case Core Settings */}
        {activeTab === 'case' && caseData && (
          <div className="cyber-panel p-6 bg-[#0a0d17] border border-[#202945] space-y-5">
            <div className="flex items-center justify-between border-b border-[#1c243b] pb-3">
              <div>
                <h2 className="font-cyber font-bold text-white text-base">
                  ОСНОВНЫЕ ПАРАМЕТРЫ РАССЛЕДОВАНИЯ
                </h2>
                <p className="text-xs font-mono text-gray-400">
                  Измените имя настоящего убийцы, код доступа к сайту или ключ восстановления
                </p>
              </div>
              <button
                onClick={handleSaveCaseSettings}
                className="dr-btn dr-btn-primary py-2 px-5 text-xs font-cyber flex items-center gap-1.5"
              >
                <Save size={14} />
                <span>СОХРАНИТЬ ДЕЛО</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
              <div>
                <label className="block text-gray-400 mb-1">КОД ДОСТУПА К САЙТУ (ПАРОЛЬ):</label>
                <input
                  type="text"
                  value={caseData.accessCode || ''}
                  onChange={(e) => setCaseData({ ...caseData, accessCode: e.target.value })}
                  className="dr-input text-[#00f3ff] font-bold"
                />
                <span className="text-[10px] text-gray-500">Стартовый код шлюза</span>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">ИМЯ НАСТОЯЩЕГО УБИЙЦЫ (ОТВЕТ):</label>
                <input
                  type="text"
                  value={caseData.killer || ''}
                  onChange={(e) => setCaseData({ ...caseData, killer: e.target.value.toUpperCase() })}
                  className="dr-input text-[#ff2a85] font-bold tracking-widest uppercase"
                />
                <span className="text-[10px] text-gray-500">Серверная проверка. Не передаётся клиенту</span>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">КЛЮЧ ВОССТАНОВЛЕНИЯ ДАННЫХ (SNAPSHOT):</label>
                <input
                  type="text"
                  value={caseData.recoveryKey || ''}
                  onChange={(e) => setCaseData({ ...caseData, recoveryKey: e.target.value })}
                  className="dr-input text-amber-300 font-bold"
                />
                <span className="text-[10px] text-gray-500">Ключ для распаковки аварийного снимка</span>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">СТАТУС ДЕЛА:</label>
                <input
                  type="text"
                  value={caseData.status || ''}
                  onChange={(e) => setCaseData({ ...caseData, status: e.target.value })}
                  className="dr-input text-gray-200"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">НАЗВАНИЕ ДЕЛА:</label>
                <input
                  type="text"
                  value={caseData.title || ''}
                  onChange={(e) => setCaseData({ ...caseData, title: e.target.value })}
                  className="dr-input text-gray-200"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">ПОДЗАГОЛОВОК:</label>
                <input
                  type="text"
                  value={caseData.subtitle || ''}
                  onChange={(e) => setCaseData({ ...caseData, subtitle: e.target.value })}
                  className="dr-input text-gray-200"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">ЖЕРТВА / ПОСТРАДАВШИЙ:</label>
                <input
                  type="text"
                  value={caseData.victim || ''}
                  onChange={(e) => setCaseData({ ...caseData, victim: e.target.value })}
                  className="dr-input text-gray-200"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">МЕСТО ПРОИСШЕСТВИЯ:</label>
                <input
                  type="text"
                  value={caseData.location || ''}
                  onChange={(e) => setCaseData({ ...caseData, location: e.target.value })}
                  className="dr-input text-gray-200"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">ВРЕМЯ ИНЦИДЕНТА:</label>
                <input
                  type="text"
                  value={caseData.incidentTime || ''}
                  onChange={(e) => setCaseData({ ...caseData, incidentTime: e.target.value })}
                  className="dr-input text-gray-200"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">ОРУДИЕ ПРЕСТУПЛЕНИЯ:</label>
                <input
                  type="text"
                  value={caseData.weapon || ''}
                  onChange={(e) => setCaseData({ ...caseData, weapon: e.target.value })}
                  className="dr-input text-[#ff2a85] font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-gray-400 mb-1">ЦИТАТА НАГИТО КОМАЭДЫ:</label>
                <textarea
                  rows={2}
                  value={caseData.quote || ''}
                  onChange={(e) => setCaseData({ ...caseData, quote: e.target.value })}
                  className="dr-input text-gray-300"
                />
              </div>
            </div>
          </div>
        )}



        {/* Tab 3: Documents CRUD */}
        {activeTab === 'documents' && caseData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-cyber font-bold text-white text-base">
                УПРАВЛЕНИЕ ДОКУМЕНТАМИ
              </h2>
              <button
                onClick={async () => {
                  SoundFX.playClick();
                  const newDoc = {
                    code: `DOC_${Date.now().toString().slice(-4)}`,
                    title: 'Новый служебный протокол',
                    time: '21:00',
                    author: 'Служба протокола',
                    content: 'Текст документа...',
                    category: 'Служебные'
                  };
                  await fetch('/api/admin/documents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-admin-token': authToken },
                    body: JSON.stringify(newDoc)
                  });
                  loadAllAdminData();
                }}
                className="dr-btn dr-btn-cyan py-1.5 px-3 text-xs font-mono flex items-center gap-1"
              >
                <Plus size={14} />
                <span>+ ДОБАВИТЬ ДОКУМЕНТ</span>
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {(caseData.documents || []).map((doc, idx) => (
                <div key={doc.id} className="p-4 bg-[#0a0d16] border border-[#1b233a] rounded space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-gray-500 block mb-1">КОД ДОКУМЕНТА:</label>
                      <input
                        type="text"
                        value={doc.code}
                        onChange={(e) => {
                          const updated = [...caseData.documents];
                          updated[idx].code = e.target.value;
                          setCaseData({ ...caseData, documents: updated });
                        }}
                        className="dr-input py-1 text-xs font-bold text-[#00f3ff]"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 block mb-1">ЗАГОЛОВОК:</label>
                      <input
                        type="text"
                        value={doc.title}
                        onChange={(e) => {
                          const updated = [...caseData.documents];
                          updated[idx].title = e.target.value;
                          setCaseData({ ...caseData, documents: updated });
                        }}
                        className="dr-input py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 block mb-1">АВТОР:</label>
                      <input
                        type="text"
                        value={doc.author}
                        onChange={(e) => {
                          const updated = [...caseData.documents];
                          updated[idx].author = e.target.value;
                          setCaseData({ ...caseData, documents: updated });
                        }}
                        className="dr-input py-1 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">СОДЕРЖИМОЕ ДОКУМЕНТА:</label>
                    <textarea
                      rows={4}
                      value={doc.content}
                      onChange={(e) => {
                        const updated = [...caseData.documents];
                        updated[idx].content = e.target.value;
                        setCaseData({ ...caseData, documents: updated });
                      }}
                      className="dr-input py-1 text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={async () => {
                        SoundFX.playClick();
                        await fetch(`/api/admin/documents/${doc.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', 'x-admin-token': authToken },
                          body: JSON.stringify(doc)
                        });
                        showSuccess('Документ сохранен!');
                      }}
                      className="dr-btn py-1 px-3 text-xs"
                    >
                      Сохранить
                    </button>
                    <button
                      onClick={async () => {
                        SoundFX.playClick();
                        await fetch(`/api/admin/documents/${doc.id}`, {
                          method: 'DELETE',
                          headers: { 'x-admin-token': authToken }
                        });
                        loadAllAdminData();
                      }}
                      className="dr-btn py-1 px-2 text-xs text-red-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Media & Crime Scene Photos CRUD */}
        {activeTab === 'media' && caseData && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-cyber font-bold text-white text-base">
                  УПРАВЛЕНИЕ ФОТОГРАФИЯМИ И СКРИНШОТАМИ ИЗ GMOD
                </h2>
                <p className="text-xs font-mono text-gray-400">
                  Вставляйте ссылки на реальные внутриигровые скриншоты или используйте встроенные стилизованные схемы.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    SoundFX.playClick();
                    const newMedia = {
                      id: `MEDIA_${Date.now()}`,
                      code: `PHOTO_${Date.now().toString().slice(-4)}`,
                      title: 'Новый снимок места преступления',
                      time: '21:30',
                      camera: 'Снимок Нагито',
                      tag: 'Улика',
                      desc: '«Возможно, здесь кроется зацепка?...»',
                      svgType: 'corpse_trap',
                      customImageUrl: ''
                    };
                    const res = await fetch('/api/admin/media', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'x-admin-token': authToken },
                      body: JSON.stringify(newMedia)
                    });
                    if (res.ok) {
                      loadAllAdminData();
                      showSuccess('Новый фотоматериал добавлен!');
                    }
                  }}
                  className="dr-btn dr-btn-cyan py-1.5 px-3 text-xs font-mono flex items-center gap-1"
                >
                  <Plus size={14} />
                  <span>+ ДОБАВИТЬ СНИМОК</span>
                </button>
                <button
                  onClick={async () => {
                    SoundFX.playClick();
                    await fetch('/api/admin/media', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', 'x-admin-token': authToken },
                      body: JSON.stringify({ media: caseData.media })
                    });
                    showSuccess('Все фотографии сохранены!');
                  }}
                  className="dr-btn dr-btn-primary py-1.5 px-4 text-xs font-cyber flex items-center gap-1"
                >
                  <Save size={14} />
                  <span>СОХРАНИТЬ ВСЕ</span>
                </button>
              </div>
            </div>

            {/* Garry's Mod Quick Screenshot Uploader (Idea 4) */}
            <div className="p-4 bg-[#0a0d16] border border-[#00f3ff]/40 rounded-lg space-y-4 shadow-[0_0_20px_rgba(0,243,255,0.08)]">
              <div className="flex flex-wrap items-center justify-between border-b border-[#1b233a] pb-2.5 gap-2">
                <div className="flex items-center gap-2 text-[#00f3ff] font-cyber font-bold text-sm">
                  <Camera size={18} className="text-[#00f3ff]" />
                  <span>БЫСТРАЯ ЗАГРУЗКА СКРИНШОТА ИЗ GARRYS MOD</span>
                </div>
                <span className="text-[10px] font-mono text-gray-400 bg-[#121829] px-2.5 py-1 rounded border border-[#1d2745]">
                  PNG / JPG / WEBP • АВТОМАТИЧЕСКАЯ ПУБЛИКАЦИЯ В ФОТОАРХИВ
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileSelected(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer border-2 border-dashed border-[#222f4c] hover:border-[#00f3ff] bg-[#070912] rounded-lg p-4 flex flex-col items-center justify-center text-center group transition-all min-h-[180px]"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelected(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  {uploadPreview ? (
                    <div className="space-y-2 w-full">
                      <img
                        src={uploadPreview}
                        alt="Preview"
                        className="max-h-32 w-auto mx-auto rounded border border-[#00f3ff]/50 object-contain shadow-[0_0_10px_rgba(0,243,255,0.2)]"
                      />
                      <span className="text-[11px] font-mono text-[#00f3ff] block truncate">
                        {uploadFile?.name || 'Скриншот выбран'} (нажмите для замены)
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2 text-gray-400 group-hover:text-[#00f3ff] transition-colors">
                      <Upload size={32} className="mx-auto text-gray-500 group-hover:text-[#00f3ff] transition-transform group-hover:-translate-y-1" />
                      <div className="text-xs font-mono font-bold text-gray-300 group-hover:text-[#00f3ff]">
                        ПЕРЕТАЩИТЕ СКРИНШОТ GMOD СЮДА
                      </div>
                      <div className="text-[10px] font-mono text-gray-500">
                        или кликните для выбора из папки Garry's Mod
                      </div>
                    </div>
                  )}
                </div>

                {/* Metadata Fields */}
                <div className="lg:col-span-2 space-y-3 font-mono text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 block mb-1">НАЗВАНИЕ СНИМКА / УЛИКИ:</label>
                      <input
                        type="text"
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        placeholder="Например: Положение швабры у мусорной печи"
                        className="dr-input"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">ВРЕМЯ СНИМКА (ИНЦИДЕНТА):</label>
                      <input
                        type="text"
                        value={uploadTime}
                        onChange={(e) => setUploadTime(e.target.value)}
                        placeholder="21:40"
                        className="dr-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 block mb-1">КАТЕГОРИЯ / ТЕГ УЛИКИ:</label>
                      <input
                        type="text"
                        value={uploadCategory}
                        onChange={(e) => setUploadCategory(e.target.value)}
                        placeholder="Улика с места преступления"
                        className="dr-input"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">ИСТОЧНИК / КАМЕРА:</label>
                      <input
                        type="text"
                        value={uploadCamera}
                        onChange={(e) => setUploadCamera(e.target.value)}
                        placeholder="Снимок Нагито (GMod)"
                        className="dr-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">КОММЕНТАРИЙ НАГИТО / ПОЯСНЕНИЕ ДЛЯ УЧЕНИКОВ:</label>
                    <textarea
                      rows={2}
                      value={uploadDesc}
                      onChange={(e) => setUploadDesc(e.target.value)}
                      placeholder="«Обратите внимание на положение швабры и следы смытой крови у дренажного слива...»"
                      className="dr-input resize-none"
                    />
                  </div>

                  <div className="flex justify-end items-center gap-3 pt-1">
                    {uploadPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setUploadPreview('');
                          setUploadFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="dr-btn py-1.5 px-3 text-xs text-gray-400 font-mono hover:text-white"
                      >
                        ОЧИСТИТЬ
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isUploading || !uploadPreview}
                      onClick={handleUploadScreenshot}
                      className="dr-btn dr-btn-cyan py-1.5 px-5 text-xs font-cyber font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(0,243,255,0.3)] disabled:opacity-50"
                    >
                      <Upload size={14} />
                      <span>{isUploading ? 'ЗАГРУЗКА...' : 'ОПУБЛИКОВАТЬ В МАТЕРИАЛАХ ДЕЛА'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 font-mono text-xs">
              {(caseData.media || []).map((item, idx) => (
                <div key={item.id || idx} className="p-4 bg-[#0a0d16] border border-[#1b233a] rounded space-y-3">
                  <div className="flex flex-wrap justify-between items-center border-b border-gray-800 pb-2 gap-2">
                    <span className="font-bold text-white text-sm flex items-center gap-2">
                      <ImageIcon size={16} className="text-[#00f3ff]" />
                      <span>{item.title || 'Снимок'}</span>
                    </span>
                    <span className="text-[#00f3ff] uppercase font-bold text-[10px] bg-[#11192e] px-2 py-0.5 rounded border border-[#1e2f55]">
                      ID: {item.id} // {item.code}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-gray-500 block mb-1">КОД ФАЙЛА:</label>
                      <input
                        type="text"
                        value={item.code}
                        onChange={(e) => {
                          const updated = [...caseData.media];
                          updated[idx].code = e.target.value;
                          setCaseData({ ...caseData, media: updated });
                        }}
                        className="dr-input py-1 text-xs font-bold text-[#00f3ff]"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 block mb-1">ЗАГОЛОВОК СНИМКА:</label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const updated = [...caseData.media];
                          updated[idx].title = e.target.value;
                          setCaseData({ ...caseData, media: updated });
                        }}
                        className="dr-input py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 block mb-1">ВРЕМЯ СЪЁМКИ:</label>
                      <input
                        type="text"
                        value={item.time}
                        onChange={(e) => {
                          const updated = [...caseData.media];
                          updated[idx].time = e.target.value;
                          setCaseData({ ...caseData, media: updated });
                        }}
                        className="dr-input py-1 text-xs text-amber-300"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 block mb-1">ИСТОЧНИК / КАМЕРА:</label>
                      <input
                        type="text"
                        value={item.camera}
                        onChange={(e) => {
                          const updated = [...caseData.media];
                          updated[idx].camera = e.target.value;
                          setCaseData({ ...caseData, media: updated });
                        }}
                        className="dr-input py-1 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-gray-500 block mb-1">ТЕГ / КАТЕГОРИЯ:</label>
                      <input
                        type="text"
                        value={item.tag}
                        onChange={(e) => {
                          const updated = [...caseData.media];
                          updated[idx].tag = e.target.value;
                          setCaseData({ ...caseData, media: updated });
                        }}
                        className="dr-input py-1 text-xs text-[#00ff88]"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 block mb-1">ВЕКТОРНАЯ ЗАГЛУШКА (SVG):</label>
                      <select
                        value={item.svgType || 'corpse_trap'}
                        onChange={(e) => {
                          const updated = [...caseData.media];
                          updated[idx].svgType = e.target.value;
                          setCaseData({ ...caseData, media: updated });
                        }}
                        className="dr-input py-1 text-xs bg-[#090c15]"
                      >
                        <option value="corpse_trap">Труп жертвы с капканом</option>
                        <option value="handover_spot">Место передачи капкана (угол склада)</option>
                        <option value="trap_fibers">Макросъёмка: Волокна на зубьях</option>
                        <option value="empty_shelf">Пустая полка в мастерской</option>
                        <option value="security_cam">Общий план камеры</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-500 block mb-1">
                        URL СКРИНШОТА GMOD (ПО ЖЕЛАНИЮ):
                      </label>
                      <input
                        type="text"
                        value={item.customImageUrl || ''}
                        placeholder="https://... или /img/..."
                        onChange={(e) => {
                          const updated = [...caseData.media];
                          updated[idx].customImageUrl = e.target.value;
                          setCaseData({ ...caseData, media: updated });
                        }}
                        className="dr-input py-1 text-xs text-blue-300"
                      />
                    </div>
                  </div>

                  {item.customImageUrl && (
                    <div className="p-2 bg-[#05070e] border border-blue-900/40 rounded flex items-center gap-3">
                      <img
                        src={item.customImageUrl}
                        alt="Предпросмотр"
                        className="w-16 h-12 object-cover rounded border border-gray-700"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <span className="text-[11px] text-gray-400">
                        Предпросмотр скриншота активен. Игроки увидят эту фотографию вместо SVG-схемы.
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="text-gray-500 block mb-1">
                      ОПИСАНИЕ ИЛИ ВОПРОС НАГИТО (ПРИМЕР: «Возможно, в этом месте был передан капкан?...»):
                    </label>
                    <textarea
                      rows={2}
                      value={item.desc}
                      onChange={(e) => {
                        const updated = [...caseData.media];
                        updated[idx].desc = e.target.value;
                        setCaseData({ ...caseData, media: updated });
                      }}
                      className="dr-input py-1 text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={async () => {
                        SoundFX.playClick();
                        await fetch(`/api/admin/media/${item.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', 'x-admin-token': authToken },
                          body: JSON.stringify(item)
                        });
                        showSuccess('Снимок сохранен!');
                      }}
                      className="dr-btn py-1 px-3 text-xs"
                    >
                      Сохранить
                    </button>
                    <button
                      onClick={async () => {
                        SoundFX.playClick();
                        await fetch(`/api/admin/media/${item.id}`, {
                          method: 'DELETE',
                          headers: { 'x-admin-token': authToken }
                        });
                        loadAllAdminData();
                      }}
                      className="dr-btn py-1 px-2 text-xs text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Suspects & Riddles CRUD */}
        {activeTab === 'suspects' && caseData && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-cyber font-bold text-white text-base">
                  УПРАВЛЕНИЕ ПОДОЗРЕВАЕМЫМИ И ЗАГАДКАМИ
                </h2>
                <p className="text-xs font-mono text-gray-400">
                  Настройка досье учеников: маскированные имена, таланты, алиби и загадки, открывающие их карточки.
                </p>
              </div>
              <button
                onClick={async () => {
                  SoundFX.playClick();
                  await fetch('/api/admin/suspects', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'x-admin-token': authToken },
                    body: JSON.stringify({ suspects: caseData.suspects })
                  });
                  showSuccess('Список подозреваемых и загадки сохранены!');
                }}
                className="dr-btn dr-btn-primary py-2 px-5 text-xs font-cyber flex items-center gap-1.5"
              >
                <Save size={14} />
                <span>СОХРАНИТЬ ПОДОЗРЕВАЕМЫХ</span>
              </button>
            </div>

            <div className="space-y-4 font-mono text-xs">
              {(caseData.suspects || []).map((suspect, idx) => (
                <div key={suspect.id || idx} className="p-4 bg-[#0a0d16] border border-[#1b233a] rounded space-y-3">
                  <div className="flex flex-wrap justify-between items-center border-b border-gray-800 pb-2 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-cyber font-bold text-[#00f3ff] text-sm">
                        #{suspect.id} {suspect.realName}
                      </span>
                      <span className="text-gray-400 text-xs">
                        ({suspect.realRole})
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-[#ff2a85] bg-[#22101b] px-2 py-0.5 rounded border border-[#441a32]">
                      {suspect.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-500 block mb-1">РЕАЛЬНОЕ ИМЯ:</label>
                      <input
                        type="text"
                        value={suspect.realName}
                        onChange={(e) => {
                          const updated = [...caseData.suspects];
                          updated[idx].realName = e.target.value;
                          setCaseData({ ...caseData, suspects: updated });
                        }}
                        className="dr-input py-1 text-xs text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 block mb-1">МАСКИРОВАННОЕ ИМЯ (ДО РАЗГАДКИ):</label>
                      <input
                        type="text"
                        value={suspect.maskedName}
                        onChange={(e) => {
                          const updated = [...caseData.suspects];
                          updated[idx].maskedName = e.target.value;
                          setCaseData({ ...caseData, suspects: updated });
                        }}
                        className="dr-input py-1 text-xs text-gray-300"
                      />
                    </div>

                    <div>
                      <label className="text-gray-500 block mb-1">РЕАЛЬНЫЙ ТАЛАНТ / РОЛЬ:</label>
                      <input
                        type="text"
                        value={suspect.realRole}
                        onChange={(e) => {
                          const updated = [...caseData.suspects];
                          updated[idx].realRole = e.target.value;
                          setCaseData({ ...caseData, suspects: updated });
                        }}
                        className="dr-input py-1 text-xs text-[#00ff88]"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 block mb-1">МАСКИРОВАННЫЙ ТАЛАНТ (ДО РАЗГАДКИ):</label>
                      <input
                        type="text"
                        value={suspect.maskedRole}
                        onChange={(e) => {
                          const updated = [...caseData.suspects];
                          updated[idx].maskedRole = e.target.value;
                          setCaseData({ ...caseData, suspects: updated });
                        }}
                        className="dr-input py-1 text-xs text-gray-300"
                      />
                    </div>

                    <div>
                      <label className="text-gray-500 block mb-1">СТАТУС ПОДОЗРЕВАЕМОГО:</label>
                      <input
                        type="text"
                        value={suspect.status}
                        onChange={(e) => {
                          const updated = [...caseData.suspects];
                          updated[idx].status = e.target.value;
                          setCaseData({ ...caseData, suspects: updated });
                        }}
                        className="dr-input py-1 text-xs text-[#ff2a85]"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 block mb-1">АЛИБИ:</label>
                      <input
                        type="text"
                        value={suspect.alibi}
                        onChange={(e) => {
                          const updated = [...caseData.suspects];
                          updated[idx].alibi = e.target.value;
                          setCaseData({ ...caseData, suspects: updated });
                        }}
                        className="dr-input py-1 text-xs"
                      />
                    </div>
                  </div>

                  {/* Puzzle Configuration */}
                  <div className="p-3 bg-[#070912] border border-[#1b233a] rounded space-y-2 mt-2">
                    <span className="text-[10px] font-bold text-[#00f3ff] uppercase tracking-wider block">
                      ЗАГАДКА ДЛЯ РАСКРЫТИЯ КАРТОЧКИ (АРХИВНЫЙ ПРОТОКОЛ):
                    </span>

                    <div>
                      <label className="text-gray-500 block mb-1">ВОПРОС ЗАГАДКИ:</label>
                      <input
                        type="text"
                        value={suspect.puzzle?.question || ''}
                        onChange={(e) => {
                          const updated = [...caseData.suspects];
                          updated[idx].puzzle = { ...updated[idx].puzzle, question: e.target.value };
                          setCaseData({ ...caseData, suspects: updated });
                        }}
                        className="dr-input py-1 text-xs text-amber-300"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-500 block mb-1">ПОДСКАЗКА ДЛЯ ИГРОКА:</label>
                        <input
                          type="text"
                          value={suspect.puzzle?.hint || ''}
                          onChange={(e) => {
                            const updated = [...caseData.suspects];
                            updated[idx].puzzle = { ...updated[idx].puzzle, hint: e.target.value };
                            setCaseData({ ...caseData, suspects: updated });
                          }}
                          className="dr-input py-1 text-xs text-gray-300"
                        />
                      </div>
                      <div>
                        <label className="text-gray-500 block mb-1">
                          ВАРИАНТЫ ОТВЕТОВ (ЧЕРЕЗ ЗАПЯТУЮ):
                        </label>
                        <input
                          type="text"
                          value={(suspect.puzzle?.answers || []).join(', ')}
                          onChange={(e) => {
                            const updated = [...caseData.suspects];
                            const ans = e.target.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
                            updated[idx].puzzle = { ...updated[idx].puzzle, answers: ans };
                            setCaseData({ ...caseData, suspects: updated });
                          }}
                          className="dr-input py-1 text-xs text-[#00ff88] font-bold uppercase"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Hints Management */}
        {activeTab === 'hints' && caseData && (
          <div className="space-y-4">
            <h2 className="font-cyber font-bold text-white text-base">
              УПРАВЛЕНИЕ КОСВЕННЫМИ ПОДСКАЗКАМИ
            </h2>
            <div className="space-y-3 font-mono text-xs">
              {(caseData.hints || []).map((hint, idx) => (
                <div key={idx} className="p-4 bg-[#0a0d16] border border-[#1b233a] rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={hint.title}
                      onChange={(e) => {
                        const updated = [...caseData.hints];
                        updated[idx].title = e.target.value;
                        setCaseData({ ...caseData, hints: updated });
                      }}
                      className="dr-input py-1 text-xs w-64 text-[#00f3ff] font-bold"
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hint.active}
                        onChange={(e) => {
                          const updated = [...caseData.hints];
                          updated[idx].active = e.target.checked;
                          setCaseData({ ...caseData, hints: updated });
                        }}
                        className="rounded accent-[#00f3ff]"
                      />
                      <span className="text-gray-300">АКТИВНА ДЛЯ ИГРОКОВ</span>
                    </label>
                  </div>

                  <textarea
                    rows={2}
                    value={hint.text}
                    onChange={(e) => {
                      const updated = [...caseData.hints];
                      updated[idx].text = e.target.value;
                      setCaseData({ ...caseData, hints: updated });
                    }}
                    className="dr-input py-1 text-xs"
                  />
                </div>
              ))}

              <div className="flex justify-end pt-2">
                <button
                  onClick={async () => {
                    SoundFX.playClick();
                    await fetch('/api/admin/hints', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', 'x-admin-token': authToken },
                      body: JSON.stringify({ hints: caseData.hints })
                    });
                    showSuccess('Подсказки обновлены!');
                  }}
                  className="dr-btn dr-btn-primary py-2 px-5 text-xs font-cyber"
                >
                  СОХРАНИТЬ ПОДСКАЗКИ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Locks Management */}
        {activeTab === 'locks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-cyber font-bold text-white text-base">
                  АКТИВНЫЕ 10-МИНУТНЫЕ БЛОКИРОВКИ IP
                </h2>
                <p className="text-xs font-mono text-gray-400">
                  Здесь отображаются узлы игроков, заблокированные за неверную реконструкцию имени
                </p>
              </div>

              {locks.length > 0 && (
                <button
                  onClick={handleClearAllLocks}
                  className="dr-btn py-1.5 px-4 text-xs font-cyber border-red-500 text-red-400 hover:bg-red-500/20"
                >
                  ОЧИСТИТЬ ВСЕ БЛОКИРОВКИ
                </button>
              )}
            </div>

            {locks.length > 0 ? (
              <div className="space-y-2 font-mono text-xs">
                {locks.map((item) => (
                  <div
                    key={item.ip}
                    className="p-4 bg-[#140b15] border border-[#ff2a85]/50 rounded flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Lock size={14} className="text-[#ff2a85]" />
                        <span className="font-bold text-white text-sm">{item.ip}</span>
                        <span className="text-[#ff2a85] bg-[#ff2a85]/20 px-2 py-0.5 rounded text-[11px]">
                          ОСТАЛОСЬ: {Math.floor(item.remainingSeconds / 60)}:
                          {String(item.remainingSeconds % 60).padStart(2, '0')} МИН
                        </span>
                      </div>
                      <div className="text-gray-400 text-[11px] mt-1">
                        Причина: {item.reason} | Попытка #{item.attempts}
                      </div>
                    </div>

                    <button
                      onClick={() => handleUnlockIp(item.ip)}
                      className="dr-btn dr-btn-cyan py-1.5 px-3 text-xs font-mono flex items-center gap-1.5"
                    >
                      <Unlock size={13} />
                      <span>РАЗБЛОКИРОВАТЬ IP</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 bg-[#0a0d16] border border-gray-800 text-center font-mono text-xs text-gray-400">
                <CheckCircle2 size={32} className="mx-auto text-[#00ff88] mb-2" />
                <span>В данный момент нет заблокированных IP-адресов.</span>
              </div>
            )}
          </div>
        )}

        {/* Tab: Active Players */}
        {activeTab === 'players' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-cyber font-bold text-white text-base flex items-center gap-2">
                <UserCheck className="text-[#00f3ff]" size={18} />
                <span>СПИСОК УЧАСТНИКОВ СУДЕБНОЙ СЕССИИ ({playerSessions.length})</span>
              </h2>
              <button
                onClick={loadAllAdminData}
                className="dr-btn py-1.5 px-3 text-xs font-mono flex items-center gap-1.5"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                <span>ОБНОВИТЬ СПИСОК</span>
              </button>
            </div>

            {playerSessions.length > 0 ? (
              <div className="cyber-panel bg-[#090c14] border border-[#1e2740] overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="bg-[#0f1424] text-gray-400 border-b border-[#1f2945]">
                      <th className="p-3">ИМЯ УЧАСТНИКА</th>
                      <th className="p-3">IP АДРЕС</th>
                      <th className="p-3">СТАТУС В СЕССИИ</th>
                      <th className="p-3">ПОДОЗРЕВАЕМЫЕ</th>
                      <th className="p-3">ДЕБАТЫ</th>
                      <th className="p-3">ПОСЛЕДНЯЯ АКТИВНОСТЬ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#151c2e]">
                    {playerSessions.map((player) => (
                      <tr key={player.sessionId} className="hover:bg-[#111728]">
                        <td className="p-3 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded bg-[#00f3ff]/15 border border-[#00f3ff]/40 text-[#00f3ff] font-bold">
                            {player.playerName}
                          </span>
                        </td>
                        <td className="p-3 text-gray-300 font-mono whitespace-nowrap">
                          {player.ip}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {player.state === 'SOLVED' ? (
                            <span className="px-2 py-0.5 rounded bg-[#00ff88]/20 border border-[#00ff88] text-[#00ff88] font-bold">
                              РАСКРЫТО (ПОБЕДА)
                            </span>
                          ) : player.state === 'RECOVERED' ? (
                            <span className="px-2 py-0.5 rounded bg-[#00f3ff]/20 border border-[#00f3ff] text-[#00f3ff]">
                              В РАССЛЕДОВАНИИ
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500 text-amber-400">
                              АВТОРИЗОВАН
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-gray-300 whitespace-nowrap">
                          {player.unlockedSuspectsCount} открыто
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {player.debateResolved ? (
                            <span className="text-[#00ff88] font-bold">ПРОЙДЕНЫ</span>
                          ) : (
                            <span className="text-gray-500">В процессе</span>
                          )}
                        </td>
                        <td className="p-3 text-gray-400 whitespace-nowrap">
                          {player.updatedAt ? new Date(player.updatedAt).toLocaleTimeString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 bg-[#0a0d16] border border-gray-800 text-center font-mono text-xs text-gray-400">
                <Users size={32} className="mx-auto text-gray-500 mb-2" />
                <span>Пока никто не зашёл в текущую судебную сессию.</span>
              </div>
            )}
          </div>
        )}

        {/* Tab: Audit Log */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <h2 className="font-cyber font-bold text-white text-base">
              ЖУРНАЛ ДЕЙСТВИЙ И ПОПЫТОК (AUDIT LOG)
            </h2>
            <div className="cyber-panel bg-[#090c14] border border-[#1e2740] max-h-96 overflow-y-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="bg-[#0f1424] text-gray-400 border-b border-[#1f2945]">
                    <th className="p-2.5">ВРЕМЯ</th>
                    <th className="p-2.5">ИГРОК</th>
                    <th className="p-2.5">IP УЗЛА</th>
                    <th className="p-2.5">ДЕЙСТВИЕ</th>
                    <th className="p-2.5">ПОДРОБНОСТИ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#151c2e]">
                  {audit.map((entry) => (
                    <tr key={entry.id || entry.time} className="hover:bg-[#111728]">
                      <td className="p-2.5 text-gray-400 whitespace-nowrap">
                        {new Date(entry.time).toLocaleTimeString()}
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        {entry.playerName ? (
                          <span className="px-2 py-0.5 rounded bg-[#00f3ff]/15 border border-[#00f3ff]/40 text-[#00f3ff] font-bold">
                            {entry.playerName}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="p-2.5 text-[#00f3ff] whitespace-nowrap">
                        {entry.ip}
                      </td>
                      <td className="p-2.5 text-white font-bold whitespace-nowrap">
                        {entry.action}
                      </td>
                      <td className="p-2.5 text-gray-300">
                        {entry.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reset Confirmation Modal */}
        {isResetModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#0b0e17] border border-[#f59e0b] p-6 rounded-lg max-w-md w-full space-y-4 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
              <div className="flex items-center gap-3 text-[#f59e0b]">
                <AlertTriangle size={24} />
                <h3 className="font-cyber font-bold text-base text-white">ПОДТВЕРЖДЕНИЕ СБРОСА СЕССИИ</h3>
              </div>
              <p className="text-xs font-mono text-gray-300 leading-relaxed">
                Вы собираетесь подготовить терминал к <strong className="text-amber-400">НОВОЙ ИГРЕ</strong>.
              </p>
              <ul className="text-xs font-mono text-gray-400 space-y-1.5 list-disc list-inside bg-[#06080e] p-3 rounded border border-[#1b233a]">
                <li>Очищаются все активные сессии игроков (возврат к экрану авторизации)</li>
                <li>Снимаются все 10-минутные блокировки IP адресов</li>
                <li>Аннулируются ранее выданные криптографические сертификаты</li>
                <li>Все настроенные параметры дела, улики и фотографии <strong className="text-emerald-400">сохраняются</strong></li>
              </ul>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="dr-btn py-1.5 px-4 text-xs font-mono text-gray-300"
                  disabled={isResetting}
                >
                  ОТМЕНА
                </button>
                <button
                  type="button"
                  onClick={handleResetGameSession}
                  disabled={isResetting}
                  className="dr-btn py-1.5 px-5 text-xs font-cyber font-bold text-black bg-[#f59e0b] hover:bg-[#fbbf24] shadow-[0_0_15px_rgba(245,158,11,0.4)] disabled:opacity-50"
                >
                  {isResetting ? 'СБРОС...' : 'ПОДТВЕРДИТЬ СБРОС'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
