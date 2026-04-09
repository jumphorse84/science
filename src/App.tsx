/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Microscope, MonitorPlay, Wifi, Radio, ShieldCheck, ArrowLeft, ChevronRight, BookOpen, Settings,
  Pencil, GripVertical, X, Save, Plus, Trash2, Paperclip, FileText, UploadCloud, Download,
  Search, ExternalLink, User, CalendarDays, MessageSquare, CheckCircle2, PlayCircle, Circle,
  Send, Moon, Sun, Database, Laptop, Users, Lightbulb, PenTool, Globe, Cpu, Video, Camera, Music,
  Palette, FileBox, Sprout, Zap, Kanban, LayoutGrid, Clock, Activity, ThumbsUp, Eye, PartyPopper,
  Bell, Calendar, MessageCircle, Star, DownloadCloud, CalendarRange, ChevronLeft, Link2, Menu,
  Utensils, StickyNote, Edit3, Sparkles
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getDatabase, ref as dbRef, onValue, onDisconnect, set, serverTimestamp } from 'firebase/database';

// --- Helper Functions ---
const isNewTask = (createdAt: number) => {
  if (!createdAt) return false;
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
  return (Date.now() - createdAt) < THREE_DAYS;
};

const getDaysUntilDue = (dueDateStr: string) => {
  if (!dueDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dueDateStr);
  dueDate.setHours(0, 0, 0, 0);
  const diffTime = dueDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getOffsetDate = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const getGreeting = () => {
  const now = new Date();
  const day = now.getDay(); 
  const hour = now.getHours();

  if (hour >= 11 && hour <= 13) return "오전 업무 끝! 맛있는 점심 드세요 🍱";
  if (hour >= 17 && hour <= 21) return "늦게까지 고생이 많으십니다. 얼른 퇴근하세요! 🌙";
  if (hour >= 22 || hour <= 5) return "아직도 안 주무시나요?! 내일의 체력을 위해 주무세요 😴";
  if (day === 1 && hour < 12) return "주말은 왜 이리 짧은 걸까요... 월요병 극복! ☕";
  if (day === 3) return "일주일의 절반을 넘겼습니다! 조금만 더 힘내세요! 💪";
  if (day === 5 && hour >= 13) return "퇴근이 얼마 남지 않았습니다! 불금 파이팅! 🚀";
  if (day === 0 || day === 6) return "주말에도 열일하시는 선생님... 눈물 닦고 파이팅! 😂";
  
  const randomGreetings = [
    "오늘도 평화로운 과학정보부입니다. 파이팅! ✨",
    "디벗 고장 없이 무사한 하루가 되기를 기원합니다 🙏",
    "선생님의 열정에 언제나 감사드립니다! 💖",
    "스트레칭 한 번 쭉~ 하고 시작해볼까요? 🤸"
  ];
  return randomGreetings[Math.floor(Math.random() * randomGreetings.length)];
};

const renderTextWithLinks = (text: string) => {
  if (!text) return text;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return <a key={i} href={part} target="_blank" rel="noreferrer" className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline font-medium">{part}</a>;
    }
    return <span key={i}>{part}</span>;
  });
};

const availableIcons: Record<string, any> = {
  Microscope, MonitorPlay, Wifi, Radio, ShieldCheck, BookOpen, Database, Laptop, Users, Lightbulb, 
  PenTool, Globe, Cpu, Video, Camera, Music, Palette, FileBox, Sprout, Zap, Settings
};

const colorThemes = [
  { id: 'blue', color: 'bg-white hover:bg-blue-50/50 border-slate-200 text-slate-700 dark:bg-gray-900 dark:hover:bg-blue-900/20 dark:border-gray-800 dark:text-slate-300', iconBg: 'bg-blue-100 dark:bg-blue-900/50', preview: 'bg-blue-500' },
  { id: 'indigo', color: 'bg-white hover:bg-indigo-50/50 border-slate-200 text-slate-700 dark:bg-gray-900 dark:hover:bg-indigo-900/20 dark:border-gray-800 dark:text-slate-300', iconBg: 'bg-indigo-100 dark:bg-indigo-900/50', preview: 'bg-indigo-500' },
  { id: 'emerald', color: 'bg-white hover:bg-emerald-50/50 border-slate-200 text-slate-700 dark:bg-gray-900 dark:hover:bg-emerald-900/20 dark:border-gray-800 dark:text-slate-300', iconBg: 'bg-emerald-100 dark:bg-emerald-900/50', preview: 'bg-emerald-500' },
  { id: 'amber', color: 'bg-white hover:bg-amber-50/50 border-slate-200 text-slate-700 dark:bg-gray-900 dark:hover:bg-amber-900/20 dark:border-gray-800 dark:text-slate-300', iconBg: 'bg-amber-100 dark:bg-amber-900/50', preview: 'bg-amber-500' },
  { id: 'rose', color: 'bg-white hover:bg-rose-50/50 border-slate-200 text-slate-700 dark:bg-gray-900 dark:hover:bg-rose-900/20 dark:border-gray-800 dark:text-slate-300', iconBg: 'bg-rose-100 dark:bg-rose-900/50', preview: 'bg-rose-500' },
  { id: 'slate', color: 'bg-white hover:bg-slate-50/50 border-slate-200 text-slate-700 dark:bg-gray-900 dark:hover:bg-slate-800 dark:border-gray-800 dark:text-slate-300', iconBg: 'bg-slate-100 dark:bg-slate-800', preview: 'bg-slate-500' },
  { id: 'purple', color: 'bg-white hover:bg-purple-50/50 border-slate-200 text-slate-700 dark:bg-gray-900 dark:hover:bg-purple-900/20 dark:border-gray-800 dark:text-slate-300', iconBg: 'bg-purple-100 dark:bg-purple-900/50', preview: 'bg-purple-500' },
  { id: 'pink', color: 'bg-white hover:bg-pink-50/50 border-slate-200 text-slate-700 dark:bg-gray-900 dark:hover:bg-pink-900/20 dark:border-gray-800 dark:text-slate-300', iconBg: 'bg-pink-100 dark:bg-pink-900/50', preview: 'bg-pink-500' }
];

const statusMap: Record<string, any> = {
  pending: { label: '진행 전', color: 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700', icon: <Circle className="w-3.5 h-3.5 mr-1"/> },
  in_progress: { label: '진행 중', color: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800', icon: <PlayCircle className="w-3.5 h-3.5 mr-1"/> },
  completed: { label: '완료', color: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800', icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1"/> }
};

const themes = [
  { id: 'dark', name: '다크', bg: '#0f172a', card: '#1e293b', accent: '#3b82f6', text: '#f8fafc' },
  { id: 'light', name: '라이트', bg: '#f8fafc', card: '#ffffff', accent: '#2563eb', text: '#1e293b' },
  { id: 'pastel', name: '파스텔', bg: '#fdf4ff', card: '#ffffff', accent: '#d946ef', text: '#4a044e' },
  { id: 'navy', name: '네이비', bg: '#020617', card: '#0f172a', accent: '#60a5fa', text: '#f1f5f9' },
  { id: 'forest', name: '포레스트', bg: '#064e3b', card: '#065f46', accent: '#34d399', text: '#ecfdf5' },
  { id: 'sunset', name: '선셋', bg: '#451a03', card: '#78350f', accent: '#fbbf24', text: '#fffbeb' },
  { id: 'mono', name: '모노', bg: '#000000', card: '#171717', accent: '#ffffff', text: '#ffffff' },
  { id: 'notion', name: '노션', bg: '#ffffff', card: '#f7f6f3', accent: '#37352f', text: '#37352f' },
  { id: 'notion_dark', name: '노션 다크', bg: '#191919', card: '#202020', accent: '#ffffff', text: '#ffffff' },
  { id: 'craft', name: '크래프트', bg: '#f4f1ea', card: '#ffffff', accent: '#4b483f', text: '#4b483f' },
  { id: 'craft_dark', name: '크래프트 다크', bg: '#2d2c28', card: '#35342f', accent: '#e6e4d9', text: '#e6e4d9' },
  { id: 'custom', name: '커스텀', bg: '#f8fafc', card: '#ffffff', accent: '#2563eb', text: '#1e293b' },
];

const fonts = [
  { id: 'Noto Sans KR', name: 'Noto Sans KR', desc: '깔끔한 기본 고딕체' },
  { id: 'Pretendard', name: '프리텐다드', desc: '모던하고 세련된 서체' },
  { id: 'IBM Plex Sans KR', name: 'IBM Plex Sans KR', desc: '정돈된 기술적 서체' },
  { id: 'Nanum Gothic', name: '나눔고딕', desc: '부드러운 한글 고딕체' },
  { id: 'Nanum Square', name: '나눔스퀘어', desc: '깔끔한 네모꼴 서체' },
  { id: 'Gowun Dodum', name: '고운돋움', desc: '둥글고 친근한 서체' },
];

const TEACHERS = ['이홍규', '김서연', '최유선', '이지숙'];
const quickLinks = [
  { name: 'AS 게시판', url: 'https://seokgwanas.web.app/' },
  { name: 'K-에듀파인', url: 'https://klef.sen.go.kr' },
  { name: '나이스(NEIS)', url: 'https://neis.sen.go.kr' },
  { name: '서울시교육청', url: 'https://www.sen.go.kr' },
  { name: '학교 홈페이지', url: '#' },
];

const initialSchedules = [
  { month: 3, content: '과학정보부 연간 계획 기안 / 정보화기자재 배포 / 과학실험실 안전 점검' },
  { month: 4, content: '과학의 달 행사 (교내 과학탐구대회) / 영재학급 개강' },
  { month: 5, content: '정보통신윤리교육 주간 운영' },
  { month: 7, content: '1학기 과학실 및 컴퓨터실 점검 / 노후 기자재 폐기 신청' },
  { month: 10, content: '하반기 정보보안 및 개인정보보호 자체 감사' },
  { month: 12, content: '내년도 과학정보부 예산안 편성 요구서 제출' },
];

const fallbackTaskData = [
  {
    id: 'science_edu', title: '과학·환경 교육 및 행사', assignee: '김서연 (기획) / 이홍규 (부장)', iconName: 'Microscope', color: colorThemes[0].color, iconBg: colorThemes[0].iconBg, description: '과학행사, 영재, 생태전환, 기후행동 및 발명/메이커 교육',
    generalNote: '생태전환교육 자료실: https://www.sen.go.kr\n영재학급 시스템 로그인: admin / password123',
    subTasks: [
      { id: 's1', name: '과학행사 및 영재', detail: '교내 과학행사 기획 및 영재학급 운영 (담당: 김서연)', status: 'pending', isPinned: true, files: [], createdAt: Date.now() - 1000000000, dueDate: getOffsetDate(2) },
      { id: 's2', name: '생태전환교육 및 기후행동 365', detail: '생태전환교육 및 기후행동 365 업무 추진 (담당: 김서연)', status: 'pending', isPinned: false, files: [], createdAt: Date.now() - 1000000000, dueDate: '' },
    ], memos: []
  },
  {
    id: 'device_mgmt', title: '정보기기 및 디벗 관리', assignee: '최유선 (정보계)', iconName: 'MonitorPlay', color: colorThemes[2].color, iconBg: colorThemes[2].iconBg, description: '디벗, 전자칠판, 충전함 및 스마트 기자재 관리',
    generalNote: '디벗 수리 접수처: https://as.example.com\n대표 번호: 1588-0000',
    subTasks: [
      { id: 'd1', name: '디벗 배부 및 회수', detail: '학생용 스마트기기(디벗) 배부 및 회수 총괄 관리 (담당: 최유선)', status: 'completed', isPinned: false, files: [], createdAt: Date.now() - 1000000000, dueDate: '' },
      { id: 'd2', name: '디벗 업무/수업 지원 및 수리', detail: '디벗 업무 지원(이홍규) 및 수업 지원/수리 연계(이지숙)', status: 'in_progress', isPinned: false, files: [], createdAt: Date.now() - 1000000000, dueDate: getOffsetDate(0) },
    ], memos: []
  }
];

const fallbackEquipmentData = [
  { id: 'eq1', name: '학생용 태블릿 (디벗) - 1번 충전함', category: '정보기기', status: 'available', borrower: '', returnDate: '', history: [] },
  { id: 'eq2', name: '과학실 현미경 A-1', category: '과학기자재', status: 'borrowed', borrower: '김서연', returnDate: getOffsetDate(3), history: [{ date: new Date().toLocaleDateString(), user: '김서연', action: '대여' }] },
  { id: 'eq3', name: '무선 마이크 세트', category: '음향기기', status: 'available', borrower: '', returnDate: '', history: [] },
  { id: 'eq4', name: 'VR 헤드셋 (Meta Quest)', category: '정보기기', status: 'available', borrower: '', returnDate: '', history: [] },
];

const providedConfig = {
  apiKey: "AIzaSyD-Lm0lR0L83_xj96TS4JFBvifpwusYFIk",
  authDomain: "seokgwanscience.firebaseapp.com",
  projectId: "seokgwanscience",
  storageBucket: "seokgwanscience.firebasestorage.app",
  messagingSenderId: "1003660471025",
  appId: "1:1003660471025:web:636fb93d4d204b92ced750",
  measurementId: "G-QM0P3NJPEE"
};

// @ts-ignore
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : providedConfig;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
// @ts-ignore
const appId = typeof __app_id !== 'undefined' ? __app_id : 'seokgwan-portal';
// @ts-ignore
const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.1';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('seokgwan-theme');
      if (saved !== null) return saved === 'dark';
    } catch (e) {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [localUserName, setLocalUserName] = useState(() => {
    try {
      const name = localStorage.getItem('seokgwan-username');
      return name || '';
    } catch (e) { return ''; }
  });

  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return !localStorage.getItem('seokgwan-username');
    } catch (e) { return true; }
  });

  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>(fallbackTaskData);
  const [schedules, setSchedules] = useState<any[]>(initialSchedules);
  const [equipment, setEquipment] = useState<any[]>(fallbackEquipmentData);
  const [activityHistory, setActivityHistory] = useState<any[]>([]);
  
  const [userStatuses, setUserStatuses] = useState<Record<string, string>>({});
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isStatusEditOpen, setIsStatusEditOpen] = useState(false);
  const [myStatusText, setMyStatusText] = useState('');
  const [newNameInput, setNewNameInput] = useState('');
  
  const [onlineUsersList, setOnlineUsersList] = useState<string[]>([localUserName]);
  
  const [triggerConfetti, setTriggerConfetti] = useState(false);
  const [greeting, setGreeting] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [updateNotice, setUpdateNotice] = useState<{ previousVersion: string; currentVersion: string } | null>(null);
  
  const [memos, setMemos] = useState<any[]>([
    { id: '1', x: 50, y: 50, color: '#fef08a', text: '더블 클릭하여 메모를 작성하세요' }
  ]);
  const memoColors = ['#fef08a', '#fbcfe8', '#bbf7d0', '#bfdbfe'];
  const [selectedMemoColor, setSelectedMemoColor] = useState('#fef08a');
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const editingMemoIdRef = useRef<string | null>(null);
  useEffect(() => { editingMemoIdRef.current = editingMemoId; }, [editingMemoId]);

  const [isWidgetSettingsOpen, setIsWidgetSettingsOpen] = useState(false);
  const [isCategorySettingsOpen, setIsCategorySettingsOpen] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryForm, setNewCategoryForm] = useState({
    title: '',
    assignee: '',
    description: '',
    iconName: 'Microscope',
    color: colorThemes[0].color,
    iconBg: colorThemes[0].iconBg
  });
  const [widgetStyle, setWidgetStyle] = useState(() => {
    try {
      const saved = localStorage.getItem('seokgwan-widget-style');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      themeId: 'light',
      bgColor: '#f8fafc',
      cardColor: '#ffffff',
      accentColor: '#2563eb',
      textColor: '#1e293b',
      bgOpacity: 100,
      cardOpacity: 100,
      bgImage: '',
      cardRoundness: 24,
      cardSpacing: 16,
      showBorder: true,
      borderThickness: 1,
      borderColor: '#e2e8f0',
      shadow: 'soft', // none, soft, medium, hard
      fontFamily: 'Pretendard',
      fontSize: 'medium', // small, medium, large, xlarge
      dashboardFontScale: 100
    };
  });

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
  };

  useEffect(() => {
    localStorage.setItem('seokgwan-widget-style', JSON.stringify(widgetStyle));
    
    // Apply styles to root
    const root = document.documentElement;
    root.style.setProperty('--portal-bg', widgetStyle.bgColor);
    root.style.setProperty('--portal-bg-rgb', hexToRgb(widgetStyle.bgColor));
    root.style.setProperty('--portal-card', widgetStyle.cardColor);
    root.style.setProperty('--portal-card-rgb', hexToRgb(widgetStyle.cardColor));
    root.style.setProperty('--portal-accent', widgetStyle.accentColor);
    root.style.setProperty('--portal-accent-rgb', hexToRgb(widgetStyle.accentColor));
    root.style.setProperty('--portal-text', widgetStyle.textColor);
    root.style.setProperty('--portal-text-rgb', hexToRgb(widgetStyle.textColor));
    root.style.setProperty('--portal-bg-opacity', (widgetStyle.bgOpacity / 100).toString());
    root.style.setProperty('--portal-card-opacity', (widgetStyle.cardOpacity / 100).toString());
    root.style.setProperty('--portal-roundness', `${widgetStyle.cardRoundness}px`);
    root.style.setProperty('--portal-spacing', `${widgetStyle.cardSpacing}px`);
    root.style.setProperty('--portal-border-width', widgetStyle.showBorder ? `${widgetStyle.borderThickness}px` : '0px');
    root.style.setProperty('--portal-border-color', widgetStyle.borderColor);
    root.style.setProperty('--portal-font', widgetStyle.fontFamily);
    root.style.setProperty('--portal-font-scale', (widgetStyle.dashboardFontScale / 100).toString());
    
    const fontSizeMap: Record<string, string> = {
      small: '12px',
      medium: '14px',
      large: '16px',
      xlarge: '18px'
    };
    root.style.setProperty('--portal-font-size', fontSizeMap[widgetStyle.fontSize] || '14px');

  }, [widgetStyle]);

  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [activeCategory, setActiveCategory] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  
  const [isEditingGeneralNote, setIsEditingGeneralNote] = useState(false);
  const [tempGeneralNote, setTempGeneralNote] = useState('');

  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [inlineEditingSubTaskIndex, setInlineEditingSubTaskIndex] = useState<number | null>(null);
  const [tempSubTask, setTempSubTask] = useState<any>(null);
  const [subTaskToDelete, setSubTaskToDelete] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newMemoText, setNewMemoText] = useState('');
  const [borrowingEq, setBorrowingEq] = useState<any>(null);
  const [borrowDate, setBorrowDate] = useState(getOffsetDate(0));
  const [borrowerName, setBorrowerName] = useState(localUserName);
  const [isAddingEq, setIsAddingEq] = useState(false);
  const [newEqName, setNewEqName] = useState('');
  const [newEqCategory, setNewEqCategory] = useState('정보기기');

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    setGreeting(getGreeting());
    const initAuth = async () => {
      try {
        // @ts-ignore
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          // @ts-ignore
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) { console.error("Auth failed:", error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    try {
      const versionStorageKey = 'science-desktop-last-version';
      const previousVersion = localStorage.getItem(versionStorageKey);
      if (previousVersion && previousVersion !== appVersion) {
        setUpdateNotice({ previousVersion, currentVersion: appVersion });
      }
      localStorage.setItem(versionStorageKey, appVersion);
    } catch (error) {
      console.warn('Version check failed:', error);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'portalData', 'main');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.categories) setCategories(data.categories);
        if (data.schedules) setSchedules(data.schedules);
        if (data.equipment) setEquipment(data.equipment);
        if (data.history) setActivityHistory(data.history);
        if (data.userStatuses) setUserStatuses(data.userStatuses);
        if (data.memos) {
          setMemos(prev => {
            const currentEditingId = editingMemoIdRef.current;
            return data.memos.map((newMemo: any) => {
              if (newMemo.id === currentEditingId) {
                const localMemo = prev.find(m => m.id === currentEditingId);
                return localMemo ? { ...newMemo, text: localMemo.text } : newMemo;
              }
              return newMemo;
            });
          });
        }
      } else {
        let recoveredCategories = fallbackTaskData;
        let recoveredSchedules = initialSchedules;
        let recoveredEquipment = fallbackEquipmentData;
        let initialMemos = [
          { id: '1', x: 50, y: 50, color: '#fef08a', text: '업무 공용 메모장입니다. 더블 클릭하여 내용을 작성하세요.' }
        ];
        try {
          const localCats = localStorage.getItem('seokgwan-tasks-v3');
          if (localCats) recoveredCategories = JSON.parse(localCats);
        } catch (e) { console.error('Migration failed'); }
        
        setCategories(recoveredCategories);
        setMemos(initialMemos);
        setDoc(docRef, { 
          categories: recoveredCategories, 
          schedules: recoveredSchedules, 
          equipment: recoveredEquipment, 
          history: [], 
          userStatuses: {},
          memos: initialMemos
        }).catch(e => console.warn(e));
      }
    }, (error) => console.error("Firestore 에러:", error));
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    let unsubConnected: any;
    let unsubStatus: any;
    let myStatusRef: any;

    try {
      const rtdb = getDatabase(app);
      myStatusRef = dbRef(rtdb, `status/${localUserName}`);
      const connectedRef = dbRef(rtdb, '.info/connected');

      unsubConnected = onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
          const onDisconnectRef = onDisconnect(myStatusRef);
          onDisconnectRef.set({ state: 'offline', last_changed: serverTimestamp() }).then(() => {
            set(myStatusRef, { state: 'online', last_changed: serverTimestamp() }).catch(e => console.warn("RTDB Set error:", e));
          }).catch(err => {
            console.warn("Realtime DB Permission Denied (가상 접속자로 대체합니다)", err);
          });
        }
      }, (error) => {
        console.warn("RTDB Connection check error:", error);
      });

      const allStatusRef = dbRef(rtdb, 'status');
      unsubStatus = onValue(allStatusRef, (snap) => {
        if (snap.exists()) {
          const statuses = snap.val();
          const online: string[] = [];
          for (const [name, data] of Object.entries(statuses)) {
            // @ts-ignore
            if (data.state === 'online') online.push(name);
          }
          if (!online.includes(localUserName)) online.push(localUserName);
          setOnlineUsersList(Array.from(new Set(online)));
        } else {
          setOnlineUsersList([localUserName]);
        }
      }, (error) => {
        console.warn("RTDB Read Error:", error);
        setOnlineUsersList([localUserName, ...TEACHERS.filter(t => t !== localUserName).slice(0, 2)]);
      });

    } catch (e) {
      console.warn('Realtime Database 오류. 가상 접속자를 표시합니다.', e);
      setOnlineUsersList([localUserName, ...TEACHERS.filter(t => t !== localUserName).slice(0, 2)]);
    }

    return () => {
      if (myStatusRef) {
        set(myStatusRef, { state: 'offline', last_changed: serverTimestamp() }).catch(e => console.warn(e));
      }
      if (unsubConnected) unsubConnected();
      if (unsubStatus) unsubStatus();
    };
  }, [localUserName]);

  const updatePortalData = async (newCategories: any[], actionMsg: string | null = null, newEquipment: any[] | null = null, newMemos: any[] | null = null) => {
    setCategories(newCategories);
    const finalEquipment = newEquipment || equipment;
    if (newEquipment) setEquipment(newEquipment);
    const finalMemos = newMemos || memos;
    if (newMemos) setMemos(newMemos);
    
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'portalData', 'main');
      let newHistory = [...activityHistory];
      if (actionMsg) {
        const historyItem = { id: Date.now(), user: localUserName, action: actionMsg, time: new Date().toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }) };
        newHistory = [historyItem, ...activityHistory].slice(0, 30);
        setActivityHistory(newHistory);
      }
      await setDoc(docRef, { 
        categories: newCategories, 
        history: newHistory, 
        equipment: finalEquipment,
        memos: finalMemos
      }, { merge: true });
    } catch (e) { console.error("Firestore 저장 실패:", e); }
  };

  const handleMemoUpdate = (newMemos: any[]) => {
    updatePortalData(categories, null, null, newMemos);
  };

  const handleBorrowEquipment = (eqId: string, borrower: string, returnDate: string) => {
    const updatedEquipment = equipment.map(eq => {
      if (eq.id === eqId) {
        const newHistory = [{ date: new Date().toLocaleDateString(), user: borrower, action: '대여' }, ...(eq.history || [])];
        return { ...eq, status: 'borrowed', borrower, returnDate, history: newHistory.slice(0, 10) };
      }
      return eq;
    });
    updatePortalData(categories, `기자재 '${equipment.find(e => e.id === eqId)?.name}' 대여 (대여자: ${borrower})`, updatedEquipment);
  };

  const handleReturnEquipment = (eqId: string) => {
    const updatedEquipment = equipment.map(eq => {
      if (eq.id === eqId) {
        const newHistory = [{ date: new Date().toLocaleDateString(), user: localUserName, action: '반납' }, ...(eq.history || [])];
        return { ...eq, status: 'available', borrower: '', returnDate: '', history: newHistory.slice(0, 10) };
      }
      return eq;
    });
    updatePortalData(categories, `기자재 '${equipment.find(e => e.id === eqId)?.name}' 반납`, updatedEquipment);
  };

  const handleAddEquipment = (name: string, category: string) => {
    const newEq = {
      id: `eq_${Date.now()}`,
      name,
      category,
      status: 'available',
      borrower: '',
      returnDate: '',
      history: []
    };
    const updatedEquipment = [...equipment, newEq];
    updatePortalData(categories, `새 기자재 '${name}' 등록`, updatedEquipment);
  };

  const handleDeleteEquipment = (eqId: string) => {
    const updatedEquipment = equipment.filter(eq => eq.id !== eqId);
    updatePortalData(categories, `기자재 삭제`, updatedEquipment);
  };

  const updateMyStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    const newStatuses = { ...userStatuses, [localUserName]: myStatusText };
    setUserStatuses(newStatuses);
    setIsStatusEditOpen(false);
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'portalData', 'main');
      await setDoc(docRef, { userStatuses: newStatuses }, { merge: true });
    } catch(e) { console.error(e); }
  };

  const handleConfetti = () => {
    setTriggerConfetti(true);
    setTimeout(() => setTriggerConfetti(false), 2500);
  };

  const handleAddCategory = () => {
    if (!newCategoryForm.title.trim()) return;
    
    const newCategory = {
      ...newCategoryForm,
      id: `cat_${Date.now()}`,
      subTasks: [],
      memos: [],
      generalNote: ''
    };
    
    const updatedCategories = [...categories, newCategory];
    updatePortalData(updatedCategories, `새 부서 업무 '${newCategory.title}' 추가`);
    setIsAddingCategory(false);
    setNewCategoryForm({
      title: '',
      assignee: '',
      description: '',
      iconName: 'Microscope',
      color: colorThemes[0].color,
      iconBg: colorThemes[0].iconBg
    });
  };

  const handleDeleteCategory = (catId: string) => {
    const catToDelete = categories.find(c => c.id === catId);
    if (!catToDelete) return;
    
    const updatedCategories = categories.filter(c => c.id !== catId);
    updatePortalData(updatedCategories, `부서 업무 '${catToDelete.title}' 삭제`);
    if (activeCategory?.id === catId) setActiveCategory(null);
  };

  useEffect(() => { 
    const root = document.documentElement;
    console.log('Theme Effect: isDarkMode =', isDarkMode);
    if (isDarkMode) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    try { localStorage.setItem('seokgwan-theme', isDarkMode ? 'dark' : 'light'); } catch (e) {}
  }, [isDarkMode]);

  const handleExportCSV = () => {
    let csvContent = "\uFEFF"; 
    csvContent += "대분류,세부업무,담당자,상태,마감일,상세내용\n";
    categories.forEach(cat => {
      if (cat.subTasks && cat.subTasks.length > 0) {
        cat.subTasks.forEach((task: any) => {
          const detail = task.detail ? task.detail.replace(/"/g, '""').replace(/\n/g, ' ') : '';
          csvContent += `"${cat.title}","${task.name}","${cat.assignee}","${statusMap[task.status]?.label || ''}","${task.dueDate || ''}","${detail}"\n`;
        });
      } else {
        csvContent += `"${cat.title}","없음","${cat.assignee}","","",""\n`;
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `부서업무현황_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredCategories = categories.filter(cat => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      cat.title.toLowerCase().includes(term) || cat.description.toLowerCase().includes(term) || (cat.assignee && cat.assignee.toLowerCase().includes(term)) ||
      (cat.subTasks || []).some((sub: any) => (sub.name && sub.name.toLowerCase().includes(term)) || (sub.detail && sub.detail.toLowerCase().includes(term)) || (sub.files && sub.files.some((file: any) => file.name.toLowerCase().includes(term)))) ||
      (cat.memos && cat.memos.some((memo: any) => memo.text.toLowerCase().includes(term)))
    );
  });

  const handleDragStart = (e: any, index: number) => {
    dragItem.current = index;
    setTimeout(() => { if (e.target) e.target.classList.add('opacity-50'); }, 0);
  };
  const handleDragEnter = (e: any, index: number) => { dragOverItem.current = index; };
  const handleDragEnd = (e: any) => {
    if (e.target) e.target.classList.remove('opacity-50');
    if (dragItem.current !== undefined && dragOverItem.current !== undefined && dragItem.current !== null && dragOverItem.current !== null) {
      const newCategories = [...categories];
      const draggedItemContent = newCategories[dragItem.current];
      newCategories.splice(dragItem.current, 1);
      newCategories.splice(dragOverItem.current, 0, draggedItemContent);
      updatePortalData(newCategories, '업무 분야 순서를 변경했습니다.');
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const updateActiveCategorySubTasks = (newSubTasks: any[], msg: string) => {
    const updatedCategory = { ...activeCategory, subTasks: newSubTasks };
    setActiveCategory(updatedCategory);
    updatePortalData(categories.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat), msg);
  };

  const togglePinSubTask = (categoryId: string, subTaskId: string, e: any) => {
    if (e) e.stopPropagation();
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;
    const subTask = cat.subTasks.find((s: any) => s.id === subTaskId);
    const newState = !subTask.isPinned;
    const newCats = categories.map(c => {
      if (c.id === categoryId) {
        return { ...c, subTasks: c.subTasks.map((s: any) => s.id === subTaskId ? { ...s, isPinned: newState } : s) };
      }
      return c;
    });
    const msg = newState ? `'${subTask.name}'를 중요 업무로 고정했습니다.` : `'${subTask.name}'의 고정을 해제했습니다.`;
    
    if (activeCategory && activeCategory.id === categoryId) {
      setActiveCategory(newCats.find(c => c.id === categoryId));
    }
    updatePortalData(newCats, msg);
  };

  const startInlineEdit = (index: number, subTask: any) => {
    setInlineEditingSubTaskIndex(index);
    setTempSubTask(JSON.parse(JSON.stringify(subTask))); 
  };
  const cancelInlineEdit = () => {
    setInlineEditingSubTaskIndex(null);
    setTempSubTask(null);
  };
  const saveInlineEdit = (index: number) => {
    const newSubTasks = [...activeCategory.subTasks];
    const oldStatus = newSubTasks[index].status;
    const newStatus = tempSubTask.status;
    newSubTasks[index] = tempSubTask;
    
    let msg = `'${tempSubTask.name}' 세부 업무를 수정했습니다.`;
    if (oldStatus !== newStatus) {
      msg = `'${tempSubTask.name}'의 상태를 [${statusMap[newStatus].label}]로 변경했습니다.`;
      if (newStatus === 'completed' && oldStatus !== 'completed') handleConfetti();
    }
    
    updateActiveCategorySubTasks(newSubTasks, msg);
    setInlineEditingSubTaskIndex(null);
    setTempSubTask(null);
  };

  const handleAddNewSubTask = () => {
    const newSubTask = { id: `s_${Date.now()}`, name: '', detail: '', status: 'pending', isPinned: false, files: [], createdAt: Date.now(), dueDate: '' };
    const newSubTasks = [...activeCategory.subTasks, newSubTask];
    const updatedCategory = { ...activeCategory, subTasks: newSubTasks };
    setActiveCategory(updatedCategory);
    setCategories(categories.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat));
    startInlineEdit(newSubTasks.length - 1, newSubTask);
  };

  const executeDeleteSubTask = () => {
    if (subTaskToDelete !== null) {
      const taskName = activeCategory.subTasks[subTaskToDelete].name || '세부 업무';
      const newSubTasks = [...activeCategory.subTasks];
      newSubTasks.splice(subTaskToDelete, 1);
      updateActiveCategorySubTasks(newSubTasks, `'${taskName}'를 삭제했습니다.`);
      setSubTaskToDelete(null);
      if (inlineEditingSubTaskIndex === subTaskToDelete) cancelInlineEdit();
    }
  };

  const handleSubTaskFileUpload = async (e: any) => {
    const files = Array.from(e.target.files) as File[];
    if (!files.length) return;
    setIsUploading(true);
    try {
      const newFiles = await Promise.all(files.map(async (file) => {
        const fileId = `f_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const storageRef = ref(storage, `seokgwan/${fileId}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        return {
          id: fileId, name: file.name,
          size: file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`,
          url: url, storagePath: storageRef.fullPath
        };
      }));
      setTempSubTask({ ...tempSubTask, files: [...(tempSubTask.files || []), ...newFiles] });
    } catch (error) {
      console.error("Upload failed", error);
      alert("파일 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  const handleSubTaskPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const timestamp = new Date().toLocaleTimeString('ko-KR', { hour12: false }).replace(/:/g, '-');
          const fileName = `스크린샷_${timestamp}.png`;
          const renamedFile = new File([file], fileName, { type: file.type });
          files.push(renamedFile);
        }
      }
    }

    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const newFiles = await Promise.all(files.map(async (file) => {
        const fileId = `f_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const storageRef = ref(storage, `seokgwan/${fileId}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        return {
          id: fileId, name: file.name,
          size: file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`,
          url: url, storagePath: storageRef.fullPath
        };
      }));
      setTempSubTask({ ...tempSubTask, files: [...(tempSubTask.files || []), ...newFiles] });
    } catch (error) {
      console.error("Paste upload failed", error);
      alert("이미지 붙여넣기 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveSubTaskFile = async (fileId: string) => {
    const fileToRemove = tempSubTask.files.find((f: any) => f.id === fileId);
    if (fileToRemove && fileToRemove.storagePath) {
      try { await deleteObject(ref(storage, fileToRemove.storagePath)); } catch (e) { console.error("삭제 실패", e); }
    }
    setTempSubTask({ ...tempSubTask, files: tempSubTask.files.filter((f: any) => f.id !== fileId) });
  };

  const handleAddCategoryClick = () => {
    const newCategory = { id: `cat_${Date.now()}`, title: '', assignee: '', iconName: 'BookOpen', color: colorThemes[5].color, iconBg: colorThemes[5].iconBg, description: '', subTasks: [], memos: [], generalNote: '' };
    setEditingCategory(newCategory);
  };

  const saveCategoryEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const existingIndex = categories.findIndex(cat => cat.id === editingCategory.id);
    let updatedCategories, msg = '';
    if (existingIndex >= 0) {
      updatedCategories = categories.map(cat => cat.id === editingCategory.id ? editingCategory : cat);
      msg = `'${editingCategory.title}' 분야의 기본 설정을 수정했습니다.`;
    } else {
      updatedCategories = [...categories, editingCategory];
      msg = `새 업무 분야 '${editingCategory.title}'를 생성했습니다.`;
    }
    updatePortalData(updatedCategories, msg);
    if (activeCategory && activeCategory.id === editingCategory.id) setActiveCategory(editingCategory);
    setEditingCategory(null);
  };

  const handleAddMemo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoText.trim()) return;
    const newMemo = { id: Date.now(), text: newMemoText, author: localUserName, date: new Date().toLocaleDateString(), reactions: { thumbsUp: 0, eyes: 0, tada: 0 } };
    const updatedActiveCategory = { ...activeCategory, memos: [...(activeCategory.memos || []), newMemo] };
    setActiveCategory(updatedActiveCategory);
    updatePortalData(categories.map(cat => cat.id === activeCategory.id ? updatedActiveCategory : cat), `'${activeCategory.title}'에 새 코멘트를 남겼습니다.`);
    setNewMemoText('');
  };

  const toggleReaction = (categoryId: string, memoId: number, type: string) => {
    const newCats = categories.map(cat => {
      if (cat.id === categoryId) {
        const newMemos = cat.memos.map((m: any) => {
          if (m.id === memoId) {
            const currentReactions = m.reactions || { thumbsUp: 0, eyes: 0, tada: 0 };
            return { ...m, reactions: { ...currentReactions, [type]: currentReactions[type] + 1 } };
          }
          return m;
        });
        if (activeCategory && activeCategory.id === categoryId) setActiveCategory({ ...cat, memos: newMemos });
        return { ...cat, memos: newMemos };
      }
      return cat;
    });
    updatePortalData(newCats);
  };

  const handleKanbanStatusChange = (categoryId: string, subTaskId: string, newStatus: string) => {
    const cat = categories.find(c => c.id === categoryId);
    const subTask = cat.subTasks.find((s: any) => s.id === subTaskId);
    const oldStatus = subTask.status;
    const newCats = categories.map(c => {
      if (c.id === categoryId) {
        return { ...c, subTasks: c.subTasks.map((s: any) => s.id === subTaskId ? { ...s, status: newStatus } : s) };
      }
      return c;
    });
    
    if (oldStatus !== 'completed' && newStatus === 'completed') handleConfetti();
    updatePortalData(newCats, `'${subTask.name}'의 상태를 [${statusMap[newStatus].label}]로 변경했습니다.`);
  };

  const handleCategoryClick = (category: any) => {
    setActiveCategory(category);
    setSearchTerm('');
    setInlineEditingSubTaskIndex(null);
    setIsEditingGeneralNote(false); 
    setViewMode('grid');
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  const renderMemoText = (text: string) => {
    const parts = text.split(/(@[가-힣a-zA-Z0-9]+)/g);
    return parts.map((part, i) => 
      part.startsWith('@') ? <span key={i} className="text-blue-600 dark:text-blue-400 font-extrabold bg-blue-100/50 dark:bg-blue-900/30 px-1 rounded">{part}</span> : part
    );
  };

  const allSubTasks = categories.reduce((acc, cat) => {
    const tasks = (cat.subTasks || []).map((sub: any) => ({ 
      ...sub, 
      categoryId: cat.id, 
      categoryTitle: cat.title, 
      categoryColor: cat.color,
      categoryAssignee: cat.assignee
    }));
    return [...acc, ...tasks];
  }, []);

  const upcomingTasks = allSubTasks.filter((sub: any) => sub.status !== 'completed' && sub.dueDate).map((sub: any) => ({ ...sub, dDay: getDaysUntilDue(sub.dueDate) }))
    .filter((task: any) => task.dDay !== null && task.dDay <= 7).sort((a: any, b: any) => a.dDay - b.dDay);

  const pinnedTasks = allSubTasks.filter((t: any) => t.isPinned);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    let days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  // Implementation will continue in next step
  return (
    <div className={`min-h-screen flex bg-[#f8fafc] dark:bg-gray-950 transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
      <style>{`
        @keyframes confettiPop { 0% { transform: translate(0, 0) scale(0.5); opacity: 1; } 100% { transform: translate(var(--tx), var(--ty)) scale(1.5) rotate(var(--rot)); opacity: 0; } }
        .animate-confetti { animation: confettiPop 2s ease-out forwards; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-active-shadow { box-shadow: 0 8px 20px -4px rgba(37, 99, 235, 0.3); }
        .card-shadow { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02); }
        .card-hover-shadow:hover { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03); }
        
        :root {
          --card-roundness: ${widgetStyle.cardRoundness}px;
          --card-spacing: ${widgetStyle.cardSpacing}px;
          --row-height: ${widgetStyle.rowHeight}px;
          --accent-color: ${widgetStyle.accentColor};
          --text-color: ${widgetStyle.textColor};
          --font-size-base: ${widgetStyle.fontSize}%;
        }
        
        .dynamic-card {
          border-radius: var(--card-roundness);
          border: ${widgetStyle.showBorder ? `${widgetStyle.borderThickness}px solid ${widgetStyle.borderColor}` : 'none'};
          box-shadow: ${widgetStyle.shadow === 'none' ? 'none' : 
                        widgetStyle.shadow === 'soft' ? '0 1px 3px rgba(0,0,0,0.05)' :
                        widgetStyle.shadow === 'medium' ? '0 4px 6px rgba(0,0,0,0.07)' :
                        '0 10px 15px rgba(0,0,0,0.1)'};
        }

        .dotted-grid {
          background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
          background-size: 30px 30px;
        }
        .dark .dotted-grid {
          background-image: radial-gradient(#334155 1px, transparent 1px);
        }
      `}</style>

      {triggerConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center overflow-hidden bg-black/10 dark:bg-black/30 transition-all duration-500">
          {Array.from({ length: 45 }).map((_, i) => {
            const tx = `${(Math.random() - 0.5) * 120}vw`, ty = `${(Math.random() - 0.5) * 120}vh`, rot = `${Math.random() * 720}deg`;
            return <div key={i} className="absolute text-3xl sm:text-5xl animate-confetti" style={{ '--tx': tx, '--ty': ty, '--rot': rot, animationDelay: `${Math.random() * 0.2}s` } as any}>{['🎉', '🎊', '✨', '👏', '🚀', '💯'][Math.floor(Math.random() * 6)]}</div>
          })}
          <div className="absolute text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 animate-bounce drop-shadow-2xl text-center px-4 leading-tight">
            업무 완료!<br/><span className="text-2xl sm:text-4xl text-gray-800 dark:text-white drop-shadow-md">수고 많으셨습니다 👏</span>
          </div>
        </div>
      )}

      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: `rgba(var(--portal-bg-rgb), var(--portal-bg-opacity))` }}>
        {/* Sidebar Navigation */}
        <aside className={`
          ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 w-20'} 
          fixed lg:sticky top-0 left-0 h-screen flex flex-col transition-all duration-300 z-50
        `} style={{ 
          backgroundColor: `rgba(var(--portal-card-rgb), var(--portal-card-opacity))`,
          borderColor: 'var(--portal-border-color)',
          borderRightWidth: 'var(--portal-border-width)',
          color: 'var(--portal-text)'
        }}>
        <div className="p-5 flex items-center gap-2.5">
          <div className="p-1 rounded-xl shadow-lg shadow-blue-600/10 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <img src="/icon.svg" alt="Logo" className="w-7 h-7" referrerPolicy="no-referrer" />
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col">
              <span className="font-black text-lg text-slate-900 dark:text-white tracking-tighter leading-none">과학정보부</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">업무포털 시스템</span>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto hide-scrollbar">
          <div className="mb-4 grid grid-cols-2 gap-1">
            <button 
              onClick={() => { setViewMode('grid'); setActiveCategory(null); }} 
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all ${viewMode === 'grid' && !activeCategory ? 'bg-blue-600 text-white custom-active-shadow' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              title="대시보드"
            >
              <LayoutGrid className="w-4 h-4 shrink-0" />
              {isSidebarOpen && <span className="text-[9px] font-black uppercase tracking-wide">포털 홈</span>}
            </button>
            <button 
              onClick={() => { setViewMode('kanban'); setActiveCategory(null); }} 
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all ${viewMode === 'kanban' ? 'bg-blue-600 text-white custom-active-shadow' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              title="진행현황판"
            >
              <Kanban className="w-4 h-4 shrink-0" />
              {isSidebarOpen && <span className="text-[9px] font-black uppercase tracking-wide">진행현황판</span>}
            </button>
            <button 
              onClick={() => { setViewMode('calendar'); setActiveCategory(null); }} 
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all ${viewMode === 'calendar' ? 'bg-blue-600 text-white custom-active-shadow' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              title="부서 일정"
            >
              <CalendarRange className="w-4 h-4 shrink-0" />
              {isSidebarOpen && <span className="text-[9px] font-black uppercase tracking-wide">연간 일정</span>}
            </button>
            <button 
              onClick={() => { setViewMode('equipment'); setActiveCategory(null); }} 
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all ${viewMode === 'equipment' ? 'bg-blue-600 text-white custom-active-shadow' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              title="기자재 관리"
            >
              <Laptop className="w-4 h-4 shrink-0" />
              {isSidebarOpen && <span className="text-[9px] font-black uppercase tracking-wide">기자재 관리</span>}
            </button>
          </div>

          <div className="mb-4">
            {isSidebarOpen && <div className="px-4 text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <div className="w-1 h-3 bg-blue-600 rounded-full"></div>
              부서 업무 목록
            </div>}
            <div className="space-y-0.5">
              {categories.map((cat) => {
                const Icon = availableIcons[cat.iconName] || FileBox;
                const isActive = activeCategory?.id === cat.id;
                return (
                  <button 
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${isActive ? 'bg-blue-600 text-white custom-active-shadow' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {isSidebarOpen && (
                      <div className="flex flex-col items-start min-w-0 flex-1">
                        <span className={`text-[12px] truncate w-full ${isActive ? 'font-black' : 'font-bold'}`}>{cat.title}</span>
                        {cat.assignee && <span className={`text-[9px] truncate w-full font-bold ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>담당: {cat.assignee}</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-gray-800">
            {isSidebarOpen && <p className="px-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">바로가기</p>}
            {quickLinks.map((link, idx) => (
              <a key={idx} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-white transition-all text-slate-500 dark:text-slate-400">
                <ExternalLink className="w-4 h-4 shrink-0" />
                {isSidebarOpen && <span className="text-sm truncate">{link.name}</span>}
              </a>
            ))}
          </div>
        </nav>

        <div className="p-3 border-t border-slate-100 dark:border-gray-800">
          <div className="grid grid-cols-3 gap-1 mb-2">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className="flex items-center justify-center p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-all"
              title={isDarkMode ? '라이트 모드' : '다크 모드'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-blue-500" />}
            </button>
            <button 
              onClick={handleExportCSV} 
              className="flex items-center justify-center p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-all"
              title="엑셀 다운로드"
            >
              <DownloadCloud className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="flex items-center justify-center p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-all"
              title="사이드바 축소"
            >
              {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
          
          {isSidebarOpen && (
            <div 
              onClick={() => { setNewNameInput(localUserName); setIsProfileModalOpen(true); }}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 transition-all group text-left w-full cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-[10px] shadow-sm group-hover:scale-110 transition-transform">
                  {localUserName.charAt(0)}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-900 dark:text-white truncate">{localUserName}</span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setIsWidgetSettingsOpen(true); }}
                        className="p-1 hover:bg-white dark:hover:bg-gray-800 rounded transition-colors"
                        title="환경 설정"
                      >
                        <Settings className="w-2.5 h-2.5 text-slate-300 group-hover:text-blue-500" />
                      </button>
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold truncate">과학정보부</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-colors duration-200" style={{ backgroundColor: 'transparent' }}>
        
        {/* Top Header */}
        <header className="h-20 backdrop-blur-2xl flex items-center justify-between px-8 sm:px-12 sticky top-0 z-40 transition-colors duration-200" style={{ 
          backgroundColor: `rgba(var(--portal-card-rgb), 0.8)`,
          borderColor: 'var(--portal-border-color)',
          borderBottomWidth: 'var(--portal-border-width)'
        }}>
          <div className="flex items-center gap-8">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-0.5">
                <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)] animate-pulse"></div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                  {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                </h1>
                <span className="text-2xl font-light text-slate-300 dark:text-slate-700 mx-0.5">|</span>
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">
                  {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] ml-5 opacity-70">
                {greeting}
              </p>
              <div className="ml-5 mt-1">
                <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-black tracking-[0.18em] text-blue-700 dark:border-blue-900/60 dark:bg-blue-900/30 dark:text-blue-300">
                  VERSION {appVersion}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Online Users */}
            <div className="flex items-center gap-2 relative">
              <div className="flex -space-x-2">
                {onlineUsersList.slice(0, 5).map((name, i) => (
                  <div key={i} onClick={() => { if(name === localUserName) { setMyStatusText(userStatuses[name] || ''); setIsStatusEditOpen(!isStatusEditOpen); } }}
                    className={`flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 text-gray-700 dark:text-gray-300 shadow-sm relative group cursor-pointer hover:-translate-y-1 transition-transform`} 
                  >
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                    <span className="text-xs font-bold">{name.charAt(0)}</span>
                    <div className="absolute top-10 right-0 w-max max-w-[200px] bg-gray-900 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl whitespace-pre-wrap text-center">
                      <p className="font-bold mb-1">{name} {name === localUserName && '(나)'}</p>
                      <p className="text-gray-300 font-normal">{userStatuses[name] || '상태 메시지가 없습니다.'}</p>
                    </div>
                  </div>
                ))}
                {onlineUsersList.length > 5 && (
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-300 dark:bg-gray-600 border-2 border-white dark:border-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300">
                    +{onlineUsersList.length - 5}
                  </div>
                )}
              </div>

              {isStatusEditOpen && (
                <div className="absolute top-10 right-0 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[100] w-64 animate-in slide-in-from-top-2">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center"><MessageCircle className="w-4 h-4 mr-1.5 text-blue-500"/> 상태 메시지</label>
                    <button onClick={() => setIsStatusEditOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4"/></button>
                  </div>
                  <form onSubmit={updateMyStatus}>
                    <input type="text" maxLength={30} placeholder="상태를 입력하세요..." value={myStatusText} onChange={(e) => setMyStatusText(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white mb-3" />
                    <button type="submit" className="w-full py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">저장</button>
                  </form>
                </div>
              )}
            </div>

            <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className={`p-2 rounded-lg transition-colors ${isHistoryOpen ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              <Clock className="w-6 h-6" />
            </button>

            <button onClick={() => setIsCategorySettingsOpen(true)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="부서 업무 관리">
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-6 relative" style={{ fontSize: `calc(var(--portal-font-size) * var(--portal-font-scale))` }}>
          <div className={activeCategory ? 'w-full' : 'max-w-6xl mx-auto'}>
            {/* 활동 히스토리 사이드바 */}
          {isHistoryOpen && (
            <div className="absolute top-0 right-0 w-full sm:w-80 h-full bg-white/90 dark:bg-gray-800/95 backdrop-blur-md shadow-2xl border-l border-gray-200 dark:border-gray-700 z-20 rounded-l-3xl p-5 overflow-y-auto animate-in slide-in-from-right-8 duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg flex items-center text-gray-800 dark:text-gray-100"><Activity className="w-5 h-5 mr-2 text-purple-500"/> 최근 활동</h3>
                <button onClick={() => setIsHistoryOpen(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                {activityHistory.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-10">최근 활동 내역이 없습니다.</p>
                ) : (
                  activityHistory.map((item, idx) => (
                    <div key={idx} className="flex gap-3 text-sm relative">
                      {idx !== activityHistory.length - 1 && <div className="absolute left-[11px] top-6 bottom-[-12px] w-px bg-gray-200 dark:bg-gray-700"></div>}
                      <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 text-xs font-bold border border-purple-200 dark:border-purple-800 z-10">
                        {item.user.charAt(0)}
                      </div>
                      <div className="pb-3">
                        <p className="text-gray-800 dark:text-gray-200"><span className="font-bold">{item.user}</span>님이 {item.action}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {!activeCategory && !isEditMode && (upcomingTasks.length > 0 || pinnedTasks.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {upcomingTasks.length > 0 && (
                <div className="p-4 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-[2rem] shadow-sm animate-in fade-in slide-in-from-top-4 flex flex-col">
                  <h3 className="text-base font-black text-red-800 dark:text-red-400 mb-2 flex items-center px-1">
                    <Bell className="w-4 h-4 mr-2" /> 다가오는 주요 업무 마감일
                  </h3>
                  <div className="flex flex-col gap-2 flex-1">
                    {upcomingTasks.slice(0, 3).map((task: any) => (
                      <div key={task.id} onClick={() => handleCategoryClick(categories.find(c => c.id === task.categoryId))} className="group flex items-center justify-between portal-card p-2.5 shadow-sm cursor-pointer hover:shadow-md transition-all">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black shrink-0 ${task.dDay < 0 ? 'bg-red-600 text-white' : task.dDay === 0 ? 'bg-red-500 text-white' : 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300'}`}>
                            {task.dDay < 0 ? `D+${Math.abs(task.dDay)}` : task.dDay === 0 ? 'D-Day' : `D-${task.dDay}`}
                          </span>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{task.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-gray-400 dark:text-gray-500 truncate">{task.categoryTitle}</span>
                              {task.categoryAssignee && (
                                <span className="text-[9px] text-blue-500 dark:text-blue-400 font-medium truncate shrink-0">
                                  • {task.categoryAssignee.split(' ')[0]}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-[9px] font-bold text-gray-400 dark:text-gray-500 flex items-center shrink-0 ml-2">
                          <Calendar className="w-2.5 h-2.5 mr-1 opacity-50" /> {task.dueDate.split('-').slice(1).join('/')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pinnedTasks.length > 0 && (
                <div className="p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-[2rem] shadow-sm animate-in fade-in slide-in-from-top-4 flex flex-col">
                  <h3 className="text-base font-black text-amber-800 dark:text-amber-400 mb-2 flex items-center px-1">
                    <Star className="w-4 h-4 mr-2 fill-amber-500 text-amber-500" /> 중요 고정 업무 즐겨찾기
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                    {pinnedTasks.slice(0, 4).map((task: any) => (
                      <div key={task.id} onClick={() => handleCategoryClick(categories.find(c => c.id === task.categoryId))} className="group flex items-center justify-between portal-card p-2.5 shadow-sm cursor-pointer hover:shadow-md transition-all">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.categoryColor.split(' ')[0]}`}></div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{task.name}</span>
                            {task.categoryAssignee && (
                              <span className="text-[9px] text-gray-400 dark:text-gray-500 truncate">
                                {task.categoryAssignee}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-3 h-3 text-amber-200 group-hover:text-amber-400 transition-colors shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!activeCategory ? (
            viewMode === 'grid' ? (
              <div className="flex flex-col h-full min-h-[600px] animate-in fade-in duration-500">
                {/* Notepad Toolbar */}
                <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-100 dark:border-gray-800">
                      <FileBox className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">업무 공용 메모장</h2>
                  </div>

                  <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm p-1 rounded-xl border border-white dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-1.5 px-2 py-1 border-r border-slate-200 dark:border-gray-700 mr-1">
                      {memoColors.map(color => (
                        <button 
                          key={color}
                          onClick={() => setSelectedMemoColor(color)}
                          className={`w-5 h-5 rounded-full border-2 transition-all ${selectedMemoColor === color ? 'border-blue-600 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>

                    <button 
                      onClick={() => {}} 
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all"
                    >
                      <DownloadCloud className="w-3.5 h-3.5" /> 보관함
                    </button>
                    
                    <button 
                      onClick={() => {
                        const sortedMemos = memos.map((m, i) => ({
                          ...m,
                          x: 20 + (i % 4) * 240,
                          y: 20 + Math.floor(i / 4) * 240
                        }));
                        handleMemoUpdate(sortedMemos);
                      }} 
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" /> 격자 정렬
                    </button>

                    <button 
                      onClick={() => {
                        const newMemo = {
                          id: Date.now().toString(),
                          x: 100 + Math.random() * 50,
                          y: 100 + Math.random() * 50,
                          color: selectedMemoColor,
                          text: ''
                        };
                        handleMemoUpdate([...memos, newMemo]);
                        setEditingMemoId(newMemo.id);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-black shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" /> 새 메모
                    </button>
                  </div>
                </div>

                {/* Notepad Canvas */}
                <div className="flex-1 relative bg-white/40 dark:bg-gray-900/40 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-gray-800 dotted-grid min-h-[700px] overflow-hidden">
                  {memos.map((memo) => (
                    <div 
                      key={memo.id}
                      className="absolute group transition-shadow hover:shadow-2xl cursor-grab active:cursor-grabbing"
                      style={{ 
                        left: memo.x, 
                        top: memo.y, 
                        width: '220px', 
                        height: '220px',
                        zIndex: editingMemoId === memo.id ? 50 : 10
                      }}
                      onMouseDown={(e) => {
                        if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
                        const startX = e.clientX - memo.x;
                        const startY = e.clientY - memo.y;
                        
                        const onMouseMove = (moveEvent: MouseEvent) => {
                          const newX = moveEvent.clientX - startX;
                          const newY = moveEvent.clientY - startY;
                          setMemos(prev => prev.map(m => m.id === memo.id ? { ...m, x: newX, y: newY } : m));
                        };
                        
                        const onMouseUp = () => {
                          document.removeEventListener('mousemove', onMouseMove);
                          document.removeEventListener('mouseup', onMouseUp);
                          
                          // Save final position to Firestore
                          setMemos(currentMemos => {
                            handleMemoUpdate(currentMemos);
                            return currentMemos;
                          });
                        };
                        
                        document.addEventListener('mousemove', onMouseMove);
                        document.addEventListener('mouseup', onMouseUp);
                      }}
                    >
                      <div 
                        className="w-full h-full p-6 shadow-xl relative overflow-hidden flex flex-col"
                        style={{ 
                          backgroundColor: memo.color,
                          borderRadius: '4px',
                          transform: 'rotate(-1deg)',
                          boxShadow: '2px 10px 20px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)'
                        }}
                        onDoubleClick={() => setEditingMemoId(memo.id)}
                      >
                        {/* Sticky note fold effect */}
                        <div className="absolute bottom-0 right-0 w-8 h-8 bg-black/5 rounded-tl-full"></div>
                        
                        <button 
                          onClick={() => handleMemoUpdate(memos.filter(m => m.id !== memo.id))}
                          className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5 text-black/40" />
                        </button>

                        {editingMemoId === memo.id ? (
                          <textarea
                            autoFocus
                            className="w-full h-full bg-transparent resize-none outline-none text-sm font-bold text-slate-700 placeholder-slate-400/50"
                            value={memo.text}
                            onChange={(e) => setMemos(memos.map(m => m.id === memo.id ? { ...m, text: e.target.value } : m))}
                            onBlur={() => {
                              setEditingMemoId(null);
                              handleMemoUpdate(memos);
                            }}
                            placeholder="메모를 입력하세요..."
                          />
                        ) : (
                          <div className="w-full h-full text-sm font-bold text-slate-700 whitespace-pre-wrap overflow-hidden">
                            {memo.text || <span className="text-slate-400/60 italic">더블 클릭하여 메모를 작성하세요</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : viewMode === 'kanban' ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-200px)] flex flex-col">
                <div className="mb-6 flex justify-between items-end">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center"><Kanban className="w-6 h-6 mr-2 text-blue-600"/> 부서 전체 진행 현황판</h2>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">모든 세부 업무의 진행 상태를 한눈에 파악하고 수정할 수 있습니다.</p>
                  </div>
                </div>
                
                <div className="flex gap-6 overflow-x-auto pb-6 h-full hide-scrollbar snap-x">
                  {['pending', 'in_progress', 'completed'].map(statusKey => {
                    const columnTasks = allSubTasks.filter((t: any) => t.status === statusKey);
                    return (
                      <div key={statusKey} className="flex-1 min-w-[320px] max-w-[400px] flex flex-col bg-gray-100/50 dark:bg-gray-800/30 rounded-2xl border border-gray-200 dark:border-gray-700 snap-center">
                        <div className={`p-4 font-bold border-b border-gray-200 dark:border-gray-700 rounded-t-2xl flex justify-between items-center ${statusMap[statusKey].color.split(' ')[0]} bg-opacity-20`}>
                          <div className="flex items-center">{statusMap[statusKey].icon} {statusMap[statusKey].label}</div>
                          <span className="bg-white/80 dark:bg-black/20 px-2 py-0.5 rounded-full text-xs">{columnTasks.length}</span>
                        </div>
                        <div className="p-3 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
                          {columnTasks.length === 0 ? (
                            <p className="text-center text-sm text-gray-400 py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">업무가 없습니다.</p>
                          ) : (
                            columnTasks.map((task: any) => (
                              <div key={task.id} className="portal-card p-3 shadow-sm hover:shadow-md transition-shadow group relative">
                                <button 
                                  onClick={(e) => togglePinSubTask(task.categoryId, task.id, e)}
                                  className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                  <Star className={`w-4 h-4 ${task.isPinned ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300 dark:text-gray-600'}`} />
                                </button>
                                <div className="text-[10px] font-bold text-gray-500 mb-1 flex items-center gap-1 opacity-70">
                                  <div className={`w-2 h-2 rounded-full ${task.categoryColor.split(' ')[0]}`}></div>
                                  {task.categoryTitle}
                                </div>
                                <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-1 leading-tight flex items-center gap-1.5 flex-wrap pr-6">
                                  {task.name}
                                  {isNewTask(task.createdAt) && <span className="flex items-center justify-center w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full" title="신규 업무">N</span>}
                                </h4>
                                {task.dueDate && (
                                  <div className="text-[10.5px] font-bold text-red-500 dark:text-red-400 mb-1 flex items-center">
                                    <Calendar className="w-3 h-3 mr-1" /> 마감일: {task.dueDate} 
                                    <span className="ml-1 opacity-70">({(getDaysUntilDue(task.dueDate) as number) < 0 ? `D+${Math.abs(getDaysUntilDue(task.dueDate) as number)}` : getDaysUntilDue(task.dueDate) === 0 ? 'D-Day' : `D-${getDaysUntilDue(task.dueDate)}`})</span>
                                  </div>
                                )}

                                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">{task.detail}</p>
                                
                                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                  <select 
                                    value={task.status} 
                                    onChange={(e) => handleKanbanStatusChange(task.categoryId, task.id, e.target.value)}
                                    className="text-xs font-semibold bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 outline-none cursor-pointer text-gray-800 dark:text-gray-200 [color-scheme:light] dark:[color-scheme:dark]"
                                  >
                                    <option value="pending">진행 전으로 이동</option>
                                    <option value="in_progress">진행 중으로 이동</option>
                                    <option value="completed">완료로 이동</option>
                                  </select>
                                  <button onClick={() => { const cat = categories.find(c => c.id === task.categoryId); if(cat) handleCategoryClick(cat); }} className="text-xs text-blue-600 hover:underline">상세보기 &rarr;</button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : viewMode === 'equipment' ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center"><Laptop className="w-6 h-6 mr-2 text-blue-600"/> 기자재 대여 관리</h2>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">부서 공용 기자재의 대여 및 반납 현황을 실시간으로 관리합니다.</p>
                  </div>
                  <button onClick={() => setIsAddingEq(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center shadow-sm transition-colors">
                    <Plus className="w-5 h-5 mr-1.5" /> 새 기자재 등록
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {equipment.map((eq) => (
                    <div key={eq.id} className="portal-card shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className={`p-2.5 rounded-xl ${eq.status === 'available' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                            {eq.category === '정보기기' ? <Laptop className="w-5 h-5" /> : eq.category === '과학기자재' ? <Microscope className="w-5 h-5" /> : <FileBox className="w-5 h-5" />}
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${eq.status === 'available' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800' : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800'}`}>
                            {eq.status === 'available' ? '대여 가능' : '대여 중'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-0.5">{eq.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{eq.category}</p>
                        
                        {eq.status === 'borrowed' ? (
                          <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded-xl mb-2 border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300 mb-0.5">
                              <User className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" /> 대여자: <span className="ml-1 font-bold">{eq.borrower}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                              <Calendar className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" /> 반납예정: <span className="ml-1 font-bold text-red-500 dark:text-red-400">{eq.returnDate}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-[60px] flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm italic mb-2 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                            현재 대여 가능한 상태입니다.
                          </div>
                        )}

                        <div className="flex gap-1.5">
                          {eq.status === 'available' ? (
                            <button onClick={() => { setBorrowingEq(eq); setBorrowerName(localUserName); setBorrowDate(getOffsetDate(3)); }} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors">대여하기</button>
                          ) : (
                            <button onClick={() => handleReturnEquipment(eq.id)} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors">반납하기</button>
                          )}
                          <button onClick={() => handleDeleteEquipment(eq.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-5 h-5" /></button>
                        </div>
                      </div>
                      
                      {eq.history && eq.history.length > 0 && (
                        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
                          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">최근 이력</p>
                          <div className="space-y-1">
                            {eq.history.slice(0, 2).map((h: any, i: number) => (
                              <div key={i} className="text-[11px] text-gray-500 dark:text-gray-400 flex justify-between">
                                <span>{h.date} - {h.user} ({h.action})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center"><CalendarRange className="w-6 h-6 mr-2 text-blue-600"/> 부서 마감일 캘린더</h2>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">마감일이 지정된 세부 업무들의 일정을 확인합니다.</p>
                  </div>
                  <div className="flex items-center gap-4 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <button onClick={prevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><ChevronLeft className="w-5 h-5"/></button>
                    <span className="font-bold text-lg min-w-[100px] text-center">{currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월</span>
                    <button onClick={nextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><ChevronRight className="w-5 h-5"/></button>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                      <div key={day} className={`py-3 text-center text-sm font-bold ${idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-400' : 'text-gray-600 dark:text-gray-200'}`}>{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 auto-rows-fr">
                    {generateCalendarDays().map((date, idx) => {
                      if (!date) return <div key={`empty-${idx}`} className="min-h-[100px] sm:min-h-[120px] border-b border-r border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/20"></div>;
                      
                      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                      const isToday = new Date().toDateString() === date.toDateString();
                      
                      const dayTasks = allSubTasks.filter((t: any) => t.dueDate === dateStr);

                      return (
                        <div key={dateStr} className={`min-h-[100px] sm:min-h-[120px] border-b border-r border-gray-200 dark:border-gray-700 p-0.5 sm:p-1 flex flex-col transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-700/30 ${isToday ? 'bg-blue-50/40 dark:bg-blue-900/20' : 'portal-card rounded-none border-none'}`}>
                          <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-blue-600 text-white shadow-sm' : idx % 7 === 0 ? 'text-red-500' : idx % 7 === 6 ? 'text-blue-400' : 'text-gray-700 dark:text-gray-100'}`}>
                            {date.getDate()}
                          </div>
                          <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar flex-1">
                            {dayTasks.map((task: any) => {
                              const status = statusMap[task.status] || statusMap.pending;
                              const isCompleted = task.status === 'completed';
                              const isInProgress = task.status === 'in_progress';
                              
                              return (
                                <div 
                                  key={task.id} 
                                  onClick={() => { const cat = categories.find(c => c.id === task.categoryId); if(cat) handleCategoryClick(cat); }}
                                  className={`text-[10px] sm:text-xs px-2 py-1 rounded-md border-l-2 shadow-sm truncate cursor-pointer hover:brightness-95 transition-all flex items-center
                                    ${isCompleted ? 'bg-emerald-50 text-emerald-800 border-emerald-500 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-600' : 
                                      isInProgress ? 'bg-blue-50 text-blue-800 border-blue-500 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-600' : 
                                      'bg-gray-50 text-gray-700 border-gray-400 dark:bg-gray-700/60 dark:text-gray-200 dark:border-gray-500'}`}
                                  title={`${task.categoryTitle} - ${task.name}`}
                                >
                                  <span className="truncate">{task.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="animate-in fade-in slide-in-from-right-8 duration-300">
              <button onClick={() => { setActiveCategory(null); setInlineEditingSubTaskIndex(null); setIsEditingGeneralNote(false); }} className="group flex items-center text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6 transition-colors">
                <ArrowLeft className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" /> 돌아가기
              </button>
              
              {/* 대분류 헤더 카드 */}
              <div className={`p-4 sm:p-5 portal-card shadow-sm mb-4 relative overflow-hidden transition-colors duration-200`} style={{ borderColor: activeCategory.color.includes('blue') ? '#3b82f6' : activeCategory.color.includes('emerald') ? '#10b981' : activeCategory.color.includes('amber') ? '#f59e0b' : activeCategory.color.includes('rose') ? '#f43f5e' : 'var(--portal-border-color)' }}>
                <div className={`absolute -right-8 -top-8 opacity-5 text-${activeCategory.color.split('-')[1]}-900 dark:text-white pointer-events-none`}>
                  {(() => { const ActiveIconBgComponent = availableIcons[activeCategory.iconName] || Settings; return <ActiveIconBgComponent className="w-64 h-64" />; })()}
                </div>

                <div className="flex flex-col justify-between gap-3 relative z-10">
                  <div className="flex items-start justify-between w-full">
                    <div className="flex items-center">
                      <div className={`p-3 rounded-2xl mr-4 sm:mr-5 ${activeCategory.iconBg} text-${activeCategory.color.split('-')[1]}-700 dark:text-${activeCategory.color.split('-')[1]}-300`}>
                        {(() => { const ActiveIconComponent = availableIcons[activeCategory.iconName] || Settings; return <ActiveIconComponent className="w-7 h-7" />; })()}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mr-2">{activeCategory.title}</h2>
                        </div>
                        <div className="flex items-center mt-1 text-sm text-gray-600 dark:text-gray-400">
                          <User className="w-4 h-4 mr-1.5" /> 담당: <strong className="ml-1 text-gray-800 dark:text-gray-200">{activeCategory.assignee || '미지정'}</strong>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setEditingCategory(JSON.parse(JSON.stringify(activeCategory)))} className="shrink-0 flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 rounded-lg border border-blue-200 dark:border-blue-800/50">
                      <Settings className="w-4 h-4 sm:mr-1.5" /> <span className="hidden sm:inline">대분류 설정</span>
                    </button>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 text-base sm:pl-[4.5rem] mt-1">{activeCategory.description}</p>
                </div>
              </div>

              {/* 💡 참고 링크 및 계정 메모 섹션 */}
              <div className="mb-4 p-4 bg-slate-50 dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700 rounded-2xl relative group shadow-sm transition-colors duration-200">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 flex items-center">
                    <Link2 className="w-4 h-4 mr-2 text-blue-500" /> 참고 링크 및 공용 계정 등
                  </h3>
                  {!isEditingGeneralNote ? (
                    <button onClick={() => { setIsEditingGeneralNote(true); setTempGeneralNote(activeCategory.generalNote || ''); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-md transition-colors sm:opacity-0 sm:group-hover:opacity-100">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>
                
                {isEditingGeneralNote ? (
                  <div className="animate-in fade-in duration-200">
                    <textarea 
                      value={tempGeneralNote} 
                      onChange={(e) => setTempGeneralNote(e.target.value)}
                      placeholder="관련 사이트 URL (http://... 입력 시 자동 링크), 아이디/비밀번호, 기타 공용 메모를 자유롭게 적어두세요."
                      className="w-full min-h-[100px] p-3 text-sm border border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-y mb-2 custom-scrollbar shadow-inner"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setIsEditingGeneralNote(false)} className="px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 rounded-lg">취소</button>
                      <button onClick={() => {
                        const updatedCategory = { ...activeCategory, generalNote: tempGeneralNote };
                        setActiveCategory(updatedCategory);
                        updatePortalData(categories.map(cat => cat.id === activeCategory.id ? updatedCategory : cat), `'${activeCategory.title}'의 참고 메모를 수정했습니다.`);
                        setIsEditingGeneralNote(false);
                      }} className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center">
                        <Save className="w-3.5 h-3.5 mr-1" /> 저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {activeCategory.generalNote ? renderTextWithLinks(activeCategory.generalNote) : (
                      <span className="text-gray-400 dark:text-gray-500 italic">등록된 참고 메모가 없습니다. 우측 상단 연필 아이콘을 눌러 추가해보세요.</span>
                    )}
                  </div>
                )}
              </div>

              {/* 소분류 섹션 */}
              <div className="space-y-3 relative z-10">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center">
                  <BookOpen className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400"/> 소분류 상세 업무 및 파일
                </h3>
                
                {activeCategory.subTasks.length === 0 && inlineEditingSubTaskIndex === null ? (
                  <p className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-6 text-center rounded-xl border border-dashed border-gray-300">등록된 상세 업무가 없습니다.</p>
                ) : (
                  activeCategory.subTasks.map((subTask: any, index: number) => {
                    if (inlineEditingSubTaskIndex === index && tempSubTask) {
                      return (
                        <div key={index} className="bg-white dark:bg-gray-800 border-2 border-blue-400 dark:border-blue-500 rounded-xl p-5 shadow-md">
                          <div className="flex flex-col sm:flex-row gap-3 mb-4">
                            <input type="text" placeholder="세부 업무 제목" value={tempSubTask.name} onChange={(e) => setTempSubTask({...tempSubTask, name: e.target.value})} className="flex-grow px-3 py-2 font-bold border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <Calendar className="w-5 h-5 text-gray-400" />
                              <input type="date" value={tempSubTask.dueDate || ''} onChange={(e) => setTempSubTask({...tempSubTask, dueDate: e.target.value})} className="w-full sm:w-40 px-3 py-2 font-semibold border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm [color-scheme:light] dark:[color-scheme:dark]" />
                            </div>

                            <select value={tempSubTask.status || 'pending'} onChange={(e) => setTempSubTask({...tempSubTask, status: e.target.value})} className="w-full sm:w-32 px-3 py-2 font-semibold border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]">
                              <option value="pending">진행 전</option><option value="in_progress">진행 중</option><option value="completed">완료</option>
                            </select>
                          </div>
                          <textarea 
                            placeholder="상세 내용을 입력하세요. (스크린샷 Ctrl+V로 붙여넣기 가능)" 
                            rows={2} 
                            value={tempSubTask.detail} 
                            onChange={(e) => setTempSubTask({...tempSubTask, detail: e.target.value})} 
                            onPaste={handleSubTaskPaste}
                            className="w-full px-3 py-2 mb-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
                          />
                          <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mb-4">
                            <div className="flex justify-between items-center mb-3">
                              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center"><Paperclip className="w-4 h-4 mr-1"/> 관련 양식 파일</label>
                              <input type="file" id={`file-upload-${index}`} className="hidden" multiple onChange={handleSubTaskFileUpload} disabled={isUploading} />
                              <label htmlFor={`file-upload-${index}`} className={`text-xs font-medium text-emerald-600 hover:text-emerald-800 flex items-center bg-emerald-50 px-2 py-1.5 rounded cursor-pointer ${isUploading ? 'opacity-50' : ''}`}><UploadCloud className="w-3.5 h-3.5 mr-1" /> {isUploading ? '업로드 중...' : '내 PC에서 첨부'}</label>
                            </div>
                            <div className="space-y-2">
                              {tempSubTask.files && tempSubTask.files.map((file: any) => (
                                <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                                  <div className="flex items-center overflow-hidden pr-3">
                                    <FileText className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{file.name}</span><span className="text-xs text-gray-400 ml-2">({file.size})</span>
                                  </div>
                                  <button type="button" onClick={() => handleRemoveSubTaskFile(file.id)} className="p-1.5 text-gray-400 hover:text-red-500 bg-white dark:bg-gray-800 rounded-md"><X className="w-3.5 h-3.5" /></button>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                            <button onClick={cancelInlineEdit} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 dark:bg-gray-700 rounded-lg">취소</button>
                            <button onClick={() => saveInlineEdit(index)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center"><Save className="w-4 h-4 mr-1.5"/> 저장</button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={index} className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 border-l-${activeCategory.color.split('-')[1]}-500 rounded-xl p-4 hover:shadow-md transition-all group relative`}>
                        <div className="absolute top-4 right-4 flex space-x-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => togglePinSubTask(activeCategory.id, subTask.id, e)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" title="중요 표시">
                            <Star className={`w-4 h-4 ${subTask.isPinned ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400'}`} />
                          </button>
                          <button onClick={() => startInlineEdit(index, subTask)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="수정"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => setSubTaskToDelete(index)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md" title="삭제"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2 pr-24">
                          <div>
                            <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center flex-wrap gap-2 mb-1">
                              {subTask.name}
                              {isNewTask(subTask.createdAt) && <span className="flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full" title="신규 등록된 업무">N</span>}
                            </h4>
                            
                            {subTask.dueDate && (
                              <div className="text-xs font-bold text-red-500 dark:text-red-400 flex items-center mb-0.5">
                                <Calendar className="w-3.5 h-3.5 mr-1" /> 마감일: {subTask.dueDate}
                                <span className="ml-1.5 text-gray-500 dark:text-gray-400 font-medium">({(getDaysUntilDue(subTask.dueDate) as number) < 0 ? `D+${Math.abs(getDaysUntilDue(subTask.dueDate) as number)}` : getDaysUntilDue(subTask.dueDate) === 0 ? 'D-Day' : `D-${getDaysUntilDue(subTask.dueDate)}`})</span>
                              </div>
                            )}
                          </div>

                          {statusMap[subTask.status || 'pending'] && (
                            <span className={`shrink-0 flex items-center w-max px-2.5 py-1 rounded-full text-xs font-bold border ${statusMap[subTask.status || 'pending'].color}`}>{statusMap[subTask.status || 'pending'].icon} {statusMap[subTask.status || 'pending'].label}</span>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap mb-2">{subTask.detail}</p>
                        
                        {subTask.files && subTask.files.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 border-dashed">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {subTask.files.map((file: any) => (
                                <button key={file.id} onClick={() => file.url && window.open(file.url, '_blank')} className="flex items-center justify-between p-2.5 bg-gray-50/80 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-blue-50 text-left">
                                  <div className="flex items-center overflow-hidden pr-2">
                                    <FileText className="w-4 h-4 text-blue-500 mr-2 shrink-0" /><span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{file.name}</span>
                                  </div>
                                  <Download className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                {inlineEditingSubTaskIndex === null && (
                  <button onClick={handleAddNewSubTask} className="w-full py-3 mt-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 font-bold flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <Plus className="w-5 h-5 mr-2" /> 새 상세 업무 추가
                  </button>
                )}
              </div>

              {/* 말풍선 메모 전용 카드 */}
              <div className="bg-slate-100 dark:bg-gray-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-gray-700 shadow-sm transition-colors duration-200 mt-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center">
                  <MessageSquare className="w-6 h-6 mr-2 text-blue-500" /> 업무 코멘트 (말풍선)
                </h3>
                
                <div className="space-y-5 mb-6">
                  {(!activeCategory.memos || activeCategory.memos.length === 0) ? (
                    <div className="text-center py-8 text-sm text-gray-400 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">등록된 메모가 없습니다. @이름 으로 담당자를 멘션해보세요.</div>
                  ) : (
                    activeCategory.memos.map((memo: any) => (
                      <div key={memo.id} className={`flex flex-col ${memo.author === localUserName ? 'items-end' : 'items-start'} animate-in fade-in duration-300`}>
                        <div className={`flex items-center gap-2 mb-1 ${memo.author === localUserName ? 'flex-row-reverse pr-1' : 'pl-1'}`}>
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{memo.author}</span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">{memo.date}</span>
                        </div>
                        <div className={`text-sm py-2.5 px-4 shadow-sm border max-w-[85%] sm:max-w-[70%] whitespace-pre-wrap leading-relaxed
                          ${memo.author === localUserName 
                            ? 'bg-blue-600 text-white rounded-xl rounded-tr-sm border-blue-600' 
                            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl rounded-tl-sm border-gray-200 dark:border-gray-600'
                          }`}>
                          {renderMemoText(memo.text)}
                        </div>
                        
                        <div className={`flex gap-1.5 mt-1.5 ${memo.author === localUserName ? 'pr-1' : 'pl-1'}`}>
                          <button onClick={() => toggleReaction(activeCategory.id, memo.id, 'thumbsUp')} className="flex items-center text-[11px] bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full px-2 py-0.5 shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                            <ThumbsUp className="w-3 h-3 mr-1 text-yellow-500" /> {memo.reactions?.thumbsUp || 0}
                          </button>
                          <button onClick={() => toggleReaction(activeCategory.id, memo.id, 'eyes')} className="flex items-center text-[11px] bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full px-2 py-0.5 shadow-sm hover:bg-blue-50 transition-colors">
                            <Eye className="w-3 h-3 mr-1 text-blue-500" /> {memo.reactions?.eyes || 0}
                          </button>
                          <button onClick={() => toggleReaction(activeCategory.id, memo.id, 'tada')} className="flex items-center text-[11px] bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full px-2 py-0.5 shadow-sm hover:bg-blue-50 transition-colors">
                            <PartyPopper className="w-3 h-3 mr-1 text-pink-500" /> {memo.reactions?.tada || 0}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddMemo} className="flex items-end gap-2">
                  <div className="flex-grow">
                    <input 
                      type="text" placeholder="메모를 입력하세요... (@이름 으로 멘션 가능)"
                      value={newMemoText} onChange={(e) => setNewMemoText(e.target.value)}
                      className="w-full px-5 py-3.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:text-white"
                    />
                  </div>
                  <button type="submit" disabled={!newMemoText.trim()} className="shrink-0 p-3.5 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500">
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>

            </div>
          )}
        </div>
      </main>

        {showScheduleModal && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/30">
                <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-300 flex items-center"><CalendarDays className="w-5 h-5 mr-2" /> 부서 연간 주요 일정</h3>
                <button onClick={() => setShowScheduleModal(false)} className="text-emerald-700 hover:bg-white/50 p-1 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar">
                <div className="relative border-l-2 border-emerald-100 dark:border-emerald-800 pl-6 space-y-6 py-2">
                  {schedules.map((schedule, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[35px] top-1 w-4 h-4 rounded-full bg-emerald-400 border-4 border-white dark:border-gray-800 shadow-sm"></div>
                      <div className="font-bold text-emerald-700 mb-1">{schedule.month}월</div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 border p-3 rounded-xl text-sm text-gray-700 dark:text-gray-300">{schedule.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {editingCategory && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">대분류 기본 설정</h3>
                <button onClick={() => setEditingCategory(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={saveCategoryEdit} className="flex flex-col overflow-hidden">
                <div className="p-6 overflow-y-auto space-y-4 bg-white dark:bg-gray-800 custom-scrollbar">
                  <div><label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">분야 제목</label><input type="text" value={editingCategory.title} onChange={(e) => setEditingCategory({...editingCategory, title: e.target.value})} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" /></div>
                  <div><label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">담당자</label><input type="text" value={editingCategory.assignee || ''} onChange={(e) => setEditingCategory({...editingCategory, assignee: e.target.value})} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" /></div>
                  <div><label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">설명 (요약)</label><textarea rows={2} value={editingCategory.description} onChange={(e) => setEditingCategory({...editingCategory, description: e.target.value})} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"></textarea></div>
                  
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">아이콘 (이모지) 선택</label>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(availableIcons).map(([key, IconComp]) => {
                          if(key === 'Settings' || key === 'Trash') return null;
                          return (
                            <button
                              key={key} type="button" onClick={() => setEditingCategory({...editingCategory, iconName: key})}
                              className={`p-2.5 rounded-xl flex items-center justify-center transition-all duration-200 ${editingCategory.iconName === key ? 'bg-blue-100 dark:bg-blue-900/60 border-2 border-blue-500 text-blue-700 dark:text-blue-300 scale-110 shadow-sm' : 'bg-gray-50 dark:bg-gray-800 border-2 border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >
                              <IconComp className="w-5 h-5" />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">테마 색상 선택</label>
                      <div className="flex flex-wrap gap-3">
                        {colorThemes.map(theme => (
                          <button
                            key={theme.id} type="button" onClick={() => setEditingCategory({...editingCategory, color: theme.color, iconBg: theme.iconBg})}
                            className={`w-8 h-8 rounded-full ${theme.preview} ring-offset-2 dark:ring-offset-gray-800 transition-all duration-200 ${editingCategory.color === theme.color ? 'ring-2 ring-blue-500 scale-110 shadow-md' : 'hover:scale-110 shadow-sm'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex justify-end space-x-3">
                  <button type="button" onClick={() => setEditingCategory(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">취소</button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-600 rounded-lg flex items-center transition-colors"><Save className="w-4 h-4 mr-2" /> 저장</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {itemToDelete && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-8 h-8" /></div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">대분류 분야 삭제</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">이 업무 분야와 포함된 모든 데이터(세부업무 등)가 삭제됩니다.</p>
              <div className="flex space-x-3 justify-center">
                <button onClick={() => setItemToDelete(null)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">취소</button>
                <button onClick={() => { updatePortalData(categories.filter(cat => cat.id !== itemToDelete)); setItemToDelete(null); }} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 rounded-lg">삭제하기</button>
              </div>
            </div>
          </div>
        )}

        {subTaskToDelete !== null && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-8 h-8" /></div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">세부 업무 삭제</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">해당 상세 업무와 첨부된 파일이 모두 삭제됩니다.</p>
              <div className="flex space-x-3 justify-center">
                <button onClick={() => setSubTaskToDelete(null)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">취소</button>
                <button onClick={executeDeleteSubTask} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 rounded-lg">삭제하기</button>
              </div>
            </div>
          </div>
        )}

        {borrowingEq && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">기자재 대여 신청</h3>
                <button onClick={() => setBorrowingEq(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">기자재명</label>
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-gray-800 dark:text-gray-200 font-bold">{borrowingEq.name}</div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">대여자 성함</label>
                  <input type="text" value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">반납 예정일</label>
                  <input type="date" value={borrowDate} onChange={(e) => setBorrowDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 [color-scheme:light] dark:[color-scheme:dark]" />
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                <button onClick={() => setBorrowingEq(null)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">취소</button>
                <button onClick={() => { handleBorrowEquipment(borrowingEq.id, borrowerName, borrowDate); setBorrowingEq(null); }} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">대여 확정</button>
              </div>
            </div>
          </div>
        )}

        {isAddingEq && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">새 기자재 등록</h3>
                <button onClick={() => setIsAddingEq(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">기자재명</label>
                  <input type="text" value={newEqName} onChange={(e) => setNewEqName(e.target.value)} placeholder="예: 무선 마이크 세트" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">카테고리</label>
                  <select value={newEqCategory} onChange={(e) => setNewEqCategory(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 [color-scheme:light] dark:[color-scheme:dark]">
                    <option value="정보기기">정보기기</option>
                    <option value="과학기자재">과학기자재</option>
                    <option value="음향기기">음향기기</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                <button onClick={() => setIsAddingEq(false)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">취소</button>
                <button onClick={() => { handleAddEquipment(newEqName, newEqCategory); setIsAddingEq(false); setNewEqName(''); }} disabled={!newEqName.trim()} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:bg-gray-300">등록하기</button>
              </div>
            </div>
          </div>
        )}

        {/* Widget Settings Modal */}
      {isWidgetSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#f8f9fa] dark:bg-gray-900 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                  <Palette className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">디스플레이 설정</h2>
                  <p className="text-xs text-slate-400 font-bold">포털의 디자인을 취향에 맞게 커스터마이징 하세요.</p>
                </div>
              </div>
              <button onClick={() => setIsWidgetSettingsOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="space-y-12">
                {/* Themes Section */}
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">대시보드 테마</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {themes.map(theme => (
                      <button
                        key={theme.id}
                        onClick={() => setWidgetStyle(prev => ({ 
                          ...prev, 
                          themeId: theme.id,
                          bgColor: theme.bg,
                          cardColor: theme.card,
                          accentColor: theme.accent,
                          textColor: theme.text
                        }))}
                        className={`group relative aspect-[4/3] rounded-2xl border-2 transition-all overflow-hidden ${widgetStyle.themeId === theme.id ? 'border-blue-600 ring-4 ring-blue-600/10' : 'border-slate-100 dark:border-gray-800 hover:border-slate-200 dark:hover:border-gray-700'}`}
                      >
                        <div className="absolute inset-0 p-3 flex flex-col gap-2" style={{ backgroundColor: theme.bg }}>
                          <div className="w-full h-2 rounded-full opacity-40" style={{ backgroundColor: theme.accent }}></div>
                          <div className="flex gap-2">
                            <div className="flex-1 h-12 rounded-xl" style={{ backgroundColor: theme.card }}></div>
                            <div className="flex-1 h-12 rounded-xl" style={{ backgroundColor: theme.card }}></div>
                          </div>
                          <div className="w-2/3 h-2 rounded-full opacity-20" style={{ backgroundColor: theme.text }}></div>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                          <span className="text-white text-[10px] font-black">{theme.name}</span>
                        </div>
                        {widgetStyle.themeId === theme.id && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Transparency Section */}
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">투명도</h3>
                  </div>
                  <div className="space-y-8">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-xs font-bold text-slate-500">배경 투명도</label>
                        <span className="text-xs font-black text-blue-600">{widgetStyle.bgOpacity}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="100" step="1"
                        value={widgetStyle.bgOpacity}
                        onChange={(e) => setWidgetStyle(prev => ({ ...prev, bgOpacity: parseInt(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-xs font-bold text-slate-500">카드 투명도</label>
                        <span className="text-xs font-black text-blue-600">{widgetStyle.cardOpacity}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="100" step="1"
                        value={widgetStyle.cardOpacity}
                        onChange={(e) => setWidgetStyle(prev => ({ ...prev, cardOpacity: parseInt(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  </div>
                </section>

                {/* Colors Section */}
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">색상 조정</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {[
                      { label: '배경 색상', key: 'bgColor' },
                      { label: '카드 색상', key: 'cardColor' },
                      { label: '강조 색상', key: 'accentColor' },
                      { label: '텍스트 색상', key: 'textColor' }
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700">
                        <span className="text-xs font-bold text-slate-500">{item.label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono text-slate-400 uppercase">{(widgetStyle as any)[item.key]}</span>
                          <input 
                            type="color" 
                            value={(widgetStyle as any)[item.key]}
                            onChange={(e) => setWidgetStyle(prev => ({ ...prev, [item.key]: e.target.value, themeId: 'custom' }))}
                            className="w-8 h-8 rounded-lg border-none cursor-pointer overflow-hidden"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Card Shape Section */}
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">카드 모양</h3>
                  </div>
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-xs font-bold text-slate-500">둥글기</label>
                          <span className="text-xs font-black text-blue-600">{widgetStyle.cardRoundness}px</span>
                        </div>
                        <input 
                          type="range" min="0" max="48" step="4"
                          value={widgetStyle.cardRoundness}
                          onChange={(e) => setWidgetStyle(prev => ({ ...prev, cardRoundness: parseInt(e.target.value) }))}
                          className="w-full h-1.5 bg-slate-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-xs font-bold text-slate-500">간격</label>
                          <span className="text-xs font-black text-blue-600">{widgetStyle.cardSpacing}px</span>
                        </div>
                        <input 
                          type="range" min="8" max="40" step="4"
                          value={widgetStyle.cardSpacing}
                          onChange={(e) => setWidgetStyle(prev => ({ ...prev, cardSpacing: parseInt(e.target.value) }))}
                          className="w-full h-1.5 bg-slate-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 dark:bg-gray-700 rounded-lg">
                          <ShieldCheck className="w-4 h-4 text-slate-400" />
                        </div>
                        <span className="text-xs font-bold text-slate-500">테두리 표시</span>
                      </div>
                      <button 
                        onClick={() => setWidgetStyle(prev => ({ ...prev, showBorder: !prev.showBorder }))}
                        className={`w-12 h-6 rounded-full transition-colors relative ${widgetStyle.showBorder ? 'bg-blue-600' : 'bg-slate-200 dark:bg-gray-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${widgetStyle.showBorder ? 'left-7' : 'left-1'}`}></div>
                      </button>
                    </div>

                    {widgetStyle.showBorder && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in slide-in-from-top-2">
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <label className="text-xs font-bold text-slate-500">테두리 두께</label>
                            <span className="text-xs font-black text-blue-600">{widgetStyle.borderThickness}px</span>
                          </div>
                          <input 
                            type="range" min="1" max="4" step="1"
                            value={widgetStyle.borderThickness}
                            onChange={(e) => setWidgetStyle(prev => ({ ...prev, borderThickness: parseInt(e.target.value) }))}
                            className="w-full h-1.5 bg-slate-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700">
                          <span className="text-xs font-bold text-slate-500">테두리 색상</span>
                          <input 
                            type="color" 
                            value={widgetStyle.borderColor}
                            onChange={(e) => setWidgetStyle(prev => ({ ...prev, borderColor: e.target.value }))}
                            className="w-8 h-8 rounded-lg border-none cursor-pointer overflow-hidden"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Font Section */}
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">글꼴 (FONT)</h3>
                  </div>
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {fonts.map(font => (
                        <button
                          key={font.id}
                          onClick={() => setWidgetStyle(prev => ({ ...prev, fontFamily: font.id }))}
                          className={`p-4 rounded-2xl border-2 text-left transition-all ${widgetStyle.fontFamily === font.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-100 dark:border-gray-800 hover:border-slate-200 dark:hover:border-gray-700'}`}
                          style={{ fontFamily: font.id }}
                        >
                          <div className="text-sm font-black text-slate-900 dark:text-white mb-1">{font.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold">{font.desc}</div>
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-4">글꼴 크기</label>
                        <div className="flex bg-slate-100 dark:bg-gray-800 p-1 rounded-2xl">
                          {['small', 'medium', 'large', 'xlarge'].map(size => (
                            <button
                              key={size}
                              onClick={() => setWidgetStyle(prev => ({ ...prev, fontSize: size }))}
                              className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${widgetStyle.fontSize === size ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                              {size === 'small' ? '작게' : size === 'medium' ? '보통' : size === 'large' ? '크게' : '매우 크게'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-xs font-bold text-slate-500">대시보드 글씨 배율</label>
                          <span className="text-xs font-black text-blue-600">{widgetStyle.dashboardFontScale}%</span>
                        </div>
                        <input 
                          type="range" min="80" max="150" step="5"
                          value={widgetStyle.dashboardFontScale}
                          onChange={(e) => setWidgetStyle(prev => ({ ...prev, dashboardFontScale: parseInt(e.target.value) }))}
                          className="w-full h-1.5 bg-slate-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-end gap-3">
              <button 
                onClick={() => {
                  setWidgetStyle({
                    themeId: 'light',
                    bgColor: '#f8fafc',
                    cardColor: '#ffffff',
                    accentColor: '#2563eb',
                    textColor: '#1e293b',
                    bgOpacity: 100,
                    cardOpacity: 100,
                    bgImage: '',
                    cardRoundness: 24,
                    cardSpacing: 16,
                    showBorder: true,
                    borderThickness: 1,
                    borderColor: '#e2e8f0',
                    shadow: 'soft',
                    fontFamily: 'Pretendard',
                    fontSize: 'medium',
                    dashboardFontScale: 100
                  });
                }}
                className="px-6 py-3 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                초기화
              </button>
              <button 
                onClick={() => setIsWidgetSettingsOpen(false)}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-lg shadow-blue-600/20 transition-all"
              >
                적용 및 닫기
              </button>
            </div>
          </div>
        </div>
      )}
        {updateNotice && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[160] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <div className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black tracking-[0.18em] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      UPDATE APPLIED
                    </div>
                    <h2 className="mt-4 text-2xl font-black text-slate-900 dark:text-white tracking-tighter">새 버전이 적용되었습니다</h2>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                      프로그램이 최신 화면으로 교체되었습니다. 이번 버전부터는 앱 실행 시 변경된 버전을 감지해 안내 팝업이 표시됩니다.
                    </p>
                  </div>
                  <button onClick={() => setUpdateNotice(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-8">
                  <div className="rounded-2xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/70 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">이전 버전</p>
                    <p className="mt-2 text-xl font-black text-slate-800 dark:text-slate-100">{updateNotice.previousVersion}</p>
                  </div>
                  <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-900/20 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-500 dark:text-blue-300">현재 버전</p>
                    <p className="mt-2 text-xl font-black text-blue-700 dark:text-blue-300">{updateNotice.currentVersion}</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 dark:bg-gray-800/70 border border-slate-200 dark:border-gray-700 p-4 mb-6">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">배포 방식</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    현재 앱은 자동 다운로드 업데이트가 아니라, 새 설치 파일로 교체된 뒤 다음 실행 시 변경 내용을 안내하는 방식입니다.
                  </p>
                </div>

                <button
                  onClick={() => setUpdateNotice(null)}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-lg shadow-blue-600/20 transition-all"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}
        {isProfileModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">사용자 프로필 설정</h2>
                    <p className="text-sm text-slate-400 font-bold mt-1">포털에서 사용할 정보를 설정해 주세요.</p>
                  </div>
                  <button onClick={() => setIsProfileModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">부서 내 이름 선택</label>
                    <div className="grid grid-cols-2 gap-2">
                      {TEACHERS.map(name => (
                        <button
                          key={name}
                          onClick={() => setNewNameInput(name)}
                          className={`py-3 px-4 rounded-2xl border-2 font-bold transition-all text-sm ${newNameInput === name ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-900/20' : 'border-slate-100 dark:border-gray-800 text-slate-500 hover:border-slate-200 dark:hover:border-gray-700'}`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">직접 입력 (목록에 없는 경우)</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        value={newNameInput}
                        onChange={(e) => setNewNameInput(e.target.value)}
                        placeholder="성함을 입력하세요"
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-600 rounded-2xl outline-none font-bold text-slate-900 dark:text-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      onClick={() => {
                        if (newNameInput.trim()) {
                          setLocalUserName(newNameInput.trim());
                          localStorage.setItem('seokgwan-username', newNameInput.trim());
                          setIsProfileModalOpen(false);
                        }
                      }}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      설정 완료
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Onboarding Modal (First Time Only) */}
        {showOnboarding && (
          <div className="fixed inset-0 bg-slate-900 z-[200] flex items-center justify-center p-4 overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse" />
            
            <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[3rem] shadow-2xl border border-white/10 relative z-10 overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="p-10 text-center">
                <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3 shadow-xl shadow-blue-600/30">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-4">반갑습니다!</h1>
                <p className="text-lg text-slate-500 dark:text-slate-400 font-bold mb-10 leading-relaxed">
                  과학정보부 업무포털에 오신 것을 환영합니다.<br />
                  원활한 협업을 위해 선생님의 성함을 알려주세요.
                </p>

                <div className="space-y-8 text-left">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-1">부서원 목록에서 선택</label>
                    <div className="grid grid-cols-2 gap-3">
                      {TEACHERS.map(name => (
                        <button
                          key={name}
                          onClick={() => setNewNameInput(name)}
                          className={`py-4 px-4 rounded-2xl border-2 font-black transition-all text-base ${newNameInput === name ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-900/20 shadow-md' : 'border-slate-100 dark:border-gray-800 text-slate-400 hover:border-slate-200 dark:hover:border-gray-700'}`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-1">직접 입력</label>
                    <div className="relative">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="text"
                        value={newNameInput}
                        onChange={(e) => setNewNameInput(e.target.value)}
                        placeholder="성함을 입력하세요"
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-600 rounded-2xl outline-none font-bold text-lg text-slate-900 dark:text-white transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <button 
                    disabled={!newNameInput.trim()}
                    onClick={() => {
                      if (newNameInput.trim()) {
                        const finalName = newNameInput.trim();
                        setLocalUserName(finalName);
                        localStorage.setItem('seokgwan-username', finalName);
                        setShowOnboarding(false);
                      }
                    }}
                    className="w-full py-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-gray-800 disabled:text-slate-400 text-white rounded-2xl font-black text-xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-3 group"
                  >
                    포털 시작하기
                    <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Management Modal */}
        {isCategorySettingsOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
              <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                    <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">부서 업무 목록 관리</h2>
                </div>
                <button onClick={() => { setIsCategorySettingsOpen(false); setIsAddingCategory(false); }} className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {!isAddingCategory ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-6">
                      <p className="text-sm text-slate-500 font-medium">부서의 주요 업무 카테고리를 추가하거나 삭제할 수 있습니다.</p>
                      <button 
                        onClick={() => setIsAddingCategory(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20"
                      >
                        <Plus className="w-4 h-4" /> 새 업무 추가
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {categories.map((cat) => (
                        <div key={cat.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-gray-800/50 rounded-2xl border border-slate-100 dark:border-gray-700 group hover:border-blue-200 dark:hover:border-blue-900 transition-all">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${cat.iconBg}`}>
                              {(() => { const Icon = availableIcons[cat.iconName] || Microscope; return <Icon className="w-5 h-5 text-slate-700 dark:text-slate-300" />; })()}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white">{cat.title}</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{cat.assignee}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              if(window.confirm(`'${cat.title}' 업무를 삭제하시겠습니까?\n해당 업무에 등록된 모든 세부 업무와 메모가 삭제됩니다.`)) {
                                handleDeleteCategory(cat.id);
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center gap-3 mb-2">
                      <button onClick={() => setIsAddingCategory(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-full">
                        <ChevronRight className="w-5 h-5 rotate-180 text-slate-400" />
                      </button>
                      <h3 className="font-black text-lg text-slate-900 dark:text-white">새 부서 업무 등록</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">업무 제목</label>
                        <input 
                          type="text" 
                          placeholder="예: 정보보안 및 개인정보보호"
                          value={newCategoryForm.title}
                          onChange={(e) => setNewCategoryForm({...newCategoryForm, title: e.target.value})}
                          className="w-full px-5 py-3 bg-slate-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-600 rounded-2xl outline-none font-bold text-slate-900 dark:text-white transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">담당자</label>
                          <input 
                            type="text" 
                            placeholder="예: 홍길동 (정보)"
                            value={newCategoryForm.assignee}
                            onChange={(e) => setNewCategoryForm({...newCategoryForm, assignee: e.target.value})}
                            className="w-full px-5 py-3 bg-slate-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-600 rounded-2xl outline-none font-bold text-slate-900 dark:text-white transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">아이콘 선택</label>
                          <select 
                            value={newCategoryForm.iconName}
                            onChange={(e) => setNewCategoryForm({...newCategoryForm, iconName: e.target.value})}
                            className="w-full px-5 py-3 bg-slate-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-600 rounded-2xl outline-none font-bold text-slate-900 dark:text-white transition-all appearance-none"
                          >
                            {Object.keys(availableIcons).map(icon => (
                              <option key={icon} value={icon}>{icon}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">테마 색상</label>
                        <div className="flex flex-wrap gap-2">
                          {colorThemes.map((theme, i) => (
                            <button 
                              key={i}
                              onClick={() => setNewCategoryForm({...newCategoryForm, color: theme.color, iconBg: theme.iconBg})}
                              className={`w-10 h-10 rounded-xl border-2 transition-all ${newCategoryForm.color === theme.color ? 'border-blue-600 scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                              style={{ backgroundColor: theme.preview.replace('bg-', '') }}
                            >
                              <div className={`w-full h-full rounded-lg ${theme.preview}`}></div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">업무 설명 (요약)</label>
                        <textarea 
                          rows={3}
                          placeholder="업무에 대한 간단한 설명을 입력하세요."
                          value={newCategoryForm.description}
                          onChange={(e) => setNewCategoryForm({...newCategoryForm, description: e.target.value})}
                          className="w-full px-5 py-3 bg-slate-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-600 rounded-2xl outline-none font-bold text-slate-900 dark:text-white transition-all resize-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button 
                        onClick={() => setIsAddingCategory(false)}
                        className="flex-1 py-4 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black transition-all"
                      >
                        취소
                      </button>
                      <button 
                        onClick={handleAddCategory}
                        className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-xl shadow-blue-600/20 transition-all"
                      >
                        업무 등록하기
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);
}
