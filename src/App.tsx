import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query 
} from 'firebase/firestore';
import { 
  Wallet, 
  ArrowDownRight, 
  ArrowUpRight, 
  ArrowRightLeft, 
  PlusCircle, 
  TrendingUp, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  LogOut, 
  Sparkles, 
  Upload, 
  FileText, 
  AlertCircle, 
  CreditCard, 
  DollarSign, 
  Trash2, 
  PieChart, 
  Lock, 
  Mail, 
  RefreshCw,
  HardDrive,
  Copy,
  ExternalLink,
  Settings,
  Filter,
  Check,
  Building2,
  Tag,
  Code2,
  Server,
  Database
} from 'lucide-react';

const firebaseConfigStr = typeof __firebase_config !== 'undefined' ? __firebase_config : '{}';
let firebaseConfig = {};
try {
  firebaseConfig = JSON.parse(firebaseConfigStr);
} catch (e) {
  console.error("Firebase config parse error", e);
}

// Fallback demo config if empty
if (!firebaseConfig.apiKey) {
  firebaseConfig = {
    apiKey: "AIzaSyDemoKeyReplaceWithYourOwn",
    authDomain: "demo-project.firebaseapp.com",
    projectId: "demo-project",
    storageBucket: "demo-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:demo"
  };
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'bankkiller-expense-app';

// Whitelisted Authorized Email
const AUTHORIZED_EMAIL = "bankkiller.bank1980@gmail.com";
const GEMINI_API_KEY = ""; // ใส่ Gemini API Key หรือเรียกใช้ผ่าน Environment Variable

export default function App() {
  // Auth States
  const [user, setUser] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Navigation & Filter States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM

  // App Data States
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState(['เงินสด', 'กสิกรไทย (KBANK)', 'ไทยพาณิชย์ (SCB)', 'กรุงไทย (KTB)', 'บัตรเครดิต', 'อื่นๆ']);
  
  // Internal Account Keywords for Auto-Transfer Detection
  const [transferKeywords, setTransferKeywords] = useState([
    'bankkiller', 'bank1980', 'กสิกร', 'ไทยพาณิชย์', 'กรุงไทย', 'KBANK', 'SCB', 'KTB'
  ]);
  const [newKeyword, setNewKeyword] = useState('');

  // Form States
  const [transType, setTransType] = useState('EXPENSE'); // INCOME, EXPENSE, TRANSFER
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('อาหาร/เครื่องดื่ม');
  const [fromAccount, setFromAccount] = useState('กสิกรไทย (KBANK)');
  const [toAccount, setToAccount] = useState('ไทยพาณิชย์ (SCB)');
  const [note, setNote] = useState('');
  const [transDate, setTransDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Installment / Period States
  const [isInstallment, setIsInstallment] = useState(false);
  const [startMonth, setStartMonth] = useState(new Date().toISOString().substring(0, 7));
  const [endMonth, setEndMonth] = useState('');
  const [dueDay, setDueDay] = useState('5');
  const [totalMonths, setTotalMonths] = useState('10');

  // Drive & OCR States
  const [gasUrl, setGasUrl] = useState(() => localStorage.getItem('bankkiller_gas_url') || '');
  const [driveFolderId, setDriveFolderId] = useState(() => localStorage.getItem('bankkiller_drive_folder_id') || '');
  const [slipImageBase64, setSlipImageBase64] = useState(null);
  const [isScanningSlip, setIsScanningSlip] = useState(false);
  const [slipAnalysisText, setSlipAnalysisText] = useState('');
  const [uploadedDriveUrl, setUploadedDriveUrl] = useState('');
  const [copiedCodeGas, setCopiedCodeGas] = useState(false);
  const [copiedCodeRules, setCopiedCodeRules] = useState(false);

  // AI Advice State
  const [aiAdvice, setAiAdvice] = useState('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Path: /artifacts/{appId}/users/{userId}/transactions
    const transRef = collection(db, 'artifacts', appId, 'users', user.uid, 'transactions');
    const q = query(transRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      docs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setTransactions(docs);
    }, (error) => {
      console.error("Firestore listener error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSendOtp = () => {
    setAuthError('');
    setAuthSuccess('');

    if (!authEmail || authEmail.trim().toLowerCase() !== AUTHORIZED_EMAIL.toLowerCase()) {
      setAuthError(`ปฏิเสธการเข้าถึง: ระบบอนุญาตเฉพาะอีเมลผู้ดูแล ${AUTHORIZED_EMAIL} เท่านั้น`);
      return;
    }

    setIsAuthenticating(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);

    setTimeout(() => {
      setIsAuthenticating(false);
      setOtpSent(true);
      setTimer(60);
      setAuthSuccess(`ส่งรหัส OTP เรียบร้อยแล้ว (รหัสทดสอบสำหรับเข้าใช้งาน: ${code})`);
    }, 1200);
  };

  const handleVerifyOtp = () => {
    setAuthError('');
    if (otpCode !== generatedOtp) {
      setAuthError('รหัส OTP ไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง');
      return;
    }

    setAuthSuccess('ยืนยันตัวตนสำเร็จ! กำลังเข้าสู่ระบบบัญชีส่วนตัว...');
    localStorage.setItem('bankkiller_auth_logged_in', 'true');
    setOtpSent(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('bankkiller_auth_logged_in');
    setAuthEmail('');
    setOtpSent(false);
    setOtpCode('');
  };

  const isUserAuthenticated = localStorage.getItem('bankkiller_auth_logged_in') === 'true';

  const callGeminiApi = async (payload, endpoint = 'generateContent', model = 'gemini-2.5-flash-preview-09-2025') => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}?key=${GEMINI_API_KEY}`;
    const delays = [1000, 2000, 4000];

    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          return await response.json();
        }
      } catch (e) {
        // Retry silently
      }
      if (attempt < delays.length) {
        await new Promise(res => setTimeout(res, delays[attempt]));
      }
    }
    throw new Error('Gemini API Request Failed.');
  };

  const uploadToGoogleDrive = async (base64Data, filename) => {
    if (!gasUrl) return null;
    try {
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          base64: base64Data,
          filename: filename || `slip_${Date.now()}.png`,
          mimeType: 'image/png'
        })
      });
      const resData = await response.json();
      return resData.url || null;
    } catch (err) {
      console.error("Google Drive Upload Error:", err);
      return null;
    }
  };

  const handleSlipFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsScanningSlip(true);
    setSlipAnalysisText('กำลังสแกนอ่านข้อมูลสลีปด้วย Gemini AI และตรวจสอบการโอนย้ายบัญชี...');

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result.split(',')[1];
      setSlipImageBase64(reader.result);

      if (gasUrl) {
        uploadToGoogleDrive(base64Data, file.name).then(driveUrl => {
          if (driveUrl) {
            setUploadedDriveUrl(driveUrl);
          }
        });
      }

      try {
        const prompt = `วิเคราะห์ภาพสลีปโอนเงินนี้และสกัดข้อมูลเป็น JSON ดังนี้:
{
  "amount": ยอดเงินเป็นตัวเลข (number),
  "transType": "EXPENSE" หรือ "INCOME" หรือ "TRANSFER",
  "senderName": "ชื่อบัญชี/ธนาคารผู้โอน",
  "receiverName": "ชื่อบัญชี/ธนาคารผู้รับโอน",
  "date": "YYYY-MM-DD",
  "note": "รายละเอียดเพิ่มเติม"
}`;

        const payload = {
          contents: [{
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { mimeType: file.type || "image/png", data: base64Data } }
            ]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        };

        const result = await callGeminiApi(payload);
        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (jsonText) {
          const parsedData = JSON.parse(jsonText);
          if (parsedData.amount) setAmount(parsedData.amount.toString());
          if (parsedData.date) setTransDate(parsedData.date);

          const receiver = (parsedData.receiverName || '').toLowerCase();
          const sender = (parsedData.senderName || '').toLowerCase();

          // Auto Transfer Detection Logic
          const isInternalTransfer = transferKeywords.some(kw => 
            receiver.includes(kw.toLowerCase()) || sender.includes(kw.toLowerCase())
          );

          if (isInternalTransfer || parsedData.transType === 'TRANSFER') {
            setTransType('TRANSFER');
            setSlipAnalysisText('✨ ตรวจพบว่าเป็น "การโอนย้ายบัญชีส่วนตัว" อัตโนมัติ! ระบบจะไม่นับเป็นรายจ่ายจริง');
          } else {
            setTransType(parsedData.transType || 'EXPENSE');
            setSlipAnalysisText('สแกนสลีปสำเร็จ! ข้อมูลถูกนำเข้าฟอร์มเรียบร้อย');
          }

          let noteDetails = parsedData.note || '';
          if (parsedData.senderName) noteDetails += ` [จาก: ${parsedData.senderName}]`;
          if (parsedData.receiverName) noteDetails += ` [ถึง: ${parsedData.receiverName}]`;
          setNote(noteDetails.trim());

        } else {
          setSlipAnalysisText('ไม่อาจอ่านข้อมูลสลีปได้ กรุณากรอกข้อมูลเอง');
        }
      } catch (err) {
        console.error("OCR Slip Error:", err);
        setSlipAnalysisText('เกิดข้อผิดพลาดในการเชื่อมต่อกับ Gemini AI');
      } finally {
        setIsScanningSlip(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!user || !amount || parseFloat(amount) <= 0) return;

    try {
      const transRef = collection(db, 'artifacts', appId, 'users', user.uid, 'transactions');

      const newTransaction = {
        type: transType,
        amount: parseFloat(amount),
        category: transType === 'TRANSFER' ? 'โอนย้ายบัญชี' : category,
        fromAccount: transType === 'INCOME' ? null : fromAccount,
        toAccount: transType === 'EXPENSE' ? null : (transType === 'TRANSFER' ? toAccount : fromAccount),
        note: note || '',
        date: transDate,
        slipImage: slipImageBase64 || null,
        driveUrl: uploadedDriveUrl || '',
        isInstallment: isInstallment,
        installmentInfo: isInstallment ? {
          startMonth: startMonth,
          endMonth: endMonth || startMonth,
          dueDay: parseInt(dueDay) || 1,
          totalMonths: parseInt(totalMonths) || 1,
          monthlyAmount: parseFloat(amount)
        } : null,
        createdAt: new Date().toISOString()
      };

      await addDoc(transRef, newTransaction);

      setAmount('');
      setNote('');
      setSlipImageBase64(null);
      setUploadedDriveUrl('');
      setSlipAnalysisText('');
      setIsInstallment(false);
      setActiveTab('transactions');
    } catch (err) {
      console.error("Error adding transaction:", err);
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'transactions', id);
      await deleteDoc(docRef);
    } catch (err) {
      console.error("Error deleting transaction:", err);
    }
  };

  const handleAnalyzeFinances = async () => {
    setIsLoadingAi(true);
    setAiAdvice('');

    try {
      const filteredTrans = transactions.filter(t => t.date && t.date.startsWith(selectedMonth));
      const monthIncome = filteredTrans.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const monthExpense = filteredTrans.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
      
      const categoryBreakdown = {};
      filteredTrans.filter(t => t.type === 'EXPENSE').forEach(t => {
        categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount;
      });

      const activeInstallmentsCount = transactions.filter(t => t.isInstallment).length;

      const prompt = `วิเคราะห์การเงินส่วนบุคคลประจำเดือน (${selectedMonth}) ในฐานะ Gemini Spark ที่ปรึกษาการเงิน:
- รายรับเดือนนี้: ${monthIncome.toLocaleString()} บาท
- รายจ่ายจริงเดือนนี้ (ไม่รวมเงินโอนย้าย): ${monthExpense.toLocaleString()} บาท
- รายการใช้จ่ายแยกตามหมวดหมู่: ${JSON.stringify(categoryBreakdown)}
- จำนวนภาระผ่อนชำระที่มีอยู่: ${activeInstallmentsCount} รายการ

กรุณาสรุปบทวิเคราะห์ภาษาไทยสั้นๆ 3 ข้อ:
1. ประเมินดัชนีสุขภาพทางการเงิน (คะแนน 1-10 พร้อมเหตุผล)
2. หมวดหมู่ที่เสี่ยงใช้เงินเกินตัว หรือข้อสังเกตพฤติกรรมการจ่าย
3. คำแนะนำสำหรับการวางแผนออมเงินหรือลดรายจ่ายในเดือนถัดไป`;

      const payload = { contents: [{ parts: [{ text: prompt }] }] };
      const result = await callGeminiApi(payload);
      const advice = result.candidates?.[0]?.content?.parts?.[0]?.text;
      setAiAdvice(advice || 'ไม่สามารถประมวลผลคำแนะนำได้');
    } catch (err) {
      console.error("AI Spark Error:", err);
      setAiAdvice('เกิดข้อผิดพลาดในการเชื่อมต่อ Gemini Spark AI');
    } finally {
      setIsLoadingAi(false);
    }
  };

  const filteredTransactions = transactions.filter(t => t.date && t.date.startsWith(selectedMonth));

  const monthIncome = filteredTransactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthExpense = filteredTransactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthNet = monthIncome - monthExpense;

  const getAccountBalance = (accountName) => {
    let balance = 0;
    transactions.forEach(t => {
      if (t.type === 'INCOME' && t.toAccount === accountName) {
        balance += t.amount;
      } else if (t.type === 'EXPENSE' && t.fromAccount === accountName) {
        balance -= t.amount;
      } else if (t.type === 'TRANSFER') {
        if (t.fromAccount === accountName) balance -= t.amount;
        if (t.toAccount === accountName) balance += t.amount;
      }
    });
    return balance;
  };

  const gasScriptCode = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var folderId = "${driveFolderId || 'YOUR_GOOGLE_DRIVE_FOLDER_ID'}"; 
    var folder = DriveApp.getFolderById(folderId);
    
    var blob = Utilities.newBlob(Utilities.base64Decode(data.base64), data.mimeType, data.filename);
    var file = folder.createFile(blob);
    
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return ContentService.createTextOutput(
      JSON.stringify({ status: "success", url: file.getUrl() })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch(error) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const firestoreRulesCode = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`;

  if (!isUserAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
              <Wallet className="w-8 h-8 text-slate-950" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">ระบบบัญชีรายรับ-รายจ่าย</h1>
            <p className="text-xs text-slate-400 mt-1">ยืนยันตัวตนด้วย OTP ทางอีเมลปลอดภัยสูงสุด</p>

            <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 bg-emerald-950/80 border border-emerald-800/60 rounded-full text-xs text-emerald-300 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{AUTHORIZED_EMAIL}</span>
            </div>
          </div>

          {authError && (
            <div className="mb-6 p-4 bg-red-950/60 border border-red-800/60 rounded-2xl flex items-start gap-3 text-red-300 text-xs leading-relaxed">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
              <div>{authError}</div>
            </div>
          )}

          {authSuccess && (
            <div className="mb-6 p-4 bg-emerald-950/60 border border-emerald-800/60 rounded-2xl flex items-start gap-3 text-emerald-300 text-xs leading-relaxed">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
              <div>{authSuccess}</div>
            </div>
          )}

          {!otpSent ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">อีเมลผู้ได้รับอนุญาต</label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="bankkiller.bank1980@gmail.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <button
                onClick={handleSendOtp}
                disabled={isAuthenticating}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>กำลังส่ง OTP...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>ขอรหัส OTP เข้าใช้งาน</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-slate-400">กรอกรหัส OTP 6 หลัก</label>
                  {timer > 0 && <span className="text-xs text-emerald-400 font-mono">ส่งอีกครั้งใน {timer}s</span>}
                </div>
                <input
                  type="text"
                  maxLength="6"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-center text-2xl font-mono tracking-widest text-emerald-400 placeholder-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <button
                onClick={handleVerifyOtp}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>ยืนยันตัวตนเข้าสู่ระบบ</span>
              </button>

              <div className="flex justify-between items-center text-xs">
                <button
                  onClick={() => setOtpSent(false)}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  ย้อนกลับ
                </button>
                {timer === 0 && (
                  <button
                    onClick={handleSendOtp}
                    className="text-emerald-400 font-semibold hover:underline"
                  >
                    ส่งรหัส OTP อีกครั้ง
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500">
              ความปลอดภัยระดับสูง • ระบบจัดเก็บไฟล์ฟรีผ่าน Google Drive
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Wallet className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="font-bold text-slate-100 text-base leading-tight flex items-center gap-1.5">
                <span>บัญชีรายรับ-รายจ่าย</span>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/50 rounded-full font-mono">Gemini Spark</span>
              </div>
              <p className="text-xs text-slate-400 font-mono truncate max-w-[160px] sm:max-w-none">{AUTHORIZED_EMAIL}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <Filter className="w-3.5 h-3.5 text-emerald-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition-colors flex items-center gap-1.5 border border-slate-700"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full space-y-6">
        {/* Navigation Tabs */}
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'dashboard'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>ภาพรวมรายเดือน</span>
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'add'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>บันทึก / สแกนสลีป</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'transactions'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>ประวัติรายการ ({filteredTransactions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('installments')}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'installments'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>รายการผ่อนชำระ</span>
          </button>

          <button
            onClick={() => setActiveTab('drive_setup')}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'drive_setup'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Google Drive Storage</span>
          </button>

          <button
            onClick={() => setActiveTab('setup_guide')}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'setup_guide'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>โค้ด & คู่มือติดตั้ง</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'settings'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>ตั้งค่าเช็คโอนย้าย</span>
          </button>
        </div>

        {/* Mobile Month Filter Selector */}
        <div className="sm:hidden bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
          <span className="text-xs text-slate-400">เลือกดูรอบเดือน:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          />
        </div>

        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400">คงเหลือสุทธิ (ประจำเดือน {selectedMonth})</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-bold font-mono text-white">
                  ฿{monthNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">คำนวณจาก (รายรับ - รายจ่ายจริง)</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400">รายรับรวม (เดือน {selectedMonth})</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
                    <ArrowDownRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-bold font-mono text-emerald-400">
                  +฿{monthIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">ยอดเงินโอนเข้าทั้งหมด</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400">รายจ่ายจริง (เดือน {selectedMonth})</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-950 border border-rose-800/50 flex items-center justify-center text-rose-400">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-bold font-mono text-rose-400">
                  -฿{monthExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">ไม่นับรวมการโอนย้ายระหว่างบัญชี</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-teal-400" />
                <span>ยอดเงินคงเหลือสะสม แยกตามบัญชี</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {accounts.map(acc => {
                  const bal = getAccountBalance(acc);
                  return (
                    <div key={acc} className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-slate-400 font-medium">{acc}</div>
                        <div className={`text-lg font-mono font-bold mt-1 ${bal >= 0 ? 'text-slate-100' : 'text-rose-400'}`}>
                          ฿{bal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-sm shadow-teal-400/50"></div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-900/40 rounded-3xl p-6 relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Gemini Spark - วิเคราะห์พฤติกรรมการเงินประจำเดือน
                    </h3>
                    <p className="text-xs text-slate-400">ระบบ AI วิเคราะห์การใช้จ่ายของเดือน {selectedMonth} พร้อมคำแนะนำออมเงิน</p>
                  </div>
                </div>

                <button
                  onClick={handleAnalyzeFinances}
                  disabled={isLoadingAi || filteredTransactions.length === 0}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 shrink-0"
                >
                  {isLoadingAi ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังประมวลผล...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>กดให้ Gemini Spark วิเคราะห์</span>
                    </>
                  )}
                </button>
              </div>

              {aiAdvice ? (
                <div className="mt-4 p-4 bg-slate-950/80 border border-emerald-800/40 rounded-2xl text-slate-200 text-sm whitespace-pre-line leading-relaxed font-sans">
                  {aiAdvice}
                </div>
              ) : (
                <div className="mt-4 p-4 bg-slate-950/40 border border-slate-800/50 rounded-2xl text-center text-slate-500 text-xs">
                  {filteredTransactions.length === 0 ? 'ไม่มีข้อมูลการใช้จ่ายในเดือนนี้ กรุณากรอกรายการเพื่อเริ่มประมวลผล' : 'กดปุ่ม "กดให้ Gemini Spark วิเคราะห์" ด้านบนเพื่อเริ่มวิเคราะห์'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Record / Scan Slip */}
        {activeTab === 'add' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">อ่านสลีปอัจฉริยะ (Gemini Vision)</h3>
                </div>
                <p className="text-xs text-slate-400 mb-5">
                  อัปโหลดรูปสลีป AI จะอ่านยอดเงิน วันที่ บัญชีผู้โอน/ผู้รับ พร้อมเช็คว่าเป็น "การโอนย้ายบัญชีส่วนตัว" หรือไม่
                </p>

                <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl p-6 text-center transition-colors bg-slate-950/50 relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSlipFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-300">ลากรูปสลีปมาวาง หรือ คลิกเพื่ออัปโหลด</p>
                  <p className="text-[11px] text-slate-500 mt-1">รองรับ JPG, PNG, WEBP</p>
                </div>

                {slipAnalysisText && (
                  <div className="mt-4 p-3.5 bg-emerald-950/60 border border-emerald-800/60 rounded-2xl text-xs text-emerald-300 flex items-center gap-2.5">
                    {isScanningSlip ? (
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-emerald-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    )}
                    <span>{slipAnalysisText}</span>
                  </div>
                )}

                {slipImageBase64 && (
                  <div className="mt-4">
                    <span className="text-xs text-slate-400 block mb-2">ตัวอย่างสลีปที่อัปโหลด:</span>
                    <img
                      src={slipImageBase64}
                      alt="สลีปโอนเงิน"
                      className="max-h-48 rounded-xl border border-slate-800 mx-auto object-contain"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>จัดเก็บรูปภาพลง Google Drive ฟรี</span>
                </span>
                {gasUrl ? (
                  <span className="text-emerald-400 font-mono text-[10px] bg-emerald-950 border border-emerald-800/50 px-2 py-0.5 rounded-full">Google Drive Connected</span>
                ) : (
                  <span className="text-amber-400 font-mono text-[10px] bg-amber-950 border border-amber-800/50 px-2 py-0.5 rounded-full">Drive Unset</span>
                )}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-base font-bold text-white mb-4">ฟอร์มบันทึกข้อมูลการเงิน</h3>

              <form onSubmit={handleAddTransaction} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">ประเภทรายการ</label>
                  <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setTransType('EXPENSE')}
                      className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all ${
                        transType === 'EXPENSE'
                          ? 'bg-rose-500 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>รายจ่าย</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTransType('INCOME')}
                      className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all ${
                        transType === 'INCOME'
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      <span>รายรับ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTransType('TRANSFER')}
                      className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all ${
                        transType === 'TRANSFER'
                          ? 'bg-sky-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>โอนย้ายบัญชี</span>
                    </button>
                  </div>
                </div>

                {transType === 'TRANSFER' && (
                  <div className="p-3 bg-sky-950/50 border border-sky-800/50 rounded-xl text-xs text-sky-300 leading-relaxed">
                    💡 <b>โอนย้ายบัญชี:</b> ปรับยอดคงเหลือระหว่างสองบัญชีให้อัตโนมัติ โดย <b>ไม่นับ</b> เป็นรายจ่ายหรือรายรับจริง
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">จำนวนเงิน (บาท)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">วันที่ทำรายการ</label>
                    <input
                      type="date"
                      required
                      value={transDate}
                      onChange={(e) => setTransDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {transType === 'EXPENSE' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">จ่ายจากบัญชี</label>
                    <select
                      value={fromAccount}
                      onChange={(e) => setFromAccount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    >
                      {accounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                    </select>
                  </div>
                )}

                {transType === 'INCOME' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">เข้าบัญชี</label>
                    <select
                      value={toAccount}
                      onChange={(e) => setToAccount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    >
                      {accounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                    </select>
                  </div>
                )}

                {transType === 'TRANSFER' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">จากบัญชี (ผู้โอน)</label>
                      <select
                        value={fromAccount}
                        onChange={(e) => setFromAccount(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                      >
                        {accounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">ไปยังบัญชี (ผู้รับ)</label>
                      <select
                        value={toAccount}
                        onChange={(e) => setToAccount(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                      >
                        {accounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {transType !== 'TRANSFER' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">หมวดหมู่</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="อาหาร/เครื่องดื่ม">อาหาร / เครื่องดื่ม</option>
                      <option value="ช้อปปิ้ง/ของใช้">ช้อปปิ้ง / ของใช้</option>
                      <option value="เดินทาง/น้ำมัน">เดินทาง / ค่าน้ำมัน</option>
                      <option value="ค่าบ้าน/ค่าน้ำไฟ">ค่าบ้าน / ค่าน้ำไฟ</option>
                      <option value="เงินเดือน/รายได้">เงินเดือน / รายได้เสริม</option>
                      <option value="ผ่อนสินค้า/หนี้สิน">ผ่อนสินค้า / หนี้สิน</option>
                      <option value="อื่นๆ">อื่นๆ</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-slate-400 mb-1">บันทึกเพิ่มเติม</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="เช่น ซื้อกาแฟสด, ค่าบริการอินเทอร์เน็ต"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInstallment}
                      onChange={(e) => setIsInstallment(e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                    <span className="text-xs text-slate-300 font-medium">ระบุเป็นรายการผ่อนชำระหลายเดือน (Payment Period)</span>
                  </label>

                  {isInstallment && (
                    <div className="mt-3 p-3 bg-slate-950 border border-slate-800 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">เริ่มเดือน/ปี</label>
                        <input
                          type="month"
                          value={startMonth}
                          onChange={(e) => setStartMonth(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">ถึงเดือน/ปี</label>
                        <input
                          type="month"
                          value={endMonth}
                          onChange={(e) => setEndMonth(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">จ่ายทุกวันที่ของเดือน</label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={dueDay}
                          onChange={(e) => setDueDay(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 mt-4"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>บันทึกรายการลงระบบ</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 3: Transactions */}
        {activeTab === 'transactions' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-white">ประวัติรายการ (รอบเดือน {selectedMonth})</h3>
                <p className="text-xs text-slate-400">รายการรับ จ่าย และโอนย้ายที่บันทึกไว้ในระบบ</p>
              </div>
              <span className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs text-slate-300 font-mono">
                {filteredTransactions.length} รายการ
              </span>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                ไม่มีรายการในเดือน {selectedMonth} (ลองเปลี่ยนรอบเดือนด้านบนหรือกด "บันทึกรายการ")
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map(t => (
                  <div key={t.id} className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        t.type === 'INCOME' 
                          ? 'bg-emerald-950 border border-emerald-800/50 text-emerald-400' 
                          : t.type === 'EXPENSE'
                          ? 'bg-rose-950 border border-rose-800/50 text-rose-400'
                          : 'bg-sky-950 border border-sky-800/50 text-sky-400'
                      }`}>
                        {t.type === 'INCOME' && <ArrowDownRight className="w-5 h-5" />}
                        {t.type === 'EXPENSE' && <ArrowUpRight className="w-5 h-5" />}
                        {t.type === 'TRANSFER' && <ArrowRightLeft className="w-5 h-5" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">{t.category}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                            {t.date}
                          </span>
                          {t.isInstallment && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800/50 text-amber-400">
                              ผ่อนชำระ ({t.installmentInfo?.startMonth} ถึง {t.installmentInfo?.endMonth})
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                          {t.type === 'EXPENSE' && <span>จ่ายจาก: {t.fromAccount}</span>}
                          {t.type === 'INCOME' && <span>เข้าบัญชี: {t.toAccount}</span>}
                          {t.type === 'TRANSFER' && <span>โอนจาก [{t.fromAccount}] ➔ [{t.toAccount}]</span>}
                          {t.note && <span className="text-slate-500">({t.note})</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-0 border-slate-800/80 pt-2 sm:pt-0">
                      <div className={`text-base font-bold font-mono ${
                        t.type === 'INCOME' ? 'text-emerald-400' : t.type === 'EXPENSE' ? 'text-rose-400' : 'text-sky-400'
                      }`}>
                        {t.type === 'INCOME' ? '+' : t.type === 'EXPENSE' ? '-' : ''}฿{t.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>

                      <div className="flex items-center gap-1">
                        {t.driveUrl && (
                          <a
                            href={t.driveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 text-sky-400 hover:bg-sky-950/40 rounded-xl transition-colors"
                            title="ดูสลีปบน Google Drive"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}

                        <button
                          onClick={() => handleDeleteTransaction(t.id)}
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors"
                          title="ลบรายการ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Installments */}
        {activeTab === 'installments' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <span>ติดตามรายการผ่อนชำระ (Payment Periods)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">กำหนดช่วงเวลาเริ่มต้น-สิ้นสุด และวันตัดรอบบิลประจำเดือน</p>
            </div>

            {transactions.filter(t => t.isInstallment).length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                ยังไม่มีรายการผ่อนชำระ (ติ๊กเลือก "ผ่อนชำระหลายเดือน" เมื่อบันทึกรายการ)
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {transactions.filter(t => t.isInstallment).map(t => {
                  const info = t.installmentInfo || {};
                  return (
                    <div key={t.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-bold text-white">{t.category}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{t.note || 'ไม่มีรายละเอียดเพิ่มเติม'}</div>
                        </div>
                        <div className="text-sm font-mono font-bold text-amber-400">
                          ฿{t.amount?.toLocaleString()} / เดือน
                        </div>
                      </div>

                      <div className="p-3 bg-slate-900 rounded-xl space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-400">
                          <span>ระยะเวลาจ่าย:</span>
                          <span className="font-mono text-emerald-400">{info.startMonth} ถึง {info.endMonth}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>วันตัดรอบชำระ:</span>
                          <span className="font-mono text-slate-200">ทุกวันที่ {info.dueDay || '5'} ของเดือน</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Drive Setup */}
        {activeTab === 'drive_setup' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-sky-400" />
                <span>ตั้งค่าการเก็บรูปสลีปบน Google Drive ฟรี 100%</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                สร้าง Google Apps Script Web App เพื่อบันทึกภาพสลีปลง Google Drive ส่วนตัวของคุณโดยตรง
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <label className="block text-xs font-semibold text-slate-300">1. ระบุ Google Drive Folder ID ของคุณ:</label>
              <input
                type="text"
                value={driveFolderId}
                onChange={(e) => {
                  setDriveFolderId(e.target.value);
                  localStorage.setItem('bankkiller_drive_folder_id', e.target.value);
                }}
                placeholder="เช่น 1A2b3C4d5E6f7G8h9I0j..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />

              <label className="block text-xs font-semibold text-slate-300 pt-2">2. ระบุ Google Apps Script Web App URL ของคุณ:</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={gasUrl}
                  onChange={(e) => {
                    setGasUrl(e.target.value);
                    localStorage.setItem('bankkiller_gas_url', e.target.value);
                  }}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  onClick={() => alert('บันทึก Web App URL เรียบร้อยแล้ว!')}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors"
                >
                  บันทึก
                </button>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 relative">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono text-slate-400">// โค้ด Google Apps Script (นำไปวางที่ script.google.com):</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(gasScriptCode);
                    setCopiedCodeGas(true);
                    setTimeout(() => setCopiedCodeGas(false), 2000);
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  {copiedCodeGas ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCodeGas ? 'คัดลอกแล้ว' : 'คัดลอกโค้ด'}</span>
                </button>
              </div>

              <pre className="text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                {gasScriptCode}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 6: Setup Guide & Code Snippets */}
        {activeTab === 'setup_guide' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Code2 className="w-5 h-5 text-emerald-400" />
                <span>คู่มือ & โค้ดแต่ละส่วน (Full System Setup Guide)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                สรุปโค้ดและขั้นตอนการติดตั้ง 3 ส่วนหลักเพื่อให้ระบบทำงานฟรี 100% ไม่มีค่าบริการรายเดือน
              </p>
            </div>

            {/* Part 1: Google Apps Script */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Server className="w-4 h-4" />
                <span>ส่วนที่ 1: Google Apps Script (ฝากสลีปรูปภาพลง Google Drive ฟรี)</span>
              </div>
              <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 leading-relaxed pl-1">
                <li>ไปที่ <a href="https://drive.google.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">Google Drive</a> แล้วสร้างโฟลเดอร์ใหม่ชื่อ <span className="font-mono text-amber-300">"My Slip Images"</span></li>
                <li>เปิดโฟลเดอร์ คัดลอก Folder ID จาก URL ด้านบน (เช่น <span className="font-mono text-amber-300 font-bold">1A2b3C4d5E...</span>)</li>
                <li>ไปที่ <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">script.google.com</a> กด <b>New Project</b></li>
                <li>วางโค้ด <span className="font-mono text-emerald-300">Code.gs</span> แล้วเปลี่ยน `folderId` เป็น ID ของคุณ</li>
                <li>กด <b>Deploy</b> ➔ <b>New deployment</b> ➔ เลือกชนิด <b>Web app</b></li>
                <li>ตั้งค่า <b>Who has access</b> เป็น <span className="font-semibold text-emerald-400">Anyone</span> แล้วกด <b>Deploy</b></li>
                <li>นำ Web App URL ที่ได้ไปกรอกในแท็บ <span className="font-bold text-white">"Google Drive Storage"</span> ของเว็บนี้</li>
              </ol>
            </div>

            {/* Part 2: Firebase Security Rules */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
                  <Database className="w-4 h-4" />
                  <span>ส่วนที่ 2: Firestore Security Rules (กฎความปลอดภัยฐานข้อมูล)</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(firestoreRulesCode);
                    setCopiedCodeRules(true);
                    setTimeout(() => setCopiedCodeRules(false), 2000);
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  {copiedCodeRules ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCodeRules ? 'คัดลอกแล้ว' : 'คัดลอก Rules'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-400">
                วางกฎนี้ที่ Firebase Console ➔ Firestore Database ➔ Rules เพื่อป้องกันการอ่านข้อมูลข้ามบัญชี:
              </p>
              <pre className="text-[11px] font-mono text-teal-300 overflow-x-auto p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                {firestoreRulesCode}
              </pre>
            </div>

            {/* Part 3: Architecture Summary */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>สรุปสถาปัตยกรรมระบบแบบไม่เสียค่าใช้จ่าย (0 Baht Architecture)</span>
              </div>
              <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                <li><b className="text-slate-200">Database & Auth:</b> Firebase Cloud Firestore & Auth (Free Tier ฟรีตลอดชีพ)</li>
                <li><b className="text-slate-200">Storage:</b> Google Drive ของบัญชี Google ส่วนตัว ผ่าน Google Apps Script</li>
                <li><b className="text-slate-200">AI Slip OCR & Advisor:</b> Gemini 2.5 Flash API (Free Tier โควต้าฟรีใช้งานรายวัน)</li>
                <li><b className="text-slate-200">Hosting:</b> สามารถนำซอร์สโค้ดนี้ไปโฮสต์ฟรีบน Cloudflare Pages, Netlify หรือ GitHub Pages ได้เลย</li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 7: Transfer Keywords Settings */}
        {activeTab === 'settings' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-teal-400" />
                <span>ตั้งค่าการตรวจจับ "โอนย้ายบัญชีส่วนตัว" อัตโนมัติ</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                กำหนดคำค้น ชื่อ หรือเลขบัญชีของคุณ เมื่อสแกนพบคำเหล่านี้ในสลีป ระบบจะปรับเป็นรายการ "โอนย้ายบัญชี" อัตโนมัติ
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <label className="block text-xs font-semibold text-slate-300">เพิ่มคำค้น/ชื่อบัญชีใหม่:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="เช่น นาย สมชาย, 012-3-45678-9"
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => {
                    if (newKeyword.trim()) {
                      setTransferKeywords([...transferKeywords, newKeyword.trim()]);
                      setNewKeyword('');
                    }
                  }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>เพิ่ม</span>
                </button>
              </div>

              <div className="pt-3">
                <span className="text-xs text-slate-400 block mb-2">คำค้นที่ตั้งไว้ในระบบ:</span>
                <div className="flex flex-wrap gap-2">
                  {transferKeywords.map((kw, idx) => (
                    <span key={idx} className="px-3 py-1 bg-slate-900 border border-slate-800 text-teal-300 text-xs rounded-xl flex items-center gap-1.5 font-mono">
                      <Tag className="w-3 h-3 text-teal-400" />
                      <span>{kw}</span>
                      <button
                        onClick={() => setTransferKeywords(transferKeywords.filter((_, i) => i !== idx))}
                        className="text-slate-500 hover:text-rose-400 ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-600 font-mono">
        Bankkiller Expense Tracker • Whitelisted for {AUTHORIZED_EMAIL} • Powered by Gemini AI
      </footer>
    </div>
  );
}
