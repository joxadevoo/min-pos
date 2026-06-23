import React, { useState, useEffect } from 'react';
import {
  Layers,
  AlertTriangle,
  RefreshCw,
  Package,
  Activity,
  TrendingUp,
  Sparkles,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Info,
  Wrench,
  X,
  Printer,
  FileText,
  Download,
  User,
  Users,
  LogOut,
  Lock,
  CreditCard,
  Banknote,
  Smartphone,
  Cloud,
  CloudOff,
  Edit3,
  Heart,
  Smile,
  Scissors,
  Sparkle,
  QrCode,
  Scan
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

import {
  initialProducts,
  initialRawMaterials,
  initialFormulations,
  initialBundles,
  initialChannels,
  initialLogs,
  initialTransactions
} from './data';

// Import Firestore database connection
import { db, auth, firebaseConfig } from './firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  initializeAuth,
  inMemoryPersistence
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';

// Data versiyasi — o'zgartirsa eski localStorage avtomatik tozalanadi
const DATA_VERSION = 'v7-vidalita-tgc-admin-auth-reset-prices';

export default function App() {
  // --- Eski keshni versiya asosida tozalash ---
  if (localStorage.getItem('beauty_data_version') !== DATA_VERSION) {
    [
      'beauty_products', 'beauty_raw_materials', 'beauty_bundles',
      'beauty_channels', 'beauty_logs', 'beauty_transactions', 'beauty_cart',
      'beauty_users', 'beauty_current_user'
    ].forEach(k => localStorage.removeItem(k));
    localStorage.setItem('beauty_data_version', DATA_VERSION);
  }

  // --- Persistent State (Uses LocalStorage as default fallback) ---
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('beauty_products');
    return saved ? JSON.parse(saved) : initialProducts;
  });

  const [rawMaterials, setRawMaterials] = useState(() => {
    const saved = localStorage.getItem('beauty_raw_materials');
    return saved ? JSON.parse(saved) : initialRawMaterials;
  });

  const [formulations] = useState(initialFormulations);

  const [bundles, setBundles] = useState(() => {
    const saved = localStorage.getItem('beauty_bundles');
    return saved ? JSON.parse(saved) : initialBundles;
  });

  const [channels, setChannels] = useState(() => {
    const saved = localStorage.getItem('beauty_channels');
    return saved ? JSON.parse(saved) : initialChannels;
  });

  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('beauty_logs');
    return saved ? JSON.parse(saved) : initialLogs;
  });

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('beauty_transactions');
    return saved ? JSON.parse(saved) : initialTransactions;
  });

  const activeTransactions = transactions.filter(t => t.status !== 'cancelled');

  // --- Transaction Filter States ---
  const [trxSearchQuery, setTrxSearchQuery] = useState('');
  const [trxStartDate, setTrxStartDate] = useState('');
  const [trxEndDate, setTrxEndDate] = useState('');
  const [trxFilterPayment, setTrxFilterPayment] = useState('All');
  const [trxFilterStatus, setTrxFilterStatus] = useState('All');

  const filteredTransactions = transactions.filter(t => {
    // 1. Search filter (ID, Customer name, Phone)
    const matchesSearch = !trxSearchQuery ||
      t.id.toLowerCase().includes(trxSearchQuery.toLowerCase()) ||
      t.customerName.toLowerCase().includes(trxSearchQuery.toLowerCase()) ||
      t.customerPhone.toLowerCase().includes(trxSearchQuery.toLowerCase());
      
    // 2. Date filter (t.date format is YYYY-MM-DD)
    const matchesStartDate = !trxStartDate || t.date >= trxStartDate;
    const matchesEndDate = !trxEndDate || t.date <= trxEndDate;
    
    // 3. Payment Method filter
    let matchesPayment = true;
    if (trxFilterPayment !== 'All') {
      if (trxFilterPayment === 'Aralash') {
        matchesPayment = t.paymentMethod.toLowerCase().includes('aralash');
      } else {
        matchesPayment = t.paymentMethod.toLowerCase().includes(trxFilterPayment.toLowerCase());
      }
    }
    
    // 4. Status filter
    let matchesStatus = true;
    if (trxFilterStatus === 'active') {
      matchesStatus = t.status !== 'cancelled';
    } else if (trxFilterStatus === 'cancelled') {
      matchesStatus = t.status === 'cancelled';
    }
    
    return matchesSearch && matchesStartDate && matchesEndDate && matchesPayment && matchesStatus;
  });

  const filteredActiveTransactions = filteredTransactions.filter(t => t.status !== 'cancelled');

  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('beauty_cart');
    return saved ? JSON.parse(saved) : [];
  });

  // --- Firebase Status & Mode States ---
  const [firebaseActive, setFirebaseActive] = useState(false);
  const [, setFirebaseLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState(null);

  // --- User Authentication and Roles State ---
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('beauty_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('beauty_users');
    if (saved) return JSON.parse(saved);
    const defaultUsers = [
      {
        id: 'user-admin-tgc',
        name: 'TGC (Admin)',
        email: 'turkglobalcenter@gmail.com',
        password: 'TGC2025',
        role: 'admin'
      }
    ];
    localStorage.setItem('beauty_users', JSON.stringify(defaultUsers));
    return defaultUsers;
  });

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'sotuvchi'
  });
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  // --- So'm formatlash yordamchisi ---
  const formatSum = (amount) =>
    new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(Math.round(amount)) + " so'm";

  // --- UI Control State ---
  const [activeTab, setActiveTab] = useState('pos');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [expandedProduct, setExpandedProduct] = useState(null);

  // --- Reports State ---
  const [reportType, setReportType] = useState('daily'); // 'daily' or 'range'
  const [reportDate, setReportDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' }));
  const [reportStartDate, setReportStartDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' }));
  const [reportEndDate, setReportEndDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' }));

  // --- Toast Alerts ---
  const [toasts, setToasts] = useState([]);

  const showToast = (title, desc, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, title, desc, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // --- POS Specific Controls ---
  const [posSearchTerm, setPosSearchTerm] = useState('');
  const [posCategoryFilter, setPosCategoryFilter] = useState('All');
  const [selectedCustomer, setSelectedCustomer] = useState({ name: '', phone: '' });
  const [paymentMethod, setPaymentMethod] = useState('Naqd (Cash)');
  const [mixPayCash, setMixPayCash] = useState(0);
  const [mixPayCard, setMixPayCard] = useState(0);
  const [customDiscount, setCustomDiscount] = useState(0);
  const [customDiscountSum, setCustomDiscountSum] = useState(0);

  // Scanner States
  const [scannedInput, setScannedInput] = useState('');
  const [isScannerAutofocus, setIsScannerAutofocus] = useState(true);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const scannerInputRef = React.useRef(null);


  // --- Modal Control ---
  const [activeModal, setActiveModal] = useState(null);
  const [modalInputs, setModalInputs] = useState({});
  const [modalError, setModalError] = useState('');
  const [cancellingTrx, setCancellingTrx] = useState(null);
  const [activePOSInvoice, setActivePOSInvoice] = useState(null);

  // --- Lock background scroll when modal is active ---
  useEffect(() => {
    if (activeModal || isCameraScannerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeModal, isCameraScannerOpen]);

  // --- Historical Transactions Manual Entry States ---
  const [histDate, setHistDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' }));
  const [histTime, setHistTime] = useState("12:00");
  const [histCustomerName, setHistCustomerName] = useState("");
  const [histCustomerPhone, setHistCustomerPhone] = useState("");
  const [histPaymentMethod, setHistPaymentMethod] = useState("Naqd (Cash)");
  const [histMixCash, setHistMixCash] = useState(0);
  const [histMixCard, setHistMixCard] = useState(0);
  const [histItems, setHistItems] = useState([]);
  const [histSelectedSku, setHistSelectedSku] = useState("");
  const [histSelectedQty, setHistSelectedQty] = useState(1);
  const [histSelectedPrice, setHistSelectedPrice] = useState(0);
  const [histDiscountType, setHistDiscountType] = useState("percent"); // "percent" or "amount"
  const [histDiscountValue, setHistDiscountValue] = useState("");

  // --- Edit Transaction States ---
  const [editingTrx, setEditingTrx] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("Naqd (Cash)");
  const [editMixCash, setEditMixCash] = useState(0);
  const [editMixCard, setEditMixCard] = useState(0);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    const email = loginEmail.trim();
    const password = loginPassword;
    
    if (firebaseActive) {
      try {
        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (authErr) {
          if ((authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') && 
              email.toLowerCase() === 'turkglobalcenter@gmail.com' && 
              password === 'TGC2025') {
            try {
              userCredential = await createUserWithEmailAndPassword(auth, email, password);
              await setDoc(doc(db, 'users', userCredential.user.uid), {
                name: "TGC (Admin)",
                email: email.toLowerCase(),
                role: "admin"
              });
            } catch (signUpErr) {
              if (signUpErr.code === 'auth/email-already-in-use') {
                throw authErr;
              } else {
                throw signUpErr;
              }
            }
          } else {
            throw authErr;
          }
        }
        
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const loggedIn = {
            uid: userCredential.user.uid,
            name: userData.name || "TGC (Admin)",
            email: email,
            role: (email.toLowerCase() === 'turkglobalcenter@gmail.com') ? 'admin' : (userData.role || 'sotuvchi')
          };
          // Force update in database if role isn't admin
          if (email.toLowerCase() === 'turkglobalcenter@gmail.com' && userData.role !== 'admin') {
            await setDoc(doc(db, 'users', userCredential.user.uid), { role: 'admin' }, { merge: true });
          }
          setCurrentUser(loggedIn);
          localStorage.setItem('beauty_current_user', JSON.stringify(loggedIn));
          showToast("Muvaffaqiyatli kirildi", `${loggedIn.name} xush kelibsiz!`, "success");
        } else {
          const fallbackUser = {
            uid: userCredential.user.uid,
            name: "TGC (Admin)",
            email: email,
            role: email.toLowerCase() === 'turkglobalcenter@gmail.com' ? 'admin' : 'sotuvchi'
          };
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            name: fallbackUser.name,
            email: fallbackUser.email,
            role: fallbackUser.role
          });
          setCurrentUser(fallbackUser);
          localStorage.setItem('beauty_current_user', JSON.stringify(fallbackUser));
          showToast("Muvaffaqiyatli kirildi", "Xush kelibsiz!", "success");
        }
      } catch (err) {
        console.error("Login error:", err);
        if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
          setLoginError("Firebase Authentication-da 'Email/Password' kirish usuli yoqilmagan. Iltimos Firebase Console-ga kiring (Authentication -> Sign-in method) va uni yoqing.");
        } else {
          setLoginError("Email yoki parol noto'g'ri: " + err.message);
        }
      } finally {
        setIsLoggingIn(false);
      }
    } else {
      let foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      if (!foundUser && email.toLowerCase() === 'turkglobalcenter@gmail.com' && password === 'TGC2025') {
        foundUser = {
          id: 'user-admin-tgc',
          name: 'TGC (Admin)',
          email: 'turkglobalcenter@gmail.com',
          password: 'TGC2025',
          role: 'admin'
        };
        const updatedUsers = [...users, foundUser];
        setUsers(updatedUsers);
        localStorage.setItem('beauty_users', JSON.stringify(updatedUsers));
      }
      if (foundUser) {
        const loggedIn = {
          uid: foundUser.id,
          name: foundUser.name,
          email: foundUser.email,
          role: (foundUser.email.toLowerCase() === 'turkglobalcenter@gmail.com') ? 'admin' : foundUser.role
        };
        setCurrentUser(loggedIn);
        localStorage.setItem('beauty_current_user', JSON.stringify(loggedIn));
        showToast("Muvaffaqiyatli kirildi (Oflayn)", `${foundUser.name} xush kelibsiz!`, "success");
      } else {
        setLoginError("Email yoki parol noto'g'ri (Lokal rejim)");
      }
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (firebaseActive) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Sign out error:", err);
      }
    }
    setCurrentUser(null);
    localStorage.removeItem('beauty_current_user');
    showToast("Tizimdan chiqildi", "Xavfsiz ravishda tizimdan chiqdingiz.", "info");
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'admin') {
      showToast("Taqiqlangan", "Ushbu amalni bajarish uchun admin huquqi talab etiladi!", "error");
      return;
    }
    const { name, email, password, role } = userForm;
    if (!name || !email || !password || !role) {
      alert("Iltimos barcha maydonlarni to'ldiring!");
      return;
    }
    
    if (firebaseActive) {
      try {
        const tempApp = initializeApp(firebaseConfig, "TempApp");
        try {
          const tempAuth = initializeAuth(tempApp, {
            persistence: inMemoryPersistence
          });
          const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
          const uid = userCredential.user.uid;
          
          await setDoc(doc(db, 'users', uid), {
            name,
            email,
            role
          });
        } finally {
          await deleteApp(tempApp);
        }
        
        showToast("Muvaffaqiyatli", "Yangi xodim muvaffaqiyatli qo'shildi!", "success");
      } catch (err) {
        console.error("Add user online error:", err);
        if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
          alert("Firebase Authentication-da 'Email/Password' kirish usuli yoqilmagan. Iltimos Firebase Console-ga kiring (Authentication -> Sign-in method) va uni yoqing.");
        } else {
          alert("Xatolik yuz berdi: " + err.message);
        }
        return;
      }
    } else {
      const newUser = {
        id: 'user-' + Date.now(),
        name,
        email,
        password,
        role
      };
      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      localStorage.setItem('beauty_users', JSON.stringify(updatedUsers));
      showToast("Muvaffaqiyatli (Lokal)", "Yangi xodim lokal rejimda qo'shildi!", "success");
    }
    
    setUserForm({ name: '', email: '', password: '', role: 'sotuvchi' });
    setIsAddUserModalOpen(false);
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast("Taqiqlangan", "Ushbu amalni bajarish uchun admin huquqi talab etiladi!", "error");
      return;
    }
    const confirmDelete = confirm(`Haqiqatan ham "${userEmail}" xodimini tizimdan o'chirmoqchisiz?`);
    if (!confirmDelete) return;
    
    if (firebaseActive) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        showToast("Muvaffaqiyatli", "Xodim tizimdan o'chirildi (Firestore)!", "success");
      } catch (err) {
        console.error("Delete user online error:", err);
        alert("Xatolik yuz berdi: " + err.message);
      }
    } else {
      const updatedUsers = users.filter(u => u.id !== userId);
      setUsers(updatedUsers);
      localStorage.setItem('beauty_users', JSON.stringify(updatedUsers));
      showToast("Muvaffaqiyatli (Lokal)", "Xodim lokal tizimdan o'chirildi!", "success");
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.role === 'sotuvchi' && activeTab === 'users') {
      setActiveTab('pos');
    }
  }, [currentUser, activeTab]);

  useEffect(() => {
    if (!isProfileDropdownOpen) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.profile-container')) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isProfileDropdownOpen]);

  useEffect(() => {
    if (firebaseActive && auth) {
      const unsubAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const loggedIn = {
                uid: user.uid,
                name: userData.name || "TGC (Admin)",
                email: user.email,
                role: (user.email.toLowerCase() === 'turkglobalcenter@gmail.com') ? 'admin' : (userData.role || 'sotuvchi')
              };
              setCurrentUser(loggedIn);
              localStorage.setItem('beauty_current_user', JSON.stringify(loggedIn));
            } else {
              if (user.email.toLowerCase() === 'turkglobalcenter@gmail.com') {
                const adminDoc = {
                  name: "TGC (Admin)",
                  email: user.email,
                  role: 'admin'
                };
                await setDoc(doc(db, 'users', user.uid), adminDoc);
                const loggedIn = {
                  uid: user.uid,
                  name: adminDoc.name,
                  email: user.email,
                  role: 'admin'
                };
                setCurrentUser(loggedIn);
                localStorage.setItem('beauty_current_user', JSON.stringify(loggedIn));
              } else {
                await signOut(auth);
                setCurrentUser(null);
                localStorage.removeItem('beauty_current_user');
              }
            }
          } catch (err) {
            console.error("Error fetching user role on auth state change:", err);
          }
        } else {
          if (localStorage.getItem('beauty_current_user')) {
            const localUser = JSON.parse(localStorage.getItem('beauty_current_user'));
            if (localUser && localUser.uid && !localUser.uid.startsWith('user-')) {
              setCurrentUser(null);
              localStorage.removeItem('beauty_current_user');
            }
          }
        }
      });
      return () => unsubAuth();
    }
  }, [firebaseActive]);



  // --- Current System Date (Uzbekistan Time Zone) ---
  const todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });

  // --- FIRESTORE REAL-TIME SYNCHRONIZATION AND SEEDING ---
  useEffect(() => {
    let unsubscribes = [];
    
    const initializeFirestoreSync = async () => {
      if (!db || !auth) {
        setFirebaseActive(false);
        setFirebaseLoading(false);
        return;
      }
      try {
        setFirebaseLoading(true);

        // 1. Versiyani tekshirish o'rniga faqat agar Firestore bo'sh bo'lsa boshlang'ich ma'lumotlarni yuklaymiz
        const oldProducts = await getDocs(collection(db, 'products'));
        if (oldProducts.empty) {
          console.log('Firestore bo\'sh. Boshlang\'ich mahsulotlar yuklanmoqda...');
          const versionRef = doc(db, 'config', 'version');
          const wipeBatch = writeBatch(db);
          initialProducts.forEach(p => wipeBatch.set(doc(db, 'products', p.id), p));
          wipeBatch.set(versionRef, { v: DATA_VERSION });
          await wipeBatch.commit();
          console.log('Firestore boshlang\'ich mahsulotlar yuklandi:', initialProducts.length, 'mahsulot.');
        }

        // 2. Real-time listener larni ulash
        const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
          const list = [];
          snapshot.forEach(d => list.push({ ...d.data(), id: d.id }));
          setProducts(list);
        }, (err) => {
          console.warn("Products listener failed:", err);
          setFirebaseActive(false);
        });

        const unsubRaw = onSnapshot(collection(db, 'raw_materials'), (snapshot) => {
          const list = [];
          snapshot.forEach(d => list.push({ ...d.data(), id: d.id }));
          setRawMaterials(list);
        }, (err) => {
          console.warn("Raw materials listener failed:", err);
          setFirebaseActive(false);
        });

        const unsubBundles = onSnapshot(collection(db, 'bundles'), (snapshot) => {
          const list = [];
          snapshot.forEach(d => list.push({ ...d.data(), id: d.id }));
          setBundles(list);
        }, (err) => {
          console.warn("Bundles listener failed:", err);
          setFirebaseActive(false);
        });

        const unsubChannels = onSnapshot(collection(db, 'channels'), (snapshot) => {
          const list = [];
          snapshot.forEach(d => list.push({ ...d.data(), id: d.id }));
          if (list.length > 0) setChannels(list);
        }, (err) => {
          console.warn("Channels listener failed:", err);
          setFirebaseActive(false);
        });

        const unsubLogs = onSnapshot(
          query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(20)),
          (snapshot) => {
            const list = [];
            snapshot.forEach(d => {
              const rest = { ...d.data() };
              delete rest.timestamp;
              list.push({ ...rest, id: d.id });
            });
            setLogs(list);
          }, (err) => {
            console.warn("Logs listener failed:", err);
            setFirebaseActive(false);
          }
        );

        const unsubTrx = onSnapshot(
          query(collection(db, 'transactions'), orderBy('timestamp', 'desc')),
          (snapshot) => {
            const list = [];
            snapshot.forEach(d => {
              const rest = { ...d.data() };
              delete rest.timestamp;
              list.push({ ...rest, id: d.id });
            });
            setTransactions(list);
          }, (err) => {
            console.warn("Transactions listener failed:", err);
            setFirebaseActive(false);
          }
        );

        const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
          const list = [];
          snapshot.forEach(d => list.push({ ...d.data(), id: d.id }));
          setUsers(list);
          
          if (list.length === 0) {
            const adminDoc = {
              name: "TGC (Admin)",
              email: "turkglobalcenter@gmail.com",
              role: "admin"
            };
            setDoc(doc(db, 'users', 'admin-default-tgc'), adminDoc);
          }
        }, (err) => {
          console.warn("Firestore users listener failed (unauthorized or missing):", err);
        });

        unsubscribes = [unsubProducts, unsubRaw, unsubBundles, unsubChannels, unsubLogs, unsubTrx, unsubUsers];
        setFirebaseActive(true);
        setFirebaseError(null);
      } catch (err) {
        console.error('Firestore loading error:', err);
        setFirebaseActive(false);
        setFirebaseError(err.message || err.toString());
      } finally {
        setFirebaseLoading(false);
      }
    };

    initializeFirestoreSync();

    // Clean up listeners on unmount
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  // --- Auto Save to LocalStorage (Fallback backup) ---
  useEffect(() => {
    localStorage.setItem('beauty_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('beauty_raw_materials', JSON.stringify(rawMaterials));
  }, [rawMaterials]);

  useEffect(() => {
    localStorage.setItem('beauty_bundles', JSON.stringify(bundles));
  }, [bundles]);

  useEffect(() => {
    localStorage.setItem('beauty_channels', JSON.stringify(channels));
  }, [channels]);

  useEffect(() => {
    localStorage.setItem('beauty_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('beauty_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // --- DELETE PRODUCT & TRANSACTION ACTIONS ---
  const handleDeleteProduct = async (productId, productName) => {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast("Taqiqlangan", "Ushbu amalni bajarish uchun admin huquqi talab etiladi!", "error");
      return;
    }
    const confirmDelete = window.confirm(`Haqiqatan ham "${productName}" mahsulotini butunlay o'chirmoqchisiz?`);
    if (!confirmDelete) return;

    if (firebaseActive) {
      try {
        setFirebaseLoading(true);
        await deleteDoc(doc(db, 'products', productId));
        showToast("Muvaffaqiyatli", "Mahsulot o'chirildi (Firestore)!", "success");
      } catch (err) {
        console.error("Delete product failed:", err);
        showToast("Xatolik", "Mahsulotni o'chirishda xatolik yuz berdi.", "error");
      } finally {
        setFirebaseLoading(false);
      }
    } else {
      const updatedProducts = products.filter(p => p.id !== productId);
      setProducts(updatedProducts);
      localStorage.setItem('beauty_products', JSON.stringify(updatedProducts));
      showToast("Muvaffaqiyatli", "Mahsulot o'chirildi (Lokal)!", "success");
    }
  };

  const handleDeleteTransaction = async (trxId) => {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast("Taqiqlangan", "Ushbu amalni bajarish uchun admin huquqi talab etiladi!", "error");
      return;
    }
    const confirmDelete = window.confirm("Haqiqatan ham ushbu sotuv fakturasini butunlay o'chirmoqchisiz?");
    if (!confirmDelete) return;

    if (firebaseActive) {
      try {
        setFirebaseLoading(true);
        await deleteDoc(doc(db, "transactions", trxId));
        showToast("Muvaffaqiyatli", "Sotuv fakturasi o'chirildi (Firestore)!", "success");
      } catch (err) {
        console.error("Delete transaction failed:", err);
        showToast("Xatolik", "Sotuv fakturasini o'chirishda xatolik yuz berdi.", "error");
      } finally {
        setFirebaseLoading(false);
      }
    } else {
      const updated = transactions.filter(t => t.id !== trxId);
      setTransactions(updated);
      localStorage.setItem('beauty_transactions', JSON.stringify(updated));
      showToast("Muvaffaqiyatli", "Sotuv fakturasi o'chirildi (Lokal)!", "success");
    }
  };

  const handleStartEditTransaction = (trx) => {
    setEditingTrx(trx);
    setEditDate(trx.date || "");
    setEditTime(trx.time || "");
    setEditCustomerName(trx.customerName || "");
    setEditCustomerPhone(trx.customerPhone || "");
    
    let method = trx.paymentMethod || "Naqd (Cash)";
    let mixCash = 0;
    let mixCard = 0;
    if (method.startsWith("Aralash")) {
      method = "Aralash (Mix)";
      if (trx.mixPayDetails) {
        mixCash = trx.mixPayDetails.cash || 0;
        mixCard = trx.mixPayDetails.card || 0;
      }
    }
    setEditPaymentMethod(method);
    setEditMixCash(mixCash);
    setEditMixCard(mixCard);
    
    setModalError('');
    setActiveModal('edit-transaction');
  };

  const submitEditTransaction = async (e) => {
    e.preventDefault();
    if (!editingTrx) return;

    const updatedTrx = {
      ...editingTrx,
      date: editDate,
      time: editTime,
      customerName: editCustomerName || "Mijoz",
      customerPhone: editCustomerPhone || "Kiritilmagan",
      paymentMethod: editPaymentMethod === 'Aralash (Mix)'
        ? `Aralash (Naqd: ${formatSum(editMixCash)} / Karta: ${formatSum(editMixCard)})`
        : editPaymentMethod,
      mixPayDetails: editPaymentMethod === 'Aralash (Mix)' ? { cash: parseFloat(editMixCash), card: parseFloat(editMixCard) } : null,
    };

    if (firebaseActive) {
      try {
        setFirebaseLoading(true);
        await setDoc(doc(db, "transactions", editingTrx.id), {
          ...updatedTrx,
          timestamp: editingTrx.timestamp || serverTimestamp()
        }, { merge: true });
        showToast("Muvaffaqiyatli", "Faktura muvaffaqiyatli tahrirlandi (Firestore).", "success");
        setActiveModal(null);
        setEditingTrx(null);
      } catch (err) {
        console.error("Firestore transaction update failed:", err);
        showToast("Xatolik", "Firestore-ga yozib bo'lmadi. Lokal saqlandi.", "info");
        setTransactions(prev => prev.map(t => t.id === editingTrx.id ? updatedTrx : t));
        setActiveModal(null);
        setEditingTrx(null);
      } finally {
        setFirebaseLoading(false);
      }
    } else {
      const updated = transactions.map(t => t.id === editingTrx.id ? updatedTrx : t);
      setTransactions(updated);
      localStorage.setItem('beauty_transactions', JSON.stringify(updated));
      showToast("Muvaffaqiyatli", "Faktura muvaffaqiyatli tahrirlandi (Lokal).", "success");
      setActiveModal(null);
      setEditingTrx(null);
    }
  };

  const handleEditMixCashChange = (val) => {
    if (!editingTrx) return;
    const total = editingTrx.totalAmount;
    const cash = Math.min(total, Math.max(0, parseFloat(val) || 0));
    setEditMixCash(cash);
    setEditMixCard(total - cash);
  };

  const handleEditMixCardChange = (val) => {
    if (!editingTrx) return;
    const total = editingTrx.totalAmount;
    const card = Math.min(total, Math.max(0, parseFloat(val) || 0));
    setEditMixCard(card);
    setEditMixCash(total - card);
  };

  useEffect(() => {
    if (editingTrx && editPaymentMethod === 'Aralash (Mix)') {
      const total = editingTrx.totalAmount;
      setEditMixCash(Math.round(total / 2));
      setEditMixCard(total - Math.round(total / 2));
    }
  }, [editPaymentMethod]);

  useEffect(() => {
    localStorage.setItem('beauty_cart', JSON.stringify(cart));
  }, [cart]);

  // --- DATABASE RESET / CLEAR FUNCTION ---
  const handleResetDatabase = async () => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'sotuvchi')) {
      showToast("Taqiqlangan", "Ushbu amalni bajarish uchun admin yoki sotuvchi huquqi talab etiladi!", "error");
      return;
    }
    const confirmWipe = window.confirm(
      "Diqqat! Tizimdagi barcha sotuvlar tarixi, loglar va mahsulotlar qoldiqlarini 0 holatiga keltirmoqchimisiz? (Mahsulotlar va xodimlar o'chmaydi)"
    );
    if (!confirmWipe) return;

    try {
      setFirebaseLoading(true);
      
      // Calculate zeroed products (set batches to empty array for all variants)
      const zeroedProducts = products.map(prod => ({
        ...prod,
        variants: prod.variants ? prod.variants.map(v => ({
          ...v,
          batches: []
        })) : []
      }));

      // 1. Clear LocalStorage for transactions, logs, cart, and save zeroed products
      localStorage.setItem('beauty_products', JSON.stringify(zeroedProducts));
      localStorage.removeItem('beauty_logs');
      localStorage.removeItem('beauty_transactions');
      localStorage.removeItem('beauty_cart');

      // 2. Clear / Update local states
      setProducts(zeroedProducts);
      setLogs([]);
      setTransactions([]);
      setCart([]);

      // 3. Update Remote Firestore Database if connected
      if (firebaseActive) {
        const deleteCollectionDocs = async (collectionName) => {
          const snap = await getDocs(collection(db, collectionName));
          if (!snap.empty) {
            const batch = writeBatch(db);
            snap.forEach(d => {
              batch.delete(doc(db, collectionName, d.id));
            });
            await batch.commit();
          }
        };

        // Delete transactions and logs
        await deleteCollectionDocs('transactions');
        await deleteCollectionDocs('logs');

        // Update products to set batches to [] (instead of deleting the documents)
        const batch = writeBatch(db);
        zeroedProducts.forEach(prod => {
          batch.set(doc(db, 'products', prod.id), prod);
        });
        await batch.commit();
      }

      showToast("Muvaffaqiyatli!", "Sotuvlar tarixi o'chirildi va qoldiqlar 0 holatiga keltirildi!", "success");
    } catch (err) {
      console.error("Wipe failed:", err);
      alert("Ma'lumotlarni o'chirishda xatolik: " + err.message);
    } finally {
      setFirebaseLoading(false);
    }
  };

  // --- Helper Log Writer ---
  const addSystemLog = async (action, details, change, channel = "System", type = "info") => {
    const time = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Tashkent', hour12: false, hour: '2-digit', minute: '2-digit' });
    const newLog = { id: `log-${Date.now()}`, time, channel, action, details, change, type };
    
    if (firebaseActive) {
      try {
        await setDoc(doc(db, "logs", newLog.id), {
          ...newLog,
          timestamp: serverTimestamp()
        });
      } catch (e) {
        console.error("Error writing log to Firestore:", e);
      }
    } else {
      setLogs(prev => [newLog, ...prev.slice(0, 19)]);
    }
  };

  // Helper to map category names to nice visual icons
  const getCategoryIcon = (cat, size = 16) => {
    switch (cat) {
      case 'All': return <Sparkles size={size} />;
      case 'Lips': return <Heart size={size} />;
      case 'Face': return <Smile size={size} />;
      case 'Services': return <User size={size} />;
      case 'Hair': return <Scissors size={size} />;
      case 'Nails': return <Sparkle size={size} />;
      case 'Body': return <Sparkles size={size} />;
      default: return <Package size={size} />;
    }
  };

  // Get total stock of a product variant by summing all its batches
  const getVariantStock = (variant) => {
    const parentProd = products.find(p => p.variants.some(v => v.sku === variant.sku));
    if (parentProd && parentProd.isService) {
      return 999; // Represents infinite stock for services
    }
    if (!variant.batches) return 0;
    return variant.batches.reduce((sum, batch) => sum + batch.qty, 0);
  };

  // Get total stock of a product by summing all variants' stocks
  const getProductStock = (product) => {
    return product.variants.reduce((sum, variant) => sum + getVariantStock(variant), 0);
  };

  // Evaluate Shelf-Life state (FEFO helper)
  const checkBatchExpiryStatus = (expiryDateStr) => {
    const today = new Date(todayDateStr);
    const expiry = new Date(expiryDateStr);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: "expired", label: "Muddati o'tgan (Expired)", class: "date-expired", days: diffDays };
    } else if (diffDays <= 60) {
      return { status: "warning", label: `Tezda tugaydi (${diffDays} kundan keyin)`, class: "date-warning", days: diffDays };
    } else {
      return { status: "safe", label: `Xavfsiz (${diffDays} kun bor)`, class: "date-safe", days: diffDays };
    }
  };

  // Find all critical items (low stock or expiring soon)
  const getCriticalAlerts = () => {
    const alerts = [];

    products.forEach(p => {
      p.variants.forEach(v => {
        const stock = getVariantStock(v);
        if (stock <= p.reorderLevel) {
          alerts.push({
            id: `alert-stock-${v.sku}`,
            type: "danger",
            title: "Kam zaxira (Low Stock)",
            desc: `${p.name} (${v.name}) zaxirasi ${stock} dona qoldi. Zaxira chegarasi: ${p.reorderLevel}`,
            time: "Hozirgi holat"
          });
        }

        if (v.batches) {
          v.batches.forEach(b => {
            const expCheck = checkBatchExpiryStatus(b.expiryDate);
            if (expCheck.status === "expired" && b.qty > 0) {
              alerts.push({
                id: `alert-exp-${b.batchId}`,
                type: "danger",
                title: "Muddati O'tgan Partiya",
                desc: `${p.name} (${v.name}) - ${b.batchId} partiyasining yaroqlilik muddati tugagan (${b.expiryDate})! Zaxirada ${b.qty} dona bor.`,
                time: "Tezkor chora!"
              });
            } else if (expCheck.status === "warning" && b.qty > 0) {
              alerts.push({
                id: `alert-warn-${b.batchId}`,
                type: "info",
                title: "Yaroqlilik muddati yaqinlashmoqda",
                desc: `${p.name} (${v.name}) - ${b.batchId} partiyasi ${expCheck.days} kunda tugaydi. FEFO bo'yicha tezroq soting!`,
                time: "Ogohlantirish"
              });
            }
          });
        }
      });
    });

    rawMaterials.forEach(rm => {
      if (rm.qty <= rm.reorderLevel) {
        alerts.push({
          id: `alert-raw-${rm.id}`,
          type: "info",
          title: "Xom-ashyo kam qoldi",
          desc: `${rm.name} zaxirasi ${rm.qty} ${rm.unit} qoldi (Chegara: ${rm.reorderLevel} ${rm.unit})`,
          time: "Ishlab chiqarish"
        });
      }
    });

    return alerts;
  };

  const criticalAlerts = getCriticalAlerts();

  // Calculate dynamic bundle quantity based on its component materials
  const getBundleMaxQty = (bundle) => {
    let maxQty = Infinity;
    
    for (const item of bundle.items) {
      let variantStock = 0;
      let found = false;
      for (const p of products) {
        const v = p.variants.find(varObj => varObj.sku === item.sku);
        if (v) {
          variantStock = getVariantStock(v);
          found = true;
          break;
        }
      }
      if (!found) return 0;
      
      const potentialBundles = Math.floor(variantStock / item.qty);
      if (potentialBundles < maxQty) {
        maxQty = potentialBundles;
      }
    }
    
    return maxQty === Infinity ? 0 : maxQty;
  };

  // --- FEFO Deduct Engine Core ---
  const applyFefoDeduction = (productSku, saleQty, channelName, updatedProductsList) => {
    let targetProduct = null;
    let targetVariant = null;

    updatedProductsList.forEach(p => {
      const v = p.variants.find(varItem => varItem.sku === productSku);
      if (v) {
        targetProduct = p;
        targetVariant = v;
      }
    });

    if (!targetVariant) return { success: false, error: "Variant topilmadi." };

    if (targetProduct && targetProduct.isService) {
      return {
        success: true,
        deductionsList: "Xizmat ko'rsatildi (Zaxira kamaytirilmaydi)",
        variantSku: targetVariant.sku,
        targetProductId: targetProduct.id
      };
    }

    const availableStock = getVariantStock(targetVariant);
    if (availableStock < saleQty) {
      return { success: false, error: `Zaxira yetarli emas! ${targetVariant.sku} so'ralgan: ${saleQty}, zaxirada: ${availableStock}` };
    }

    const sortedBatches = [...targetVariant.batches]
      .filter(b => b.qty > 0)
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    if (sortedBatches.length === 0) {
      return { success: false, error: "Sotish uchun yaroqli, zaxiraga ega partiya topilmadi." };
    }

    let remainingToDeduct = saleQty;
    const deductions = [];

    const updatedBatches = targetVariant.batches.map(batch => {
      if (remainingToDeduct <= 0) return batch;

      const isAvailable = sortedBatches.find(b => b.batchId === batch.batchId);
      if (!isAvailable) return batch;

      if (batch.qty >= remainingToDeduct) {
        deductions.push({ batchId: batch.batchId, qty: remainingToDeduct, expiry: batch.expiryDate });
        const newQty = batch.qty - remainingToDeduct;
        remainingToDeduct = 0;
        return { ...batch, qty: newQty };
      } else {
        deductions.push({ batchId: batch.batchId, qty: batch.qty, expiry: batch.expiryDate });
        remainingToDeduct -= batch.qty;
        return { ...batch, qty: 0 };
      }
    });

    targetVariant.batches = updatedBatches;
    const logDetails = deductions.map(d => `${d.qty} dona [${d.batchId}] (EXP: ${d.expiry})`).join(', ');

    return {
      success: true,
      deductionsList: logDetails,
      variantSku: targetVariant.sku,
      targetProductId: targetProduct.id
    };
  };

  const handleFefoSale = async (productSku, saleQty, channelName) => {
    const updatedProductsCopy = JSON.parse(JSON.stringify(products));
    const result = applyFefoDeduction(productSku, saleQty, channelName, updatedProductsCopy);
    
    if (result.success) {
      if (firebaseActive) {
        try {
          const matchedProduct = updatedProductsCopy.find(p => p.id === result.targetProductId);
          await setDoc(doc(db, "products", result.targetProductId), matchedProduct);
          await addSystemLog(
            `Sotuv (${channelName})`,
            `${saleQty}x ${productSku} sotildi. FEFO zaxirasi: ${result.deductionsList}`,
            -saleQty,
            channelName,
            "sale"
          );
        } catch (e) {
          console.error("Firestore writing error, falling back locally:", e);
          setProducts(updatedProductsCopy);
        }
      } else {
        setProducts(updatedProductsCopy);
        addSystemLog(
          `Sotuv (${channelName})`,
          `${saleQty}x ${productSku} sotildi. FEFO zaxirasi: ${result.deductionsList}`,
          -saleQty,
          channelName,
          "sale"
        );
      }
      return true;
    } else {
      setModalError(result.error);
      return false;
    }
  };

  // --- POS CART ACTIONS ---
  const addToCart = (variant, product) => {
    const variantStock = getVariantStock(variant);
    if (variantStock <= 0) {
      showToast("Tugagan mahsulot", "Ushbu variant zaxirada mavjud emas! (Out of Stock)", "warning");
      return;
    }

    const existingIndex = cart.findIndex(item => item.sku === variant.sku);
    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].qty;
      if (!product.isService && currentQty + 1 > variantStock) {
        showToast("Zaxira cheklovi", `Omborda ortiqcha zaxira yo'q! Maksimal miqdor: ${variantStock}`, "warning");
        return;
      }
      setCart(prev => prev.map((item, idx) => idx === existingIndex ? { ...item, qty: item.qty + 1 } : item));
      showToast("Savat yangilandi", `${product.name} - ${variant.name} miqdori oshirildi.`, "success");
    } else {
      setCart(prev => [...prev, {
        sku: variant.sku,
        name: `${product.name} - ${variant.name}`,
        price: variant.price,
        originalPrice: variant.price,
        qty: 1,
        maxStock: variantStock
      }]);
      showToast("Savatga qo'shildi", `${product.name} - ${variant.name} savatga qo'shildi.`, "success");
    }
  };

  // QR / Barcode Scanner handlers and effects
  const handleScanSKU = (scannedSku) => {
    const cleanSku = scannedSku.trim().toLowerCase();
    if (!cleanSku) return false;

    let foundProduct = null;
    let foundVariant = null;

    for (const p of products) {
      const v = p.variants.find(varItem => 
        varItem.sku.trim().toLowerCase() === cleanSku || 
        (varItem.barcode && varItem.barcode.trim().toLowerCase() === cleanSku)
      );
      if (v) {
        foundProduct = p;
        foundVariant = v;
        break;
      }
    }

    if (foundProduct && foundVariant) {
      addToCart(foundVariant, foundProduct);
      return true;
    }

    showToast("Mahsulot topilmadi", `Tizimda "${scannedSku}" kodli mahsulot topilmadi.`, "warning");
    return false;
  };

  const handleScannerKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const success = handleScanSKU(scannedInput);
      if (success) {
        setScannedInput('');
      }
    }
  };

  // Keep focus on the scanner input
  useEffect(() => {
    if (activeTab === 'pos' && isScannerAutofocus && scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  }, [activeTab, isScannerAutofocus]);

  useEffect(() => {
    if (!isScannerAutofocus || activeTab !== 'pos' || isCameraScannerOpen) return;

    const handleFocusKeep = () => {
      setTimeout(() => {
        if (
          document.activeElement &&
          (document.activeElement.tagName === 'INPUT' ||
            document.activeElement.tagName === 'TEXTAREA' ||
            document.activeElement.tagName === 'SELECT' ||
            document.activeElement.closest('.modal-content') ||
            document.activeElement.closest('.pos-cart-footer') ||
            document.activeElement.closest('.pos-customer-section'))
        ) {
          return;
        }
        if (scannerInputRef.current) {
          scannerInputRef.current.focus();
        }
      }, 300);
    };

    document.addEventListener('click', handleFocusKeep);
    return () => {
      document.removeEventListener('click', handleFocusKeep);
    };
  }, [isScannerAutofocus, activeTab, isCameraScannerOpen]);

  // Handle Camera QR Scanner lifecycle
  useEffect(() => {
    let html5QrcodeScanner = null;
    if (isCameraScannerOpen) {
      const timer = setTimeout(() => {
        const readerElement = document.getElementById("qr-reader");
        if (readerElement) {
          html5QrcodeScanner = new Html5QrcodeScanner(
            "qr-reader",
            { 
              fps: 10, 
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0
            },
            /* verbose= */ false
          );
          
          html5QrcodeScanner.render(
            (decodedText) => {
              const success = handleScanSKU(decodedText);
              if (success && html5QrcodeScanner) {
                html5QrcodeScanner.clear().catch(err => console.error("Error clearing scanner:", err));
                setIsCameraScannerOpen(false);
              }
            },
            (error) => {
              // Ignore scanning errors (occurs when no QR code is in frame)
            }
          );
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        if (html5QrcodeScanner) {
          html5QrcodeScanner.clear().catch(err => console.error("Error clearing scanner during unmount:", err));
        }
      };
    }
  }, [isCameraScannerOpen]);

  const updateCartQty = (sku, newQty) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter(item => item.sku !== sku));
      showToast("Savatdan o'chirildi", "Mahsulot savatdan olib tashlandi.", "info");
      return;
    }
    
    const cartItem = cart.find(item => item.sku === sku);
    const parentProd = products.find(p => p.variants.some(v => v.sku === sku));
    const isService = parentProd ? parentProd.isService : false;

    if (cartItem && !isService && newQty > cartItem.maxStock) {
      showToast("Zaxira cheklovi", `Omborda ortiqcha zaxira yo'q! Maksimal miqdor: ${cartItem.maxStock}`, "warning");
      return;
    }

    setCart(prev => prev.map(item => item.sku === sku ? { ...item, qty: newQty } : item));
  };

  const updateCartItemPrice = (sku, newPrice) => {
    setCart(prev => prev.map(item => 
      item.sku === sku ? { ...item, price: newPrice } : item
    ));
  };

  const removeFromCart = (sku) => {
    setCart(prev => prev.filter(item => item.sku !== sku));
    showToast("Savatdan o'chirildi", "Mahsulot savatdan olib tashlandi.", "info");
  };

  // Calculate POS totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const discountAmount = Math.min(subtotal, (subtotal * (customDiscount / 100)) + customDiscountSum);
  const totalAmount = subtotal - discountAmount;

  // --- Mixed Payment Handlers & Sync ---
  const handleMixCashChange = (val) => {
    const cash = Math.min(totalAmount, Math.max(0, parseFloat(val) || 0));
    setMixPayCash(cash);
    setMixPayCard(totalAmount - cash);
  };

  const handleMixCardChange = (val) => {
    const card = Math.min(totalAmount, Math.max(0, parseFloat(val) || 0));
    setMixPayCard(card);
    setMixPayCash(totalAmount - card);
  };

  useEffect(() => {
    if (paymentMethod === 'Aralash (Mix)') {
      if (mixPayCash > totalAmount) {
        setMixPayCash(totalAmount);
        setMixPayCard(0);
      } else {
        setMixPayCard(totalAmount - mixPayCash);
      }
    }
  }, [totalAmount]);

  useEffect(() => {
    if (paymentMethod === 'Aralash (Mix)') {
      setMixPayCash(Math.round(totalAmount / 2));
      setMixPayCard(totalAmount - Math.round(totalAmount / 2));
    }
  }, [paymentMethod]);

  // Handle POS checkout transaction (atomic write batch or fallback)
  const handlePOSCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      showToast("Savat bo'sh", "Savat bo'sh! Savdo qilish uchun mahsulotlar qo'shing.", "warning");
      return;
    }

    const updatedProductsCopy = JSON.parse(JSON.stringify(products));
    const deductionsLogs = [];

    // Run FEFO check
    for (const item of cart) {
      const result = applyFefoDeduction(item.sku, item.qty, "Physical POS Checkout", updatedProductsCopy);
      if (!result.success) {
        showToast("Zaxira yetarli emas", result.error, "warning");
        return;
      }
      deductionsLogs.push(`${item.qty}x ${item.sku} (${result.deductionsList})`);
    }

    const newTrxId = `TRX-${1000 + transactions.length + 1}`;
    const newTrx = {
      id: newTrxId,
      date: todayDateStr,
      time: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Tashkent', hour12: false, hour: '2-digit', minute: '2-digit' }),
      customerName: selectedCustomer.name || "Anonim Mijoz",
      customerPhone: selectedCustomer.phone || "Kiritilmagan",
      paymentMethod: paymentMethod === 'Aralash (Mix)' 
        ? `Aralash (Naqd: ${formatSum(mixPayCash)} / Karta: ${formatSum(mixPayCard)})` 
        : paymentMethod,
      mixPayDetails: paymentMethod === 'Aralash (Mix)' ? { cash: mixPayCash, card: mixPayCard } : null,
      items: [...cart],
      subtotal: parseFloat(subtotal.toFixed(2)),
      discountPercent: customDiscount,
      discountSum: customDiscountSum,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      vatAmount: 0,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      sellerName: currentUser ? currentUser.name : "Adizova D. (POS)"
    };

    if (firebaseActive) {
      try {
        setFirebaseLoading(true);
        const batch = writeBatch(db);
        
        updatedProductsCopy.forEach(p => {
          batch.set(doc(db, "products", p.id), p);
        });

        batch.set(doc(db, "transactions", newTrxId), {
          ...newTrx,
          timestamp: serverTimestamp()
        });

        const logId = `log-${Date.now()}`;
        const newLog = {
          id: logId,
          time: newTrx.time,
          channel: "Physical POS",
          action: "Sotuv (POS Faktura)",
          details: `${newTrxId} cheki yaratildi. Tovarlar: ${deductionsLogs.join('; ')}`,
          change: -cart.reduce((sum, i) => sum + i.qty, 0),
          type: "sale"
        };
        batch.set(doc(db, "logs", logId), {
          ...newLog,
          timestamp: serverTimestamp()
        });

        await batch.commit();
        setCart([]);
        setSelectedCustomer({ name: '', phone: '' });
        setCustomDiscount(0);
        setCustomDiscountSum(0);
        setActivePOSInvoice(newTrx);
        showToast("Savdo muvaffaqiyatli", `Faktura ${newTrxId} saqlandi va Cloud-ga sinxronlandi.`, "success");
      } catch (err) {
        console.error("Firestore batch commit failed. Falling back to local state:", err);
        showToast("Cloud Xatoligi", "Firestore bazasiga yozib bo'lmadi. Savdo offline rejimda amalga oshirildi.", "info");
        
        setProducts(updatedProductsCopy);
        setTransactions(prev => [newTrx, ...prev]);
        setCart([]);
        setSelectedCustomer({ name: '', phone: '' });
        setCustomDiscount(0);
        setCustomDiscountSum(0);
        
        addSystemLog(
          "Sotuv (Offline)",
          `${newTrxId} chek offline rejimda yaratildi.`,
          -cart.reduce((sum, i) => sum + i.qty, 0),
          "Local POS"
        );
        setActivePOSInvoice(newTrx);
      } finally {
        setFirebaseLoading(false);
      }
    } else {
      setProducts(updatedProductsCopy);
      setTransactions(prev => [newTrx, ...prev]);
      setCart([]);
      setSelectedCustomer({ name: '', phone: '' });
      setCustomDiscount(0);

      addSystemLog(
        "Sotuv (POS Faktura)",
        `${newTrxId} chek yaratildi (Offline).`,
        -cart.reduce((sum, i) => sum + i.qty, 0),
        "Local POS",
        "sale"
      );
      setActivePOSInvoice(newTrx);
      showToast("Savdo muvaffaqiyatli", `Faktura ${newTrxId} offline rejimda saqlandi.`, "success");
    }
  };

  // --- PRODUCTION & BUNDLES WITH FIRESTORE BATCH ---
  const handleProduction = async (formulationId, batchCount = 1) => {
    const formulation = formulations.find(f => f.id === formulationId);
    if (!formulation) return;

    const ingredientChecks = formulation.ingredients.map(ing => {
      const currentRaw = rawMaterials.find(r => r.id === ing.id);
      const requiredAmount = ing.amount * batchCount;
      const isAvailable = currentRaw && currentRaw.qty >= requiredAmount;
      return {
        ...ing,
        currentStock: currentRaw ? currentRaw.qty : 0,
        requiredAmount,
        isAvailable
      };
    });

    const hasMissingIngredients = ingredientChecks.some(c => !c.isAvailable);
    if (hasMissingIngredients) {
      setModalError("Ishlab chiqarish uchun xom-ashyo zaxirasi yetarli emas!");
      return;
    }

    const updatedRawCopy = rawMaterials.map(rm => {
      const req = ingredientChecks.find(c => c.id === rm.id);
      if (req) {
        const newQty = parseFloat((rm.qty - req.requiredAmount).toFixed(2));
        return { ...rm, qty: newQty };
      }
      return rm;
    });

    const totalYield = formulation.batchYield * batchCount;
    const newBatchId = `LOT-PROD-${Date.now().toString().slice(-5)}`;
    const expiry = "2028-06-04"; 

    const updatedProductsCopy = products.map(p => {
      if (p.id !== formulation.resultProductId) return p;
      return {
        ...p,
        variants: p.variants.map(v => {
          if (v.sku !== formulation.resultVariantSku) return v;
          const currentBatches = v.batches || [];
          return {
            ...v,
            batches: [
              ...currentBatches,
              { batchId: newBatchId, qty: totalYield, expiryDate: expiry, mfgDate: todayDateStr }
            ]
          };
        })
      };
    });

    const ingredientDeductionsList = ingredientChecks
      .map(c => `${c.requiredAmount}${c.unit} ${c.name}`)
      .join(', ');

    const logDetails = `${totalYield}x ${formulation.resultVariantSku} ishlab chiqarildi. Sarflandi: ${ingredientDeductionsList}. Partiya: ${newBatchId}`;

    if (firebaseActive) {
      try {
        setFirebaseLoading(true);
        const batch = writeBatch(db);
        
        updatedRawCopy.forEach(rm => {
          const req = ingredientChecks.find(c => c.id === rm.id);
          if (req) {
            batch.set(doc(db, "raw_materials", rm.id), rm);
          }
        });

        const changedProd = updatedProductsCopy.find(p => p.id === formulation.resultProductId);
        batch.set(doc(db, "products", changedProd.id), changedProd);

        const logId = `log-${Date.now()}`;
        batch.set(doc(db, "logs", logId), {
          id: logId,
          time: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Tashkent', hour12: false, hour: '2-digit', minute: '2-digit' }),
          channel: "Tizim (Factory)",
          action: "Ishlab Chiqarish",
          details: logDetails,
          change: totalYield,
          type: "restock",
          timestamp: serverTimestamp()
        });

        await batch.commit();
        showToast("Muvaffaqiyatli!", `Ishlab chiqarish muvaffaqiyatli yakunlandi! Yangi partiya yaratildi: ${newBatchId} (+${totalYield} dona)`, "success");
      } catch (e) {
        console.error("Firestore production failed. Falling back locally:", e);
        setRawMaterials(updatedRawCopy);
        setProducts(updatedProductsCopy);
        addSystemLog("Ishlab Chiqarish", logDetails, totalYield, "Tizim (Factory)", "restock");
        showToast("Muvaffaqiyatli!", `Ishlab chiqarish yakunlandi (Offline)! Partiya: ${newBatchId}`, "success");
      } finally {
        setFirebaseLoading(false);
      }
    } else {
      setRawMaterials(updatedRawCopy);
      setProducts(updatedProductsCopy);
      addSystemLog("Ishlab Chiqarish", logDetails, totalYield, "Tizim (Factory)", "restock");
      showToast("Muvaffaqiyatli!", `Ishlab chiqarish yakunlandi (Offline)! Partiya: ${newBatchId}`, "success");
    }
  };

  // Bundle Sale Simulation
  const handleBundleSale = async (bundleId, saleQty, channelName) => {
    const bundle = bundles.find(b => b.id === bundleId);
    if (!bundle) return;

    const maxBundles = getBundleMaxQty(bundle);
    if (maxBundles < saleQty) {
      showToast("Zaxira Yetarli Emas", `Zaxirada yetarli to'plam tarkibi yo'q! So'ralgan: ${saleQty}, Sotilishi mumkin: ${maxBundles}`, "warning");
      return;
    }

    const updatedProductsCopy = JSON.parse(JSON.stringify(products));
    const logsList = [];
    let success = true;

    bundle.items.forEach(item => {
      const reqQty = item.qty * saleQty;
      const res = applyFefoDeduction(item.sku, reqQty, `${channelName} (To'plam)`, updatedProductsCopy);
      if (!res.success) {
        success = false;
        showToast("Zaxira Xatoligi", res.error, "warning");
      } else {
        logsList.push(`${reqQty}x ${item.sku} (${res.deductionsList})`);
      }
    });

    if (success) {
      const newTrxId = `TRX-${1000 + transactions.length + 1}`;
      const bundleTrx = {
        id: newTrxId,
        date: todayDateStr,
        time: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Tashkent', hour12: false, hour: '2-digit', minute: '2-digit' }),
        customerName: "Gift Bundle Customer",
        customerPhone: "To'plam savdosi",
        paymentMethod: "Naqd (Cash)",
        items: bundle.items.map(item => ({
          sku: item.sku,
          name: `[To'plam tarkibi] ${item.name}`,
          price: 0,
          qty: item.qty * saleQty,
          maxStock: 999
        })),
        subtotal: bundle.price * saleQty,
        discountPercent: 0,
        discountAmount: 0,
        vatAmount: 0,
        totalAmount: bundle.price * saleQty
      };

      if (firebaseActive) {
        try {
          setFirebaseLoading(true);
          const batch = writeBatch(db);
          
          updatedProductsCopy.forEach(p => {
            batch.set(doc(db, "products", p.id), p);
          });
          
          batch.set(doc(db, "transactions", newTrxId), {
            ...bundleTrx,
            timestamp: serverTimestamp()
          });

          const logId = `log-${Date.now()}`;
          batch.set(doc(db, "logs", logId), {
            id: logId,
            time: bundleTrx.time,
            channel: channelName,
            action: "To'plam Sotilishi",
            details: `"${bundle.name}" to'plami sotildi. Tarkib: ${logsList.join('; ')}`,
            change: -saleQty,
            type: "sale",
            timestamp: serverTimestamp()
          });

          await batch.commit();
          showToast("To'plam Sotildi", `"${bundle.name}" to'plami muvaffaqiyatli sotildi!`, "success");
        } catch (e) {
          console.error("Firestore bundle sale failed. Falling back locally:", e);
          setProducts(updatedProductsCopy);
          setTransactions(prev => [bundleTrx, ...prev]);
          addSystemLog("To'plam Sotilishi", `"${bundle.name}" to'plami sotildi. Tarkib: ${logsList.join('; ')}`, -saleQty, channelName, "sale");
          showToast("To'plam Sotildi (Offline)", `"${bundle.name}" to'plami lokal ravishda sotildi (Offline)!`, "success");
        } finally {
          setFirebaseLoading(false);
        }
      } else {
        setProducts(updatedProductsCopy);
        setTransactions(prev => [bundleTrx, ...prev]);
        addSystemLog("To'plam Sotilishi", `"${bundle.name}" to'plami sotildi. Tarkib: ${logsList.join('; ')}`, -saleQty, channelName, "sale");
        showToast("To'plam Sotildi (Offline)", `"${bundle.name}" to'plami lokal ravishda sotildi (Offline)!`, "success");
      }
    }
  };

  // Omnichannel Sync Simulator Action
  const triggerOmnichannelSync = () => {
    addSystemLog("Sinxronizatsiya boshlandi", "Onlayn va oflayn kanallar tekshirilmoqda...", 0, "Omni-Sinxronizator", "info");
    
    setTimeout(() => {
      const shopifySaleChance = Math.random() > 0.3;
      if (shopifySaleChance) {
        let foundVariant = null;
        for (const p of products) {
          for (const v of p.variants) {
            if (getVariantStock(v) > 2) {
              foundVariant = v;
              break;
            }
          }
          if (foundVariant) break;
        }

        if (foundVariant) {
          handleFefoSale(foundVariant.sku, 1, "Online Shopify Store");
          addSystemLog("Integratsiya", "Shopify yangi buyurtmani avtomatik uzatdi va FEFO bo'yicha zaxira ajratildi.", -1, "Shopify API", "sale");
        }
      }

      addSystemLog("Sinxronizatsiya yakunlandi", "Barcha zaxiralar onlayn/oflayn sotuv kanallari bilan muvaffaqiyatli sinxronlandi. 0 xatolik.", 0, "Omni-Sinxronizator", "success");
    }, 800);
  };

  // --- CANCEL/VOID TRANSACTION ACTION ---
  const handleCancelTransaction = (trx) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'sotuvchi')) {
      showToast("Taqiqlangan", "Fakturani bekor qilish uchun admin yoki sotuvchi huquqi talab etiladi!", "error");
      return;
    }
    setCancellingTrx(trx);
    setModalInputs({ cancelReason: '' });
    setModalError('');
    setActiveModal('cancel-transaction');
  };

  const submitCancelTransaction = async (e) => {
    e.preventDefault();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'sotuvchi')) {
      showToast("Taqiqlangan", "Fakturani bekor qilish uchun admin yoki sotuvchi huquqi talab etiladi!", "error");
      return;
    }

    if (!cancellingTrx) return;
    const reason = modalInputs.cancelReason;
    if (!reason || reason.trim() === '') {
      setModalError("Iltimos, bekor qilish sababini kiriting.");
      return;
    }

    const updatedProductsCopy = JSON.parse(JSON.stringify(products));
    const modifiedProductIds = new Set();
    let totalQtyReturned = 0;

    cancellingTrx.items.forEach(item => {
      updatedProductsCopy.forEach(p => {
        const v = p.variants.find(varItem => varItem.sku === item.sku);
        if (v) {
          if (!p.isService) {
            if (v.batches && v.batches.length > 0) {
              v.batches[0].qty += item.qty;
            } else {
              v.batches = [{
                batchId: `LOT-RET-${Date.now().toString().slice(-5)}`,
                qty: item.qty,
                expiryDate: "2027-12-31",
                mfgDate: "2025-06-01"
              }];
            }
            totalQtyReturned += item.qty;
            modifiedProductIds.add(p.id);
          }
        }
      });
    });

    const updatedTrx = { 
      ...cancellingTrx, 
      status: 'cancelled', 
      cancelReason: reason,
      cancelledBy: currentUser.name || currentUser.email,
      cancelledAt: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Tashkent', hour12: false, hour: '2-digit', minute: '2-digit' }),
      timestamp: cancellingTrx.timestamp || serverTimestamp()
    };
    const logDetails = `${cancellingTrx.id} faktura bekor qilindi. Sabab: "${reason}". ${totalQtyReturned} ta tovar zaxiraga qaytarildi.`;

    if (firebaseActive) {
      try {
        setFirebaseLoading(true);
        const batch = writeBatch(db);

        // Update modified products in Firestore
        modifiedProductIds.forEach(pId => {
          const prodObj = updatedProductsCopy.find(p => p.id === pId);
          if (prodObj) {
            batch.set(doc(db, "products", pId), prodObj);
          }
        });

        // Update transaction status in Firestore
        batch.set(doc(db, "transactions", cancellingTrx.id), updatedTrx);

        // Add a system log to Firestore
        const logId = `log-${Date.now()}`;
        const newLog = {
          id: logId,
          time: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Tashkent', hour12: false, hour: '2-digit', minute: '2-digit' }),
          channel: "Tizim (System)",
          action: "Faktura Bekor Qilindi",
          details: logDetails,
          change: totalQtyReturned,
          type: "restock"
        };
        batch.set(doc(db, "logs", logId), {
          ...newLog,
          timestamp: serverTimestamp()
        });

        await batch.commit();
        showToast("Faktura Bekor Qilindi", `${cancellingTrx.id} muvaffaqiyatli bekor qilindi.`, "success");
        setActiveModal(null);
        setCancellingTrx(null);
        setModalInputs({});
        setModalError('');
      } catch (err) {
        console.error("Firestore transaction cancellation failed. Falling back locally:", err);
        showToast("Lokal Bekor Qilish", "Firestore-ga yozib bo'lmadi. Lokal ravishda bekor qilindi.", "info");
        
        setProducts(updatedProductsCopy);
        setTransactions(prev => prev.map(t => t.id === cancellingTrx.id ? updatedTrx : t));
        addSystemLog("Faktura Bekor Qilindi", logDetails, totalQtyReturned, "Local Tizim", "restock");
        setActiveModal(null);
        setCancellingTrx(null);
        setModalInputs({});
        setModalError('');
      } finally {
        setFirebaseLoading(false);
      }
    } else {
      setProducts(updatedProductsCopy);
      setTransactions(prev => prev.map(t => t.id === cancellingTrx.id ? updatedTrx : t));
      addSystemLog("Faktura Bekor Qilindi", logDetails, totalQtyReturned, "Local Tizim", "restock");
      showToast("Faktura Bekor Qilindi", `${cancellingTrx.id} bekor qilindi va lokal zaxira yangilandi.`, "success");
      setActiveModal(null);
      setCancellingTrx(null);
      setModalInputs({});
      setModalError('');
    }
  };

  // --- HISTORICAL TRANSACTIONS INPUT HELPERS ---
  const histSubtotal = histItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const getHistDiscountAmount = () => {
    const sanitizedVal = histDiscountValue.replace(/[^\d\.,]/g, '');
    let parsedNum = 0;
    if (histDiscountType === "amount") {
      const cleanAmount = sanitizedVal.replace(/[\.,]/g, '');
      parsedNum = parseFloat(cleanAmount) || 0;
    } else {
      const cleanPercent = sanitizedVal.replace(',', '.');
      parsedNum = parseFloat(cleanPercent) || 0;
    }

    if (histDiscountType === "percent") {
      return Math.round(histSubtotal * parsedNum / 100);
    } else {
      return parsedNum;
    }
  };

  const histDiscountAmount = Math.min(histSubtotal, getHistDiscountAmount());
  const histTotalAmount = Math.max(0, histSubtotal - histDiscountAmount);

  const handleHistMixCashChange = (val) => {
    const cash = Math.min(histTotalAmount, Math.max(0, parseFloat(val) || 0));
    setHistMixCash(cash);
    setHistMixCard(histTotalAmount - cash);
  };

  const handleHistMixCardChange = (val) => {
    const card = Math.min(histTotalAmount, Math.max(0, parseFloat(val) || 0));
    setHistMixCard(card);
    setHistMixCash(histTotalAmount - card);
  };

  useEffect(() => {
    if (histPaymentMethod === 'Aralash (Mix)') {
      if (histMixCash > histTotalAmount) {
        setHistMixCash(histTotalAmount);
        setHistMixCard(0);
      } else {
        setHistMixCard(histTotalAmount - histMixCash);
      }
    }
  }, [histTotalAmount]);

  useEffect(() => {
    if (histPaymentMethod === 'Aralash (Mix)') {
      setHistMixCash(Math.round(histTotalAmount / 2));
      setHistMixCard(histTotalAmount - Math.round(histTotalAmount / 2));
    }
  }, [histPaymentMethod]);

  // When selected SKU changes, auto-set default price
  useEffect(() => {
    if (!histSelectedSku) {
      setHistSelectedPrice(0);
      return;
    }
    let foundPrice = 0;
    products.forEach(p => {
      const v = p.variants.find(varItem => varItem.sku === histSelectedSku);
      if (v) {
        foundPrice = v.price;
      }
    });
    setHistSelectedPrice(foundPrice);
  }, [histSelectedSku, products]);

  const handleHistDiscountChange = (val) => {
    const sanitizedVal = val.replace(/[^\d\.,]/g, '');
    setHistDiscountValue(sanitizedVal);
  };

  const handleHistDiscountTypeChange = (type) => {
    setHistDiscountType(type);
  };

  const addHistItem = () => {
    if (!histSelectedSku) return;
    let productName = "";
    products.forEach(p => {
      const v = p.variants.find(varItem => varItem.sku === histSelectedSku);
      if (v) {
        productName = p.name;
      }
    });

    const existingIndex = histItems.findIndex(i => i.sku === histSelectedSku);
    if (existingIndex > -1) {
      setHistItems(prev => prev.map((item, idx) => idx === existingIndex 
        ? { ...item, qty: item.qty + parseInt(histSelectedQty, 10), price: parseFloat(histSelectedPrice) } 
        : item
      ));
    } else {
      setHistItems(prev => [...prev, {
        sku: histSelectedSku,
        name: productName || histSelectedSku,
        price: parseFloat(histSelectedPrice),
        qty: parseInt(histSelectedQty, 10)
      }]);
    }
    setHistSelectedSku("");
    setHistSelectedQty(1);
    setHistSelectedPrice(0);
  };

  const removeHistItem = (sku) => {
    setHistItems(prev => prev.filter(i => i.sku !== sku));
  };

  const resetHistStates = () => {
    setHistDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' }));
    setHistTime("12:00");
    setHistCustomerName("");
    setHistCustomerPhone("");
    setHistPaymentMethod("Naqd (Cash)");
    setHistMixCash(0);
    setHistMixCard(0);
    setHistItems([]);
    setHistSelectedSku("");
    setHistSelectedQty(1);
    setHistSelectedPrice(0);
    setHistDiscountValue("");
    setHistDiscountType("percent");
  };

  const submitHistoricalTransaction = async (e) => {
    e.preventDefault();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'sotuvchi')) {
      showToast("Taqiqlangan", "Tarixiy savdoni kiritish uchun admin yoki sotuvchi huquqi talab etiladi!", "error");
      return;
    }

    if (histItems.length === 0) {
      showToast("Xatolik", "Iltimos, kamida bitta mahsulot qo'shing.", "warning");
      return;
    }

    const newTrxId = `TRX-HIST-${Date.now().toString().slice(-6)}`;
    const newTrx = {
      id: newTrxId,
      date: histDate,
      time: histTime,
      customerName: histCustomerName || "Tarixiy Mijoz",
      customerPhone: histCustomerPhone || "Kiritilmagan",
      paymentMethod: histPaymentMethod === 'Aralash (Mix)'
        ? `Aralash (Naqd: ${formatSum(histMixCash)} / Karta: ${formatSum(histMixCard)})`
        : histPaymentMethod,
      mixPayDetails: histPaymentMethod === 'Aralash (Mix)' ? { cash: histMixCash, card: histMixCard } : null,
      items: [...histItems],
      subtotal: parseFloat(histSubtotal.toFixed(2)),
      discountPercent: histDiscountType === 'percent' ? (parseFloat(histDiscountValue.replace(',', '.')) || 0) : 0,
      discountSum: histDiscountType === 'amount' ? (parseFloat(histDiscountValue.replace(/[\.,]/g, '')) || 0) : 0,
      discountAmount: parseFloat(histDiscountAmount.toFixed(2)),
      vatAmount: 0,
      totalAmount: parseFloat(histTotalAmount.toFixed(2)),
      isHistorical: true,
      sellerName: currentUser ? currentUser.name : "Adizova D. (POS)"
    };

    if (firebaseActive) {
      try {
        setFirebaseLoading(true);
        const batch = writeBatch(db);

        // Save transaction to Firestore (without touching products!)
        batch.set(doc(db, "transactions", newTrxId), {
          ...newTrx,
          timestamp: serverTimestamp()
        });

        // Add a system log
        const logId = `log-${Date.now()}`;
        const newLog = {
          id: logId,
          time: newTrx.time,
          channel: "Tizim (Historical)",
          action: "Tarixiy Savdo Kiritildi",
          details: `${newTrxId} chek kiritildi. Summa: ${formatSum(histTotalAmount)}. (Zaxira o'zgartirilmadi)`,
          change: 0,
          type: "info"
        };
        batch.set(doc(db, "logs", logId), {
          ...newLog,
          timestamp: serverTimestamp()
        });

        await batch.commit();
        showToast("Muvaffaqiyatli", `Tarixiy faktura ${newTrxId} muvaffaqiyatli kiritildi.`, "success");
        setActiveModal(null);
        resetHistStates();
      } catch (err) {
        console.error("Firestore historical checkout failed:", err);
        showToast("Xatolik", "Firestore-ga yozib bo'lmadi. Lokal saqlandi.", "info");
        setTransactions(prev => [newTrx, ...prev]);
        addSystemLog("Tarixiy Savdo (Offline)", `${newTrxId} offline kiritildi.`, 0, "Tizim (Historical)");
        setActiveModal(null);
        resetHistStates();
      } finally {
        setFirebaseLoading(false);
      }
    } else {
      setTransactions(prev => [newTrx, ...prev]);
      addSystemLog("Tarixiy Savdo (Offline)", `${newTrxId} offline kiritildi.`, 0, "Tizim (Historical)");
      showToast("Muvaffaqiyatli", `Tarixiy faktura ${newTrxId} lokal saqlandi.`, "success");
      setActiveModal(null);
      resetHistStates();
    }
  };

  const handlePrintReport = () => {
    const printContent = document.getElementById('printable-report-area').innerHTML;
    const printWindow = window.open('', '', 'height=700,width=900');
    if (!printWindow) {
      showToast("Xatolik", "Pop-up oyna bloklandi! Iltimos, pop-up oynalarga ruxsat bering.", "warning");
      return;
    }
    printWindow.document.write('<html><head><title>Sotuvlar Hisoboti</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; color: #1C1A19; background: #fff; line-height: 1.4; }
      h1 { text-align: center; margin-bottom: 5px; font-size: 1.6rem; color: #1C1A19; font-weight: bold; }
      .subtitle { text-align: center; color: #6E6461; font-size: 0.85rem; margin-bottom: 25px; }
      
      /* KPI Grid */
      .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 25px; }
      .kpi-card { border: 1px solid #D4CBC4; padding: 12px; border-radius: 8px; background: #F7F4F1 !important; display: flex; flex-direction: column; justify-content: space-between; }
      .kpi-icon { display: none !important; }
      .kpi-title { font-size: 0.7rem; color: #6E6461; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
      .kpi-value { font-size: 1.1rem; font-weight: bold; margin-top: 4px; color: #1C1A19; }
      .kpi-trend { font-size: 0.7rem; color: #6E6461; margin-top: 4px; }
      
      /* Dashboard Grid */
      .dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; page-break-inside: avoid; }
      .panel { border: 1px solid #D4CBC4; border-radius: 8px; padding: 12px; background: #fff; }
      .panel-header { border-bottom: 1px solid #EAE5E0; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
      .panel-title h3 { margin: 0; font-size: 0.95rem; font-weight: bold; }
      .panel-title p { margin: 2px 0 0 0; font-size: 0.75rem; color: #6E6461; }
      
      /* Tables */
      table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 0.8rem; page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      th, td { border: 1px solid #D4CBC4; padding: 6px 8px; text-align: left; }
      th { background-color: #EDE8E3 !important; font-weight: 600; font-size: 0.8rem; color: #1C1A19; }
      tbody tr:nth-child(even) { background-color: #FAF8F6 !important; }
      
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .badge { padding: 2px 4px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; display: inline-block; background: #E8F0F7 !important; color: #4A6882 !important; border: 1px solid #D4CBC4; }
      
      .no-print { display: none !important; }
      .printable-report-header { display: block !important; text-align: center; margin-bottom: 20px; }
      
      @page { size: A4; margin: 15mm; }
    `);
    printWindow.document.write('</style></head><body>');
    printWindow.document.write(printContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 350);
  };

  const handleDownloadExcel = () => {
    try {
      // 1. Calculate repTransactions locally
      const repTransactions = activeTransactions.filter(t => {
        if (reportType === 'daily') {
          return t.date === reportDate;
        } else {
          return t.date >= reportStartDate && t.date <= reportEndDate;
        }
      });

      const title = reportType === 'daily'
        ? `Sotilgan Mahsulotlar Hisoboti - ${reportDate}`
        : `Sotilgan Mahsulotlar Hisoboti - ${reportStartDate} dan ${reportEndDate} gacha`;

      let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8"/>
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Sotilgan Mahsulotlar</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: Calibri, sans-serif; }
    table { border-collapse: collapse; width: 100%; }
    th { border: 1px solid #d4cbc4; padding: 10px; background-color: #1c1a19; color: #ffffff; font-weight: bold; text-align: left; font-size: 11pt; }
    td { border: 1px solid #d4cbc4; padding: 8px; font-size: 10pt; vertical-align: middle; }
    .title-row { font-size: 14pt; font-weight: bold; text-align: center; height: 35px; background-color: #f7f4f1; }
    .subtitle-row { font-size: 10pt; color: #6e6461; text-align: center; height: 22px; background-color: #f7f4f1; }
    .number-cell { text-align: right; }
    .text-center { text-align: center; }
    .total-row { font-weight: bold; background-color: #ede8e3; }
  </style>
</head>
<body>
  <table>
    <!-- Main Title -->
    <tr>
      <td colspan="10" class="title-row">${title}</td>
    </tr>
    <tr>
      <td colspan="10" class="subtitle-row">Yuklab olingan sana: ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}</td>
    </tr>
    <tr><td colspan="10" style="border: none; height: 10px;"></td></tr>

    <tr>
      <th>Mahsulot Nomi</th>
      <th>Shtrix Kod (SKU)</th>
      <th class="number-cell">Narxi (Uzs)</th>
      <th class="number-cell">Soni</th>
      <th class="number-cell">Jami Summa (Uzs)</th>
      <th class="text-center">Chegirma %</th>
      <th class="number-cell">Chegirma Summasi (Uzs)</th>
      <th class="number-cell">To'lov Summasi (Uzs)</th>
      <th>Sana & Vaqt</th>
      <th>To'lov Turi</th>
    </tr>`;

      let totalQty = 0;
      let totalGross = 0;
      let totalDiscount = 0;
      let totalNet = 0;

      if (repTransactions.length === 0) {
        html += `<tr><td colspan="10" class="text-center">Ushbu muddatda hech qanday sotuv topilmadi</td></tr>`;
      } else {
        repTransactions.forEach(t => {
          t.items?.forEach(item => {
            let price = item.price;
            let name = item.name;
            const sku = item.sku || '';
            
            // Resolve price/name if missing
            if (!price || price === 0) {
              for (const p of products) {
                const variant = p.variants?.find(v => v.sku === sku);
                if (variant) {
                  price = variant.price;
                  if (!name) name = p.name;
                  break;
                }
              }
            }

            const qty = item.qty || 0;
            const itemPrice = price || 0;
            const grossSum = itemPrice * qty;
            const discPercent = t.subtotal > 0 ? ((t.discountAmount || 0) / t.subtotal) * 100 : 0;
            const discSum = grossSum * (discPercent / 100);
            const netSum = grossSum - discSum;

            totalQty += qty;
            totalGross += grossSum;
            totalDiscount += discSum;
            totalNet += netSum;

            html += `<tr>
              <td style="font-weight: 500;">${name || item.name || sku}</td>
              <td style="color: #6e6461;">${sku}</td>
              <td class="number-cell">${formatSum(itemPrice)}</td>
              <td class="number-cell">${qty} dona</td>
              <td class="number-cell">${formatSum(grossSum)}</td>
              <td class="text-center">${discPercent}%</td>
              <td class="number-cell">${formatSum(discSum)}</td>
              <td class="number-cell" style="font-weight: bold; color: #2e7d32;">${formatSum(netSum)}</td>
              <td>${t.date} ${t.time || ''}</td>
              <td>${t.paymentMethod || "Naqd"}</td>
            </tr>`;
          });
        });
      }

      // Add a summary total row if there are transactions
      if (repTransactions.length > 0) {
        html += `<tr class="total-row">
          <td colspan="3">JAMI</td>
          <td class="number-cell">${totalQty} dona</td>
          <td class="number-cell">${formatSum(totalGross)}</td>
          <td class="text-center">-</td>
          <td class="number-cell">${formatSum(totalDiscount)}</td>
          <td class="number-cell" style="color: #2e7d32;">${formatSum(totalNet)}</td>
          <td colspan="2"></td>
        </tr>`;
      }

      html += `
  </table>
</body>
</html>`;

      const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Sotilgan_Mahsulotlar_Hisoboti_${reportDate || 'sana_oraligi'}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("Muvaffaqiyatli", "Hisobot Excel formatida yuklab olindi.", "success");
    } catch (err) {
      console.error(err);
      showToast("Xatolik", "Excel yuklashda xatolik yuz berdi.", "danger");
    }
  };

  // --- ADD BATCH MODAL ACTION ---
  const submitAddBatch = async (e) => {
    e.preventDefault();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'sotuvchi')) {
      showToast("Taqiqlangan", "Ushbu amalni bajarish uchun admin yoki sotuvchi huquqi talab etiladi!", "error");
      return;
    }
    const { qty, expiryDate, mfgDate } = modalInputs;

    if (!qty || qty <= 0) {
      setModalError("Iltimos, to'g'ri miqdor kiriting.");
      return;
    }
    if (!expiryDate || !mfgDate) {
      setModalError("Iltimos, sanalarni kiriting.");
      return;
    }

    const newBatch = {
      batchId: `LOT-ADD-${Date.now().toString().slice(-5)}`,
      qty: parseInt(qty, 10),
      expiryDate,
      mfgDate
    };

    const targetProduct = products.find(p => p.id === modalInputs.productId);
    const updatedProduct = {
      ...targetProduct,
      variants: targetProduct.variants.map(v => {
        if (v.id !== modalInputs.variantId) return v;
        return {
          ...v,
          batches: [...(v.batches || []), newBatch]
        };
      })
    };

    const logDetails = `Yangi zaxira qo'shildi: ${qty}x ${modalInputs.variantSku} (${newBatch.batchId}, EXP: ${expiryDate})`;

    if (firebaseActive) {
      try {
        setFirebaseLoading(true);
        await setDoc(doc(db, "products", targetProduct.id), updatedProduct);
        await addSystemLog("Yangi partiya (Restock)", logDetails, parseInt(qty, 10), "Ombor (Warehouse)", "restock");
        
        setActiveModal(null);
        setModalInputs({});
        setModalError('');
      } catch (err) {
        console.error("Firestore batch addition failed. Falling back locally:", err);
        setProducts(prevProducts => prevProducts.map(p => p.id === targetProduct.id ? updatedProduct : p));
        addSystemLog("Yangi partiya (Restock)", logDetails, parseInt(qty, 10), "Ombor (Warehouse)", "restock");
        setActiveModal(null);
        setModalInputs({});
        setModalError('');
      } finally {
        setFirebaseLoading(false);
      }
    } else {
      setProducts(prevProducts => prevProducts.map(p => p.id === targetProduct.id ? updatedProduct : p));
      addSystemLog("Yangi partiya (Restock)", logDetails, parseInt(qty, 10), "Ombor (Warehouse)", "restock");
      setActiveModal(null);
      setModalInputs({});
      setModalError('');
    }
  };

  // --- ADD PRODUCT MODAL ACTION ---
  const submitAddProduct = async (e) => {
    e.preventDefault();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'sotuvchi')) {
      showToast("Taqiqlangan", "Ushbu amalni bajarish uchun admin yoki sotuvchi huquqi talab etiladi!", "error");
      return;
    }
    const { name, brand, category, skuPrefix, desc, variantName, variantSku, variantBarcode, variantPrice, variantColor, reorderLevel } = modalInputs;

    if (!name || !brand || !category || !skuPrefix || !variantSku || !variantPrice) {
      setModalError("Iltimos, barcha majburiy maydonlarni to'ldiring.");
      return;
    }

    const newProduct = {
      id: `prod-${Date.now()}`,
      name,
      brand,
      category,
      skuPrefix,
      description: desc || '',
      reorderLevel: parseInt(reorderLevel, 10) || 10,
      variants: [
        {
          id: `var-${Date.now()}-1`,
          name: variantName || "Standard",
          sku: variantSku,
          barcode: (variantBarcode || '').trim(),
          colorCode: variantColor || "#A88070",
          price: parseFloat(variantPrice),
          batches: []
        }
      ]
    };

    if (firebaseActive) {
      try {
        setFirebaseLoading(true);
        await setDoc(doc(db, "products", newProduct.id), newProduct);
        await addSystemLog("Yangi mahsulot yaratildi", `Mahsulot: ${name} kiritildi.`, 0, "Tizim", "info");
        
        setActiveModal(null);
        setModalInputs({});
        setModalError('');
      } catch (err) {
        console.error("Firestore product creation failed. Falling back locally:", err);
        setProducts(prev => [...prev, newProduct]);
        addSystemLog("Yangi mahsulot yaratildi", `Mahsulot: ${name} kiritildi.`, 0, "Tizim", "info");
        setActiveModal(null);
        setModalInputs({});
        setModalError('');
      } finally {
        setFirebaseLoading(false);
      }
    } else {
      setProducts(prev => [...prev, newProduct]);
      addSystemLog("Yangi mahsulot yaratildi", `Mahsulot: ${name} kiritildi.`, 0, "Tizim", "info");
      setActiveModal(null);
      setModalInputs({});
      setModalError('');
    }
  };

  // --- BARCODE ACTIONS ---
  const handleOpenEditBarcode = (productId, variantId, currentBarcode) => {
    setActiveModal('edit-barcode');
    setModalInputs({
      productId,
      variantId,
      barcode: currentBarcode || ''
    });
    setModalError('');
  };

  const handleSaveBarcode = async (e) => {
    e.preventDefault();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'sotuvchi')) {
      showToast("Taqiqlangan", "Shtrix-kodni o'zgartirish uchun ruxsatingiz yo'q!", "error");
      return;
    }
    const { productId, variantId, barcode } = modalInputs;

    const updatedProducts = products.map(p => {
      if (p.id === productId) {
        const updatedVariants = p.variants.map(v => {
          if (v.id === variantId) {
            return { ...v, barcode: barcode.trim() };
          }
          return v;
        });
        return { ...p, variants: updatedVariants };
      }
      return p;
    });

    const targetProduct = updatedProducts.find(p => p.id === productId);

    if (firebaseActive && targetProduct) {
      try {
        setFirebaseLoading(true);
        await setDoc(doc(db, "products", productId), targetProduct);
        setProducts(updatedProducts);
        showToast("Shtrix-kod saqlandi", "Mahsulot shtrix-kodi muvaffaqiyatli saqlandi.", "success");
        setActiveModal(null);
        setModalInputs({});
      } catch (err) {
        console.error("Firestore barcode update failed:", err);
        setProducts(updatedProducts);
        showToast("Saqlandi (Lokal)", "Shtrix-kod lokal saqlandi (Offline).", "success");
        setActiveModal(null);
        setModalInputs({});
      } finally {
        setFirebaseLoading(false);
      }
    } else {
      setProducts(updatedProducts);
      showToast("Saqlandi (Lokal)", "Shtrix-kod lokal saqlandi (Offline).", "success");
      setActiveModal(null);
      setModalInputs({});
    }
  };

  // --- FILTERED PRODUCTS FOR POS ---
  const filteredPOSProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(posSearchTerm.toLowerCase()) ||
      p.brand.toLowerCase().includes(posSearchTerm.toLowerCase()) ||
      p.variants.some(v => v.name.toLowerCase().includes(posSearchTerm.toLowerCase()));
      
    const matchesCategory = posCategoryFilter === 'All' || p.category === posCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // --- FILTERED PRODUCTS FOR INVENTORY ---
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.variants.some(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', ...new Set(products.map(p => p.category))];

  if (!currentUser) {
    return (
      <div className="login-screen-overlay" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#1C1A19',
        fontFamily: 'Outfit, sans-serif',
        padding: '1rem',
        boxSizing: 'border-box'
      }}>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #D4CBC4',
          borderRadius: '32px',
          width: '100%',
          maxWidth: '420px',
          padding: '2.5rem',
          boxShadow: 'none',
          color: '#1C1A19',
          boxSizing: 'border-box'
        }}>
          {/* Logo / Brand */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#A88070',
              color: 'white',
              fontSize: '2.25rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
              boxShadow: 'none'
            }}>V</div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '0 0 0.25rem 0', color: '#1C1A19', letterSpacing: '-0.025em' }}>Vidalita</h1>
            <p style={{ fontSize: '0.875rem', color: '#6E6461', margin: 0 }}>POS & Cloud Tizimiga Kirish</p>
          </div>

          {loginError && (
            <div style={{
              backgroundColor: '#FDEEE9',
              border: '1px solid #C26E60',
              borderRadius: '24px',
              padding: '0.75rem 1.25rem',
              fontSize: '0.85rem',
              color: '#C26E60',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', color: '#6E6461', marginBottom: '0.5rem', marginLeft: '0.5rem' }}>E-pochta manzili</label>
              <input
                type="email"
                required
                placeholder="turkglobalcenter@gmail.com"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '24px',
                  background: '#F7F4F1',
                  border: '1px solid #D4CBC4',
                  color: '#1C1A19',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', color: '#6E6461', marginBottom: '0.5rem', marginLeft: '0.5rem' }}>Parol</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '24px',
                  background: '#F7F4F1',
                  border: '1px solid #D4CBC4',
                  color: '#1C1A19',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
            <button
              type="submit"
              disabled={isLoggingIn}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '24px',
                background: '#A88070',
                color: 'white',
                border: 'none',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: isLoggingIn ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s',
                marginTop: '0.5rem',
                boxShadow: 'none',
                opacity: isLoggingIn ? 0.7 : 1
              }}
              onMouseEnter={(e) => { if (!isLoggingIn) e.currentTarget.style.opacity = '0.9' }}
              onMouseLeave={(e) => { if (!isLoggingIn) e.currentTarget.style.opacity = '1' }}
            >
              {isLoggingIn ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Kirilmoqda...
                </span>
              ) : (
                "Tizimga Kirish"
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.75rem', color: '#6E6461' }}>
            Lokal va bulutli rejim qo'llab-quvvatlanadi
            <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: firebaseActive ? '#4E7A65' : '#C26E60' }}></span>
              <span style={{ marginLeft: '4px' }}>{firebaseActive ? "Bulut rejimi faol" : "Oflayn rejim faol"}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* HORIZONTAL NAVBAR */}
      <header className="navbar">
        <div className="brand-section">
          <div className="brand-logo-small">V</div>
          <div className="brand-text-block">
            <h2 className="brand-title">Vidalita</h2>
            <span className="brand-subtitle">POS & Cloud</span>
          </div>
        </div>

        <nav className="nav-links-horizontal">
          <button className={`nav-link-item ${activeTab === 'pos' ? 'active' : ''}`} onClick={() => setActiveTab('pos')}>
            <ShoppingCart size={16} />
            <span>POS Terminal</span>
          </button>
          <button className={`nav-link-item ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>
            <FileText size={16} />
            <span>Fakturalar</span>
          </button>
          {currentUser && (currentUser.role === 'admin' || currentUser.role === 'sotuvchi') && (
            <button className={`nav-link-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
              <TrendingUp size={16} />
              <span>Hisobotlar</span>
            </button>
          )}
          {currentUser && (currentUser.role === 'admin' || currentUser.role === 'sotuvchi') && (
            <button className={`nav-link-item ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
              <Package size={16} />
              <span>Zaxira</span>
            </button>
          )}
          {currentUser && currentUser.role === 'admin' && (
            <button className={`nav-link-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
              <Users size={16} />
              <span>Xodimlar</span>
            </button>
          )}
        </nav>

        <div className="nav-meta-section">
          <div className={`db-badge ${firebaseActive ? 'active' : 'offline'}`}>
            {firebaseActive ? (
              <>
                <Cloud size={14} style={{ color: 'var(--color-success)' }} />
                <span>Cloud: Faol</span>
              </>
            ) : (
              <>
                <CloudOff size={14} style={{ color: 'var(--color-warning)' }} />
                <span>Local rejim</span>
              </>
            )}
          </div>

          {/* Wipe button removed from header */}

          <div className="profile-container" style={{ position: 'relative' }}>
            <button
              onClick={() => setIsProfileDropdownOpen(prev => !prev)}
              className="user-badge-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                padding: '0.35rem 0.6rem',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: '#FFF'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
            >
              <div className="user-avatar-small" style={{
                background: currentUser.role === 'admin' ? 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' : 'var(--color-primary)',
                margin: 0
              }}>
                {currentUser.name ? currentUser.name.substring(0, 2).toUpperCase() : 'US'}
              </div>
              <div className="user-text-small" style={{ textAlign: 'left' }}>
                <span className="user-name-small">{currentUser.name}</span>
                <span className="user-role-small" style={{ textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  {currentUser.role === 'admin' ? 'Admin' : 'Sotuvchi'}
                  <ChevronDown size={10} style={{ opacity: 0.6 }} />
                </span>
              </div>
            </button>

            {isProfileDropdownOpen && (
              <div className="profile-dropdown" style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: 'rgba(30, 41, 59, 0.95)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '14px',
                padding: '0.75rem',
                minWidth: '200px',
                boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.5)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontFamily: 'Inter, sans-serif'
              }}>
                <div style={{ padding: '0.25rem 0.5rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#f8fafc' }}>{currentUser.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px', wordBreak: 'break-all' }}>{currentUser.email}</div>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />
                <button
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    handleLogout();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: 'none',
                    background: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    borderRadius: '8px',
                    textAlign: 'left',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <LogOut size={14} />
                  <span>Tizimdan chiqish</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main 
        className="content-viewport"
        style={activeTab === 'transactions' ? { 
          height: 'calc(100vh - 70px)', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          paddingBottom: '1.5rem'
        } : {}}
      >

        {/* CLOUD PERMISSION WARNING BANNER */}
        {firebaseError && (
          <div style={{ padding: '1rem', backgroundColor: 'var(--color-warning-light)', border: '1px solid var(--color-warning)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--color-text-main)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertTriangle style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: '2px' }} size={16} />
            <div>
              <strong>Firebase ulashda xatolik yuz berdi (Firestore Permissions Error):</strong>
              <p style={{ marginTop: '0.2rem', color: 'var(--color-text-muted)' }}>{firebaseError}</p>
              <p style={{ marginTop: '0.4rem', fontWeight: 600, color: 'var(--color-warning)' }}>
                Iltimos, Firebase Console-da Cloud Firestore Rules (Xavfsizlik qoidalari) qismini sinov rejimiga yoki "allow read, write: if true;" holatiga sozlang:
              </p>
              <pre style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '0.5rem', borderRadius: '4px', marginTop: '0.4rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
              </pre>
              <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                * Hozirda dastur avtomatik ravishda LocalStorage (Lokal rejim) fallbackidan xavfsiz foydalanmoqda. Zaxiralar va savdolar saqlanib turadi.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: POS CHECKOUT REGISTER */}
        {/* ========================================================================= */}
        {activeTab === 'pos' && (
          <>
            <div className="page-header" style={{ paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
              <div className="header-title">
                <h1>Sotuv POS Terminali (Checkout POS)</h1>
                <p>Mijozlarga kosmetika vositalarini sotish, chegirmalar va fakturalar (cheklar) chiqarish</p>
              </div>
            </div>

            <div className="pos-container">
              {/* Left Column: Product Grid */}
              <div className="pos-products-panel">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                  {/* Search and Scanner Controls */}
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Search Input */}
                    <div className="search-input-wrapper" style={{ flex: '2 1 250px', position: 'relative' }}>
                      <Search size={16} className="search-icon-pos" />
                      <input
                        type="text"
                        placeholder="Qidiruv (Mahsulot nomi yoki brend)..."
                        className="search-input"
                        value={posSearchTerm}
                        onChange={(e) => setPosSearchTerm(e.target.value)}
                      />
                    </div>

                    {/* Barcode/QR Scanner input */}
                    <div className="search-input-wrapper" style={{ flex: '1 1 200px', display: 'flex', alignItems: 'center', borderColor: 'var(--color-brand)', position: 'relative' }}>
                      <Scan size={16} className="search-icon-pos" style={{ color: 'var(--color-brand)' }} />
                      <input
                        ref={scannerInputRef}
                        type="text"
                        placeholder="QR / Barcode skanerlang..."
                        className="search-input"
                        value={scannedInput}
                        onChange={(e) => setScannedInput(e.target.value)}
                        onKeyDown={handleScannerKeyDown}
                        style={{ paddingRight: '2rem' }}
                      />
                      {scannedInput && (
                        <button 
                          type="button" 
                          onClick={() => setScannedInput('')} 
                          style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Camera Scanner Button */}
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setIsCameraScannerOpen(true)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        height: '40px', 
                        padding: '0 16px',
                        background: 'linear-gradient(135deg, var(--color-brand) 0%, #d4a373 100%)',
                        border: 'none',
                        color: 'white',
                        fontWeight: 500,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      <QrCode size={18} />
                      <span>Kamera orqali</span>
                    </button>

                    {/* Autofocus Toggle Switch */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', userSelect: 'none', color: 'var(--color-text-muted)' }}>
                      <input
                        type="checkbox"
                        checked={isScannerAutofocus}
                        onChange={(e) => setIsScannerAutofocus(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Avto-fokus</span>
                    </label>
                  </div>

                  {/* Category Selection Row (Chips) */}
                  <div className="category-chips-row">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        className={`category-chip ${posCategoryFilter === cat ? 'active' : ''}`}
                        onClick={() => setPosCategoryFilter(cat)}
                      >
                        <span>{getCategoryIcon(cat)}</span>
                        <span>{cat === 'All' ? 'Barcha toifalar' : cat}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {products.length === 0 ? (
                  <div style={{ textAlign: 'center', margin: 'auto 0', color: 'var(--color-text-light)', padding: '2rem' }}>
                    <Package size={48} style={{ margin: '0 auto 0.75rem', opacity: 0.2 }} />
                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>Mahsulotlar mavjud emas</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                      "Zaxira" bo'limiga o'tib, yangi mahsulot yoki zaxira qo'shing.
                    </p>
                  </div>
                ) : (
                  <div className="pos-grid">
                    {filteredPOSProducts.map(p => (
                      <div key={p.id} className="pos-card">
                        <div className="pos-card-header">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                            <span className="pos-card-brand">{p.brand}</span>
                            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--color-brand)' }}>{getCategoryIcon(p.category, 20)}</span>
                          </div>
                          <h4 className="pos-card-title">{p.name}</h4>
                        </div>

                        <div className="pos-card-image-wrapper">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="pos-card-image" />
                          ) : (
                            <div className="pos-card-image-placeholder">Surat yo'q</div>
                          )}
                        </div>

                        <div className="pos-variants-list">
                          {p.variants.map(v => {
                            const stock = getVariantStock(v);
                            const isOutOfStock = stock === 0;

                            return (
                              <div
                                key={v.id}
                                className={`pos-variant-row ${isOutOfStock ? 'disabled' : ''}`}
                                onClick={() => !isOutOfStock && addToCart(v, p)}
                              >
                                <div className="color-swatch-cell">
                                  <div className="color-swatch" style={{ backgroundColor: v.colorCode, width: '14px', height: '14px' }}></div>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{v.name}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                    {p.isService ? 'Cheksiz' : `${stock} dona bor`}
                                  </span>
                                  <strong style={{ fontSize: '0.75rem', color: 'var(--color-brand)' }}>{formatSum(v.price)}</strong>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Checkout Cart Sidebar */}
              <div className="pos-cart">
                <div className="pos-cart-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShoppingCart size={18} style={{ color: 'var(--color-brand)' }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Savat (Cart)</h3>
                  </div>
                  <span className="badge badge-info">{cart.reduce((sum, item) => sum + item.qty, 0)} ta tovar</span>
                </div>

                <div className="pos-cart-items">
                  {cart.length === 0 ? (
                    <div style={{ textAlign: 'center', margin: 'auto 0', color: 'var(--color-text-light)', padding: '2rem' }}>
                      <ShoppingCart size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                      <p style={{ fontSize: '0.85rem' }}>Savat bo'sh. Variant tanlab savatga qo'shing.</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.sku} className="pos-cart-item">
                        <div className="cart-item-info" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className="cart-item-name">{item.name}</span>
                          
                          {/* Editable Unit Price */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Narxi:</span>
                            <input
                              type="text"
                              className="form-control"
                              style={{ 
                                padding: '2px 6px', 
                                fontSize: '0.8rem', 
                                width: '80px', 
                                height: '24px', 
                                minHeight: 'unset',
                                textAlign: 'right',
                                boxSizing: 'border-box'
                              }}
                              value={item.price}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^\d]/g, '');
                                updateCartItemPrice(item.sku, parseFloat(val) || 0);
                              }}
                            />
                            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>so'm</span>
                          </div>
                        </div>

                        <div className="cart-item-controls">
                          <button type="button" className="cart-qty-btn" onClick={() => updateCartQty(item.sku, item.qty - 1)}>-</button>
                          <span className="cart-item-qty">{item.qty}</span>
                          <button type="button" className="cart-qty-btn" onClick={() => updateCartQty(item.sku, item.qty + 1)}>+</button>
                        </div>

                        <div className="cart-item-total">
                          {formatSum(item.price * item.qty)}
                        </div>

                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-warning)', paddingLeft: '0.5rem' }}
                          onClick={() => removeFromCart(item.sku)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <form className="pos-cart-footer" onSubmit={handlePOSCheckout}>
                  <div className="pos-customer-section">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Mijoz Ismi</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        placeholder="Masalan: Nilufar"
                        value={selectedCustomer.name}
                        onChange={(e) => setSelectedCustomer(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Mijoz Telefoni</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        placeholder="+998 90..."
                        value={selectedCustomer.phone}
                        onChange={(e) => setSelectedCustomer(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Clickable Payment Tiles (Cards) */}
                  <div className="form-group" style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>To'lov Usuli (Payment Method)</label>
                    <div className="pay-methods-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                      {[
                        { id: 'Naqd (Cash)', title: 'Naqd (Cash)', Icon: Banknote },
                        { id: 'Karta (Card)', title: 'Karta (Card)', Icon: CreditCard },
                        { id: 'Click/Payme', title: 'Click/Payme', Icon: Smartphone },
                        { id: 'Aralash (Mix)', title: 'Aralash (Mix)', Icon: Layers }
                      ].map(method => (
                        <button
                          key={method.id}
                          type="button"
                          className={`pay-method-card ${paymentMethod === method.id ? 'active' : ''}`}
                          onClick={() => setPaymentMethod(method.id)}
                          style={{ padding: '0.4rem 0.15rem' }}
                        >
                          <method.Icon size={16} className="pay-method-icon" />
                          <span className="pay-method-title" style={{ fontSize: '0.68rem' }}>{method.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {paymentMethod === 'Aralash (Mix)' && (
                    <div style={{ 
                      backgroundColor: 'rgba(0,0,0,0.02)', 
                      padding: '0.75rem', 
                      borderRadius: '6px', 
                      marginTop: '0.5rem', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.5rem',
                      border: '1px dashed var(--color-border || rgba(0,0,0,0.1))'
                    }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <div className="form-group" style={{ margin: 0, flex: 1 }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: 600 }}>Naqd summasi (Cash)</label>
                          <input
                            type="number"
                            min="0"
                            max={totalAmount}
                            className="form-control"
                            value={mixPayCash}
                            onChange={(e) => handleMixCashChange(e.target.value)}
                            style={{ height: '32px', fontSize: '0.85rem', padding: '0.3rem 0.5rem' }}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0, flex: 1 }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: 600 }}>Karta summasi (Card)</label>
                          <input
                            type="number"
                            min="0"
                            max={totalAmount}
                            className="form-control"
                            value={mixPayCard}
                            onChange={(e) => handleMixCardChange(e.target.value)}
                            style={{ height: '32px', fontSize: '0.85rem', padding: '0.3rem 0.5rem' }}
                          />
                        </div>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>
                        Jami: <strong>{formatSum(mixPayCash + mixPayCard)}</strong> / <strong>{formatSum(totalAmount)}</strong>
                      </div>
                    </div>
                  )}

                  {/* Quick Discount Preset Chips and Custom Input */}
                  <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                    {/* Row with Percent and Sum Discounts */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      {/* Percent Discount */}
                      <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                        <label style={{ fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Chegirma %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="form-control"
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.8rem', width: '45px', textAlign: 'center', height: '24px' }}
                          value={customDiscount}
                          onChange={(e) => setCustomDiscount(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                        />
                      </div>
                      
                      {/* Sum Discount */}
                      <div style={{ flex: 1.2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                        <label style={{ fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Chegirma (so'm)</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="0"
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.8rem', width: '80px', textAlign: 'right', height: '24px', boxSizing: 'border-box' }}
                          value={customDiscountSum === 0 ? "" : customDiscountSum}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^\d]/g, '');
                            setCustomDiscountSum(parseInt(val, 10) || 0);
                          }}
                        />
                      </div>
                    </div>

                    <div className="discount-chips-row">
                      {[0, 5, 10, 15, 20].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          className={`discount-chip ${customDiscount === pct ? 'active' : ''}`}
                          onClick={() => setCustomDiscount(pct)}
                        >
                          {pct === 0 ? "Chegirmasiz" : `${pct}%`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                    <div className="pos-summary-row">
                      <span>Subtotal (Oraliq jami):</span>
                      <span>{formatSum(subtotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="pos-summary-row" style={{ color: 'var(--color-warning)' }}>
                        <span>
                          Chegirma {customDiscount > 0 && customDiscountSum > 0 
                            ? `(${customDiscount}% + ${formatSum(customDiscountSum)})` 
                            : customDiscount > 0 
                              ? `(${customDiscount}%)` 
                              : `(${formatSum(customDiscountSum)})`
                          }:
                        </span>
                        <span>-{formatSum(discountAmount)}</span>
                      </div>
                    )}
                    <div className="pos-summary-row total">
                      <span>To'lov Jami:</span>
                      <span>{formatSum(totalAmount)}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.75rem', justifyContent: 'center', marginTop: '0.5rem' }}
                    disabled={cart.length === 0}
                  >
                    <CreditCard size={16} />
                    <span>Sotish va Faktura chiqarish</span>
                  </button>
                </form>
              </div>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB: SALES & INVOICE HISTORY */}
        {/* ========================================================================= */}
        {activeTab === 'transactions' && (
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden', height: '100%' }}>
            <div className="page-header" style={{ flexShrink: 0, paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
              <div className="header-title">
                <h1>Fakturalar va Savdo Tarixi (Invoices History)</h1>
                <p>POS terminali orqali amalga oshirilgan barcha sotuvlar ro'yxati va chek qayta chiqarish</p>
              </div>
              {currentUser && (currentUser.role === 'admin' || currentUser.role === 'sotuvchi') && (
                <div className="header-actions">
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      resetHistStates();
                      setModalError('');
                      setActiveModal('add-historical-sale');
                    }}
                  >
                    <Plus size={15} />
                    <span>Tarixiy savdo qo'shish</span>
                  </button>
                </div>
              )}
            </div>

            {/* STATS OVERVIEW */}
            <div className="kpi-grid" style={{ flexShrink: 0 }}>
              <div className="kpi-card success">
                <div>
                  <div className="kpi-icon">
                    <TrendingUp size={20} />
                  </div>
                  <div className="kpi-info">
                    <span className="kpi-title">Filtrlangan umumiy savdo</span>
                    <span className="kpi-value">
                      {formatSum(filteredActiveTransactions.reduce((sum, t) => sum + t.totalAmount, 0))}
                    </span>
                  </div>
                </div>
                <div className="kpi-trend up">
                  <span>Fakturalar soni: {filteredActiveTransactions.length} ta</span>
                </div>
              </div>

              <div className="kpi-card">
                <div>
                  <div className="kpi-icon" style={{ color: 'var(--color-brand)', backgroundColor: 'var(--color-brand-light)' }}>
                    <ShoppingCart size={20} />
                  </div>
                  <div className="kpi-info">
                    <span className="kpi-title">Sotilgan tovarlar</span>
                    <span className="kpi-value">
                      {filteredActiveTransactions.reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.qty, 0), 0)} dona
                    </span>
                  </div>
                </div>
                <div className="kpi-trend up">
                  <span>O'rtacha chek: {formatSum(filteredActiveTransactions.reduce((sum, t) => sum + t.totalAmount, 0) / (filteredActiveTransactions.length || 1))}</span>
                </div>
              </div>

              <div className="kpi-card">
                <div>
                  <div className="kpi-icon" style={{ color: 'var(--color-info)', backgroundColor: 'var(--color-info-light)' }}>
                    <User size={20} />
                  </div>
                  <div className="kpi-info">
                    <span className="kpi-title">Mijozlar faolligi</span>
                    <span className="kpi-value">
                      {new Set(filteredActiveTransactions.map(t => t.customerPhone)).size} ta
                    </span>
                  </div>
                </div>
                <div className="kpi-trend up">
                  <span>Noyob xaridorlar</span>
                </div>
              </div>
            </div>

            {/* FILTER PANEL */}
            <div className="panel" style={{ marginTop: '1rem', padding: '1rem', flexShrink: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>Qidiruv</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', minHeight: 'unset', height: '34px' }}
                    placeholder="ID, mijoz ismi, tel..."
                    value={trxSearchQuery}
                    onChange={(e) => setTrxSearchQuery(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>Boshlanish sanasi</label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', minHeight: 'unset', height: '34px' }}
                    value={trxStartDate}
                    onChange={(e) => setTrxStartDate(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>Tugash sanasi</label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', minHeight: 'unset', height: '34px' }}
                    value={trxEndDate}
                    onChange={(e) => setTrxEndDate(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>To'lov turi</label>
                  <select
                    className="form-control"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', minHeight: 'unset', height: '34px' }}
                    value={trxFilterPayment}
                    onChange={(e) => setTrxFilterPayment(e.target.value)}
                  >
                    <option value="All">Barchasi</option>
                    <option value="Naqd">Naqd</option>
                    <option value="Karta">Karta</option>
                    <option value="Aralash">Aralash (Mix)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>Holati</label>
                  <select
                    className="form-control"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', minHeight: 'unset', height: '34px' }}
                    value={trxFilterStatus}
                    onChange={(e) => setTrxFilterStatus(e.target.value)}
                  >
                    <option value="All">Barchasi</option>
                    <option value="active">Faol</option>
                    <option value="cancelled">Bekor qilingan</option>
                  </select>
                </div>

                <div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', height: '34px', width: '100%' }}
                    onClick={() => {
                      setTrxSearchQuery('');
                      setTrxStartDate('');
                      setTrxEndDate('');
                      setTrxFilterPayment('All');
                      setTrxFilterStatus('All');
                    }}
                  >
                    Filtrni tozalash
                  </button>
                </div>
              </div>
            </div>

            {/* TRANSACTIONS TABLE */}
            <div className="panel" style={{ marginTop: '1rem', flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="panel-header" style={{ flexShrink: 0 }}>
                <h3 style={{ fontSize: '1rem' }}>Savdo Fakturalari ro'yxati (Receipts Ledger)</h3>
              </div>
              <div className="panel-body" style={{ padding: 0, flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="table-container" style={{ flexGrow: 1, overflowY: 'auto' }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Faktura №</th>
                        <th>Sana / Vaqt</th>
                        <th>Mijoz</th>
                        <th>To'lov turi</th>
                        <th>Tovar soni</th>
                        <th>Jami summa</th>
                        <th>Harakatlar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                            {transactions.length === 0 
                              ? "Faktura topilmadi. POS orqali sotuvni amalga oshiring."
                              : "Filtrlangan shartlar bo'yicha faktura topilmadi."}
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map(t => {
                          const totalItems = t.items.reduce((sum, item) => sum + item.qty, 0);
                          const isCancelled = t.status === 'cancelled';
                          const hasEditedPrice = t.items && t.items.some(item => item.originalPrice !== undefined && item.originalPrice !== item.price);
                          return (
                            <tr key={t.id} style={isCancelled ? { opacity: 0.6, backgroundColor: 'rgba(239, 68, 68, 0.05)' } : {}}>
                              <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                                {t.id}
                                {isCancelled && <span className="badge badge-danger" style={{ marginLeft: '6px', fontSize: '0.65rem' }}>Bekor qilingan</span>}
                                {t.isHistorical && <span className="badge badge-info" style={{ marginLeft: '6px', fontSize: '0.65rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>Tarixiy</span>}
                                {hasEditedPrice && <span className="badge badge-warning" style={{ marginLeft: '6px', fontSize: '0.65rem' }}>O'zgartirilgan narx</span>}
                              </td>
                              <td>{t.date} | {t.time}</td>
                              <td>
                                <div>{t.customerName}</div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t.customerPhone}</span>
                                {isCancelled && t.cancelReason && (
                                  <div style={{ fontSize: '0.72rem', color: '#EF4444', marginTop: '4px', fontStyle: 'italic' }}>
                                    Izoh: {t.cancelReason}
                                  </div>
                                )}
                              </td>
                              <td>
                                <span className="badge badge-secondary">{t.paymentMethod}</span>
                              </td>
                              <td>{totalItems} dona</td>
                              <td style={{ fontWeight: 600 }}>
                                <span style={isCancelled ? { textDecoration: 'line-through', color: 'var(--color-text-muted)' } : {}}>
                                  {formatSum(t.totalAmount)}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                  onClick={() => setActivePOSInvoice(t)}
                                >
                                  <Printer size={12} />
                                  <span>Chek chiqarish</span>
                                </button>
                                {currentUser && (currentUser.role === 'admin' || currentUser.role === 'sotuvchi') && (
                                  <button
                                    className="btn btn-secondary"
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', marginLeft: '6px' }}
                                    onClick={() => handleStartEditTransaction(t)}
                                  >
                                    <Edit3 size={12} />
                                    <span>Tahrirlash</span>
                                  </button>
                                )}
                                {currentUser && (currentUser.role === 'admin' || currentUser.role === 'sotuvchi') && !isCancelled && (
                                  <button
                                    className="btn btn-danger"
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', marginLeft: '6px' }}
                                    onClick={() => handleCancelTransaction(t)}
                                  >
                                    <X size={12} />
                                    <span>Bekor qilish</span>
                                  </button>
                                )}
                                {currentUser && currentUser.role === 'admin' && (
                                  <button
                                    className="btn btn-danger"
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', marginLeft: '6px', backgroundColor: '#DC2626', borderColor: '#DC2626' }}
                                    onClick={() => handleDeleteTransaction(t.id)}
                                  >
                                    <Trash2 size={12} />
                                    <span>O'chirish</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard tab removed */}
        {activeTab === '__DISABLED_DASHBOARD__' && (
          <>
            <div className="page-header">
              <div className="header-title">
                <h1>Boshqaruv Paneli (Dashboard)</h1>
                <p>Kosmetika va go'zallik do'koni zaxiralari, yaroqlilik muddatlari tahlili</p>
              </div>
              <div className="header-actions">
                <button className="btn btn-secondary" onClick={triggerOmnichannelSync}>
                  <RefreshCw size={15} />
                  <span>Sinxronlash (Sync Now)</span>
                </button>
                <button className="btn btn-primary" onClick={() => {
                  setActiveTab('pos');
                }}>
                  <ShoppingCart size={15} />
                  <span>Sotuv Terminaliga o'tish</span>
                </button>
              </div>
            </div>

            {/* KPI STATS */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div>
                  <div className="kpi-icon">
                    <Package size={20} />
                  </div>
                  <div className="kpi-info">
                    <span className="kpi-title">Jami Mahsulotlar</span>
                    <span className="kpi-value">{products.length} tur</span>
                  </div>
                </div>
                <div className="kpi-trend up">
                  <span>Biznes faol zaxirada</span>
                </div>
              </div>

              <div className="kpi-card warning">
                <div>
                  <div className="kpi-icon">
                    <AlertTriangle size={20} />
                  </div>
                  <div className="kpi-info">
                    <span className="kpi-title">Ogohlantirishlar</span>
                    <span className="kpi-value">{criticalAlerts.length} ta</span>
                  </div>
                </div>
                <div className="kpi-trend down">
                  <span>Muddati yaqin/Zaxira kam</span>
                </div>
              </div>

              <div className="kpi-card success">
                <div>
                  <div className="kpi-icon">
                    <RefreshCw size={20} />
                  </div>
                  <div className="kpi-info">
                    <span className="kpi-title">Kanallar holati</span>
                    <span className="kpi-value">Sinxron</span>
                  </div>
                </div>
                <div className="kpi-trend up">
                  <span>Barcha 3 kanal ulangan</span>
                </div>
              </div>

              <div className="kpi-card">
                <div>
                  <div className="kpi-icon" style={{ color: 'var(--color-info)', backgroundColor: 'var(--color-info-light)' }}>
                    <Sparkles size={20} />
                  </div>
                  <div className="kpi-info">
                    <span className="kpi-title">Sotiluvchi To'plamlar</span>
                    <span className="kpi-value">
                      {bundles.reduce((sum, b) => sum + (getBundleMaxQty(b) > 0 ? 1 : 0), 0)} ta
                    </span>
                  </div>
                </div>
                <div className="kpi-trend up" style={{ color: 'var(--color-info)' }}>
                  <span>Tarkibiy qismlari mavjud</span>
                </div>
              </div>
            </div>

            {/* DASHBOARD PANEL GRID */}
            <div className="dashboard-grid">
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <h3>Tezkor FEFO va Zaxira Ogohlantirishlari</h3>
                    <p>Yaroqlilik muddati yaqinlashayotgan va tugayotgan partiyalar nazorati (FEFO)</p>
                  </div>
                  <span className="badge badge-warning">{criticalAlerts.length} ta xabar</span>
                </div>
                <div className="panel-body">
                  <div className="alert-list">
                    {criticalAlerts.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                        <CheckCircle2 size={36} style={{ color: 'var(--color-success)', marginBottom: '0.75rem' }} />
                        <p>Barcha zaxira va yaroqlilik muddatlari mukammal holatda!</p>
                      </div>
                    ) : (
                      criticalAlerts.map(alert => (
                        <div key={alert.id} className={`alert-item ${alert.type}`}>
                          <div className="alert-icon-wrapper">
                            <AlertTriangle size={18} />
                          </div>
                          <div className="alert-content">
                            <span className="alert-item-title">{alert.title}</span>
                            <span className="alert-desc">{alert.desc}</span>
                            <span className="alert-time">{alert.time}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <h3>Oxirgi Harakatlar Jurnali</h3>
                    <p>Sotuvlar va ishlab chiqarish tarixi</p>
                  </div>
                  <Activity size={16} style={{ color: 'var(--color-text-muted)' }} />
                </div>
                <div className="panel-body" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '380px', overflowY: 'auto' }}>
                    {logs.map(log => (
                      <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem', fontSize: '0.8rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span className={`badge ${log.type === 'sale' ? 'badge-warning' : log.type === 'restock' ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                              {log.action}
                            </span>
                            <span style={{ color: 'var(--color-text-light)', fontSize: '0.7rem' }}>{log.time}</span>
                          </div>
                          <p style={{ marginTop: '0.2rem', color: 'var(--color-text-main)', fontSize: '0.8rem', fontWeight: 500 }}>{log.details}</p>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Kanal: {log.channel}</span>
                        </div>
                        <span style={{ fontWeight: 600, color: log.change > 0 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                          {log.change > 0 ? `+${log.change}` : log.change}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB: INVENTORY */}
        {/* ========================================================================= */}
        {activeTab === 'inventory' && (
          <>
            <div className="page-header">
              <div className="header-title">
                <h1>Zaxira boshqaruvi</h1>
                <p>Mahsulotlar, rang/variantlar, mavjud soni va yaroqlilik sanalarini kuzatish</p>
              </div>
              <div className="header-actions">
                <button className="btn btn-primary" onClick={() => {
                  setActiveModal('add-product');
                  setModalError('');
                }}>
                  <Plus size={15} />
                  <span>Yangi mahsulot qo'shish</span>
                </button>
              </div>
            </div>

            {/* SEARCH AND FILTERS */}
            <div className="search-filter-bar">
              <div className="search-input-wrapper">
                <Search size={16} className="search-icon-pos" />
                <input
                  type="text"
                  placeholder="Mahsulot nomi, brendi yoki rang/variant bo'yicha qidirish..."
                  className="search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                className="filter-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat === 'All' ? 'Barcha ruknlar' : cat}</option>
                ))}
              </select>
            </div>

            {/* INVENTORY TABLE */}
            <div className="panel">
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}></th>
                      <th>Mahsulot</th>
                      <th>Kategoriya</th>
                      <th>Omborda bor</th>
                      <th>Kam qolsa ogohlantirish</th>
                      <th>Rang/variantlar</th>
                      <th>Holat</th>
                      <th>Harakatlar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                          Mahsulot topilmadi.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map(p => {
                        const totalStock = getProductStock(p);
                        const isExpanded = expandedProduct === p.id;
                        const isLowStock = totalStock <= p.reorderLevel;

                        return (
                          <React.Fragment key={p.id}>
                            <tr>
                              <td>
                                <button
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-brand)' }}
                                  onClick={() => setExpandedProduct(isExpanded ? null : p.id)}
                                >
                                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </button>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  {p.image ? (
                                    <img
                                      src={p.image}
                                      alt={p.name}
                                      style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0, border: '1px solid var(--border-color)' }}
                                    />
                                  ) : (
                                    <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', flexShrink: 0 }} />
                                  )}
                                  <div>
                                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{p.brand}</span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="badge badge-secondary">{p.category}</span>
                              </td>
                              <td style={{ fontWeight: 600 }}>
                                <span style={{ color: isLowStock ? 'var(--color-warning)' : 'inherit' }}>
                                  {totalStock} dona
                                </span>
                              </td>
                              <td style={{ color: 'var(--color-text-muted)' }}>{p.reorderLevel} dona</td>
                              <td>{p.variants.length} variant</td>
                              <td>
                                {isLowStock ? (
                                  <span className="badge badge-warning">Kam qolgan</span>
                                ) : (
                                  <span className="badge badge-success">Mavjud</span>
                                )}
                              </td>
                              <td>
                                <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setExpandedProduct(isExpanded ? null : p.id)}>
                                  Zaxirani ko'rish
                                </button>
                                {currentUser && currentUser.role === 'admin' && (
                                  <button
                                    className="btn btn-danger"
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', marginLeft: '6px' }}
                                    onClick={() => handleDeleteProduct(p.id, p.name)}
                                  >
                                    <Trash2 size={12} />
                                    <span>O'chirish</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                            
                            {/* EXPANDED VARIANT DETAILS PANEL */}
                            {isExpanded && (
                              <tr>
                                <td colSpan="8" style={{ backgroundColor: 'var(--bg-primary)', padding: 0 }}>
                                  <div className="variants-box">
                                    <div className="variants-header">
                                      <span className="variants-title">{p.name} uchun zaxira tafsilotlari</span>
                                    </div>
                                    <div className="variant-grid">
                                      {p.variants.map(v => {
                                        const vStock = getVariantStock(v);
                                        const isVLow = vStock <= p.reorderLevel;

                                        return (
                                          <div key={v.id} className="variant-card">
                                            <div className="variant-top">
                                              <div className="color-swatch-cell">
                                                <div className="color-swatch" style={{ backgroundColor: v.colorCode }}></div>
                                                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{v.name}</div>
                                              </div>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '2px' }}>
                                              <span style={{ color: 'var(--color-text-muted)' }}>Sotish narxi:</span>
                                              <span style={{ fontWeight: 600 }}>{formatSum(v.price)}</span>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '2px' }}>
                                              <span style={{ color: 'var(--color-text-muted)' }}>Jami variant zaxira:</span>
                                              <span style={{ fontWeight: 700, color: isVLow ? 'var(--color-warning)' : 'var(--color-success)' }}>
                                                {vStock} dona
                                              </span>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '2px' }}>
                                              <span style={{ color: 'var(--color-text-muted)' }}>SKU:</span>
                                              <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{v.sku}</span>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginBottom: '4px' }}>
                                              <span style={{ color: 'var(--color-text-muted)' }}>Shtrix-kod:</span>
                                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ fontFamily: 'monospace', color: v.barcode ? 'var(--color-text-main)' : 'var(--color-text-light)' }}>
                                                  {v.barcode || 'Kiritilmagan'}
                                                </span>
                                                <button
                                                  type="button"
                                                  style={{ background: 'none', border: 'none', color: 'var(--color-brand)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                                  onClick={() => handleOpenEditBarcode(p.id, v.id, v.barcode)}
                                                  title="Shtrix-kodni tahrirlash"
                                                >
                                                  <Edit3 size={11} />
                                                </button>
                                              </span>
                                            </div>

                                            <div className="batch-list">
                                              <div style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', color: 'var(--color-text-main)', display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Kelgan zaxiralar</span>
                                                <button
                                                  style={{ background: 'none', border: 'none', color: 'var(--color-brand)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem' }}
                                                  onClick={() => {
                                                    setActiveModal('add-batch');
                                                    setModalInputs({
                                                      productId: p.id,
                                                      variantId: v.id,
                                                      productName: p.name,
                                                      variantName: v.name,
                                                      variantSku: v.sku,
                                                      qty: '',
                                                      expiryDate: '',
                                                      mfgDate: ''
                                                    });
                                                    setModalError('');
                                                  }}
                                                >
                                                  <Plus size={10} /> Zaxira qo'shish
                                                </button>
                                              </div>

                                              {v.batches && v.batches.length > 0 ? (
                                                [...v.batches]
                                                  .sort((a,b) => new Date(a.expiryDate) - new Date(b.expiryDate))
                                                  .map(b => {
                                                    const expInfo = checkBatchExpiryStatus(b.expiryDate);
                                                    return (
                                                      <div key={b.batchId} className="batch-row" style={{ opacity: b.qty === 0 ? 0.4 : 1 }}>
                                                        <span className="batch-lbl">{b.qty} dona</span>
                                                        <span className={`batch-date ${expInfo.class}`}>
                                                          Yaroqli: {b.expiryDate}
                                                        </span>
                                                      </div>
                                                    );
                                                  })
                                              ) : (
                                                <div style={{ color: 'var(--color-text-light)', fontSize: '0.7rem', padding: '0.25rem 0' }}>
                                                  Bu rang/variant uchun zaxira hali kiritilmagan.
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Omnichannel, Promotions, Production, Forecasting tabs removed */}
        {activeTab === '__DISABLED__' && (
          <>
            <div className="page-header">
              <div className="header-title">
                <h1>Omnichannel (Onlayn/Oflayn) Sinxronizatsiya</h1>
                <p>Internet-do'kon, jismoniy butik va ijtimoiy tarmoqlar zaxirasining real vaqtda sinxronizatsiyasi</p>
              </div>
              <div className="header-actions">
                <button className="btn btn-primary" onClick={triggerOmnichannelSync}>
                  <RefreshCw size={15} />
                  <span>Sinxronizatsiya sinash (Sync Now)</span>
                </button>
              </div>
            </div>

            {/* CHANNEL DISTRIBUTION STATS */}
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <h3>Sotuv kanallari bo'yicha zaxira taqsimoti</h3>
                  <p>Ombordagi jami tovarlarning joriy kanallardagi ulushi</p>
                </div>
              </div>
              <div className="panel-body">
                <div className="channel-bar-container">
                  <div className="channel-seg seg-boutique" style={{ width: '50%' }}>50%</div>
                  <div className="channel-seg seg-shopify" style={{ width: '40%' }}>40%</div>
                  <div className="channel-seg seg-instagram" style={{ width: '10%' }}>10%</div>
                </div>

                <div className="channel-legend">
                  <div className="legend-item">
                    <span className="legend-dot seg-boutique"></span>
                    <strong>Physical Boutique Shop</strong> (50% zaxira ajratilgan)
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot seg-shopify"></span>
                    <strong>Online Shopify Store</strong> (40% zaxira)
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot seg-instagram"></span>
                    <strong>Instagram DM Shop</strong> (10% zaxira)
                  </div>
                </div>
              </div>
            </div>

            {/* CHANNEL DETAILS & INTEGRATION STATUS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <h3>Ulanish va API holatlari</h3>
                    <p>Integratsiyalangan tashqi savdo kanallari ro'yxati</p>
                  </div>
                </div>
                <div className="panel-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                      <div>
                        <strong style={{ fontSize: '0.9rem' }}>Shopify Integration API</strong>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Status: Faol. Oxirgi sinx: 2 daqiqa oldin</p>
                      </div>
                      <span className="badge badge-success">API Online</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                      <div>
                        <strong style={{ fontSize: '0.9rem' }}>Physical POS terminal (Boutique)</strong>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Status: Bog'langan. Offline savdolar POS orqali sinxronlanadi.</p>
                      </div>
                      <span className="badge badge-success">POS Connected</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem' }}>
                      <div>
                        <strong style={{ fontSize: '0.9rem' }}>Instagram Messaging API</strong>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Status: Ulangan (Manual tasdiqlash rejimida).</p>
                      </div>
                      <span className="badge badge-info">Manual Sync</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <h3>Sinxronizatsiya jurnali</h3>
                    <p>Sotuv kanallaridan qayd etilgan tranzaksiyalar</p>
                  </div>
                </div>
                <div className="panel-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '250px', overflowY: 'auto' }}>
                    {logs.filter(l => l.channel !== 'System' && l.channel !== 'Central System').map(l => (
                      <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontSize: '0.8rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <strong style={{ color: 'var(--color-brand)' }}>{l.channel}</strong>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-light)' }}>{l.time}</span>
                          </div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-main)' }}>{l.details}</span>
                        </div>
                        <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>{l.change} dona</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'users' && currentUser && currentUser.role === 'admin' && (
          <>
            <div className="page-header" style={{ paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div className="header-title">
                <h1>Tizim Xodimlari & Sotuvchilar</h1>
                <p>Do'kon sotuvchilari (kassirlar) va admin profillarini boshqarish</p>
              </div>
              <div className="header-actions">
                <button type="button" className="btn btn-primary" onClick={() => setIsAddUserModalOpen(true)}>
                  <Plus size={15} />
                  <span>Yangi Xodim Qo'shish</span>
                </button>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <h3>Xodimlar ro'yxati</h3>
                  <p>Hozirda tizimda ro'yxatdan o'tgan barcha xodimlar va ularning rollari</p>
                </div>
              </div>
              <div className="panel-body" style={{ padding: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '10%' }}>Avatar</th>
                      <th style={{ width: '30%' }}>Ism (F.I.SH)</th>
                      <th style={{ width: '30%' }}>E-pochta (Login)</th>
                      <th style={{ width: '15%' }}>Roli</th>
                      <th style={{ width: '15%', textAlign: 'center' }}>Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: u.role === 'admin' ? 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' : 'var(--color-primary-light)',
                            color: u.role === 'admin' ? '#FFF' : 'var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '600',
                            fontSize: '0.9rem'
                          }}>
                            {u.name ? u.name.substring(0, 2).toUpperCase() : 'US'}
                          </div>
                        </td>
                        <td>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--color-text-main)' }}>{u.name}</strong>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{u.email}</span>
                        </td>
                        <td>
                          <span className={`badge ${u.role === 'admin' ? 'badge-danger' : 'badge-info'}`} style={{ textTransform: 'capitalize' }}>
                            {u.role === 'admin' ? 'Admin' : 'Sotuvchi'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {u.email !== currentUser.email && u.email.toLowerCase() !== 'turkglobalcenter@gmail.com' ? (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.5rem', borderColor: 'var(--color-danger-light)', background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444' }}
                              onClick={() => handleDeleteUser(u.id, u.email)}
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>Cheklangan</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'reports' && currentUser && (currentUser.role === 'admin' || currentUser.role === 'sotuvchi') && (() => {
          const repTransactions = activeTransactions.filter(t => {
            if (reportType === 'daily') {
              return t.date === reportDate;
            } else {
              return t.date >= reportStartDate && t.date <= reportEndDate;
            }
          });

          const repTotalSales = repTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
          const repTotalDiscount = repTransactions.reduce((sum, t) => sum + (t.discountAmount || 0), 0);
          const repTotalSubtotal = repTransactions.reduce((sum, t) => sum + (t.subtotal || 0), 0);
          const repCount = repTransactions.length;
          const repAverageBill = repCount > 0 ? repTotalSales / repCount : 0;
          const repTotalItems = repTransactions.reduce((sum, t) => sum + (t.items?.reduce((s, i) => s + (i.qty || 0), 0) || 0), 0);

          let repCash = 0;
          let repCard = 0;
          repTransactions.forEach(t => {
            if (t.paymentMethod?.includes('Naqd') || t.paymentMethod?.includes('Cash')) {
              repCash += t.totalAmount || 0;
            } else if (t.paymentMethod?.includes('Karta') || t.paymentMethod?.includes('Card')) {
              repCard += t.totalAmount || 0;
            } else if (t.mixPayDetails) {
              repCash += t.mixPayDetails.cash || 0;
              repCard += t.mixPayDetails.card || 0;
            } else {
              repCash += t.totalAmount || 0;
            }
          });

          const repProductMap = {};
          repTransactions.forEach(t => {
            t.items?.forEach(item => {
              const sku = item.sku;
              if (!sku) return;
              const qty = item.qty || 0;
              
              let price = item.price;
              let name = item.name;
              if (!price || price === 0) {
                for (const p of products) {
                  const variant = p.variants?.find(v => v.sku === sku);
                  if (variant) {
                    price = variant.price;
                    if (!name) name = p.name;
                    break;
                  }
                }
              }
              
              const total = (price || 0) * qty;

              if (!repProductMap[sku]) {
                repProductMap[sku] = {
                  sku,
                  name: name || item.name || sku,
                  qty: 0,
                  revenue: 0
                };
              }
              repProductMap[sku].qty += qty;
              repProductMap[sku].revenue += total;
            });
          });

          const repTopProducts = Object.values(repProductMap).sort((a, b) => b.qty - a.qty);

          const repSellerMap = {};
          repTransactions.forEach(t => {
            const seller = t.sellerName || "Noma'lum";
            if (!repSellerMap[seller]) {
              repSellerMap[seller] = {
                name: seller,
                total: 0,
                count: 0
              };
            }
            repSellerMap[seller].total += t.totalAmount || 0;
            repSellerMap[seller].count += 1;
          });
          const repSellers = Object.values(repSellerMap).sort((a, b) => b.total - a.total);

          return (
            <>
              <div className="page-header" style={{ paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                <div className="header-title">
                  <h1>Sotuvlar Hisoboti (Sales Reports)</h1>
                  <p>Do'konning kunlik va ma'lum sana oralig'idagi savdo ko'rsatkichlari tahlili</p>
                </div>
                <div className="header-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button type="button" className="btn btn-secondary" onClick={handlePrintReport}>
                    <Printer size={15} />
                    <span>Chop etish (PDF)</span>
                  </button>
                  <button type="button" className="btn" onClick={handleDownloadExcel} style={{ backgroundColor: 'var(--color-success)', color: '#fff', borderColor: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Download size={15} />
                    <span>Excelga yuklash</span>
                  </button>
                </div>
              </div>

              {/* Filter Panel */}
              <div className="panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.85rem',
                        background: reportType === 'daily' ? 'var(--color-brand)' : 'transparent',
                        color: reportType === 'daily' ? '#FFF' : 'var(--color-text-main)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                      onClick={() => setReportType('daily')}
                    >
                      Kunlik hisobot
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.85rem',
                        background: reportType === 'range' ? 'var(--color-brand)' : 'transparent',
                        color: reportType === 'range' ? '#FFF' : 'var(--color-text-main)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                      onClick={() => setReportType('range')}
                    >
                      Sana oralig'i
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    {reportType === 'daily' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>Sanani tanlang:</span>
                        <input
                          type="date"
                          className="form-control"
                          style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            fontSize: '0.9rem',
                          }}
                          value={reportDate}
                          onChange={(e) => setReportDate(e.target.value)}
                        />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>Boshlanish:</span>
                          <input
                            type="date"
                            className="form-control"
                            style={{
                              padding: '0.4rem 0.8rem',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border-color)',
                              fontSize: '0.9rem',
                            }}
                            value={reportStartDate}
                            onChange={(e) => setReportStartDate(e.target.value)}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>Tugash:</span>
                          <input
                            type="date"
                            className="form-control"
                            style={{
                              padding: '0.4rem 0.8rem',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border-color)',
                              fontSize: '0.9rem',
                            }}
                            value={reportEndDate}
                            onChange={(e) => setReportEndDate(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Print Area Wrapper */}
              <div id="printable-report-area">
                <div className="printable-report-header" style={{ display: 'none' }}>
                  <h1>Vidalita POS - Sotuvlar Hisoboti</h1>
                  <p className="subtitle">
                    {reportType === 'daily'
                      ? `Kunlik hisobot: ${reportDate}`
                      : `Sana oralig'idagi hisobot: ${reportStartDate} dan ${reportEndDate} gacha`}
                  </p>
                </div>

                {/* KPI STATS */}
                <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
                  <div className="kpi-card success">
                    <div>
                      <div className="kpi-icon">
                        <TrendingUp size={20} />
                      </div>
                      <div className="kpi-info">
                        <span className="kpi-title">Umumiy Tushum</span>
                        <span className="kpi-value">{formatSum(repTotalSales)}</span>
                      </div>
                    </div>
                    <div className="kpi-trend up">
                      <span>Chegirma: -{formatSum(repTotalDiscount)}</span>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <div>
                      <div className="kpi-icon" style={{ color: 'var(--color-brand)', backgroundColor: 'var(--color-brand-light)' }}>
                        <ShoppingCart size={20} />
                      </div>
                      <div className="kpi-info">
                        <span className="kpi-title">Fakturalar Soni</span>
                        <span className="kpi-value">{repCount} ta</span>
                      </div>
                    </div>
                    <div className="kpi-trend up">
                      <span>O'rtacha chek: {formatSum(repAverageBill)}</span>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <div>
                      <div className="kpi-icon" style={{ color: 'var(--color-info)', backgroundColor: 'var(--color-info-light)' }}>
                        <Package size={20} />
                      </div>
                      <div className="kpi-info">
                        <span className="kpi-title">Sotilgan Tovar/Hajm</span>
                        <span className="kpi-value">{repTotalItems} dona</span>
                      </div>
                    </div>
                    <div className="kpi-trend up">
                      <span>Barcha sotuvlar bo'yicha</span>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <div>
                      <div className="kpi-icon" style={{ color: 'var(--color-warning)', backgroundColor: 'var(--color-warning-light)' }}>
                        <Layers size={20} />
                      </div>
                      <div className="kpi-info">
                        <span className="kpi-title">Umumiy Qiymat (Subtotal)</span>
                        <span className="kpi-value">{formatSum(repTotalSubtotal)}</span>
                      </div>
                    </div>
                    <div className="kpi-trend down">
                      <span>Chegirmasiz jami</span>
                    </div>
                  </div>
                </div>

                {/* Analytics grid */}
                <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
                  {/* Payment Breakdown */}
                  <div className="panel">
                    <div className="panel-header">
                      <div className="panel-title">
                        <h3>To'lov usullari tahlili</h3>
                        <p>Kassa tushumlarining to'lov turlari bo'yicha taqsimoti</p>
                      </div>
                      <CreditCard size={16} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <div className="panel-body" style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Cash progress */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: 500, color: 'var(--color-text-main)' }}>Naqd pul (Cash)</span>
                            <span style={{ fontWeight: 600 }}>
                              {formatSum(repCash)} ({repTotalSales > 0 ? Math.round((repCash / repTotalSales) * 100) : 0}%)
                            </span>
                          </div>
                          <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${repTotalSales > 0 ? (repCash / repTotalSales) * 100 : 0}%`,
                              background: 'var(--color-success)',
                              borderRadius: '4px',
                              transition: 'width 0.4s ease'
                            }} />
                          </div>
                        </div>

                        {/* Card progress */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: 500, color: 'var(--color-text-main)' }}>Plastik karta (Card/Terminal)</span>
                            <span style={{ fontWeight: 600 }}>
                              {formatSum(repCard)} ({repTotalSales > 0 ? Math.round((repCard / repTotalSales) * 100) : 0}%)
                            </span>
                          </div>
                          <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${repTotalSales > 0 ? (repCard / repTotalSales) * 100 : 0}%`,
                              background: 'var(--color-info)',
                              borderRadius: '4px',
                              transition: 'width 0.4s ease'
                            }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seller/Cashier Breakdown */}
                  <div className="panel">
                    <div className="panel-header">
                      <div className="panel-title">
                        <h3>Sotuvchilar ulushi</h3>
                        <p>Kassirlar va xodimlarning savdo hajmi bo'yicha tahlili</p>
                      </div>
                      <Users size={16} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <div className="panel-body" style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '200px', overflowY: 'auto' }}>
                        {repSellers.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-light)' }}>
                            Sotuvchilar ma'lumotlari mavjud emas
                          </div>
                        ) : (
                          repSellers.map((s, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontSize: '0.85rem' }}>
                              <div>
                                <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{s.name}</span>
                                <span style={{ color: 'var(--color-text-muted)', marginLeft: '8px', fontSize: '0.75rem' }}>({s.count} ta faktura)</span>
                              </div>
                              <span style={{ fontWeight: 600, color: 'var(--color-brand)' }}>{formatSum(s.total)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Selling Products */}
                <div className="panel" style={{ marginBottom: '1.5rem' }}>
                  <div className="panel-header">
                    <div className="panel-title">
                      <h3>Eng ko'p sotilgan mahsulotlar</h3>
                      <p>Ushbu muddat ichida eng yuqori talabga ega bo'lgan tovarlar reytingi</p>
                    </div>
                    <TrendingUp size={16} style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                  <div className="panel-body" style={{ padding: '0' }}>
                    <div className="table-responsive">
                      <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Mahsulot Nomi</th>
                            <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>SKU (Kod)</th>
                            <th style={{ textAlign: 'right', padding: '0.75rem 1rem' }}>Sotilgan Soni</th>
                            <th style={{ textAlign: 'right', padding: '0.75rem 1rem' }}>Jami Tushum</th>
                          </tr>
                        </thead>
                        <tbody>
                          {repTopProducts.length === 0 ? (
                            <tr>
                              <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-light)' }}>
                                Mahsulot savdolari bo'yicha ma'lumotlar yo'q
                              </td>
                            </tr>
                          ) : (
                            repTopProducts.slice(0, 10).map((prod, idx) => (
                              <tr key={idx}>
                                <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{prod.name}</td>
                                <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)' }}>{prod.sku}</td>
                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600 }}>{prod.qty} dona</td>
                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>
                                  {formatSum(prod.revenue)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Transactions List */}
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-title">
                      <h3>Fakturalar ro'yxati</h3>
                      <p>Filtrlangan davrdagi barcha faol sotuvlar ro'yxati</p>
                    </div>
                    <FileText size={16} style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                  <div className="panel-body" style={{ padding: '0' }}>
                    <div className="table-responsive">
                      <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Faktura ID</th>
                            <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Sana & Vaqt</th>
                            <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Mijoz</th>
                            <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>To'lov Usuli</th>
                            <th style={{ textAlign: 'right', padding: '0.75rem 1rem' }}>Summa</th>
                            <th className="no-print" style={{ textAlign: 'center', padding: '0.75rem 1rem' }}>Amallar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {repTransactions.length === 0 ? (
                            <tr>
                              <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-light)' }}>
                                Filtrlangan muddatda hech qanday sotuv topilmadi.
                              </td>
                            </tr>
                          ) : (
                            repTransactions.map((t) => {
                              const hasEditedPrice = t.items && t.items.some(item => item.originalPrice !== undefined && item.originalPrice !== item.price);
                              return (
                                <tr key={t.id}>
                                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                                    {t.id}
                                    {hasEditedPrice && (
                                      <span className="badge badge-warning" style={{ marginLeft: '6px', fontSize: '0.65rem' }}>O'zgartirilgan narx</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem' }}>{t.date} {t.time}</td>
                                  <td style={{ padding: '0.75rem 1rem' }}>
                                    <div style={{ fontWeight: 500 }}>{t.customerName}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>{t.customerPhone}</div>
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem' }}>
                                    <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>{t.paymentMethod}</span>
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600 }}>{formatSum(t.totalAmount)}</td>
                                  <td className="no-print" style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                      onClick={() => setActivePOSInvoice(t)}
                                    >
                                      Ko'rish (Receipt)
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </>
          );
        })()}

      </main>

      {/* ========================================================================= */}
      {/* THERMAL INVOICE / FAKTURA PRINT PREVIEW MODAL */}
      {/* ========================================================================= */}
      {activePOSInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '430px' }}>
            <div className="modal-header">
              <h3>Faktura / Chek Checkout</h3>
              <button type="button" className="modal-close-btn" onClick={() => setActivePOSInvoice(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '0.5rem', backgroundColor: 'var(--bg-primary)' }}>
              <div className="receipt-wrapper">
                <div className="receipt-card" id="printable-pos-receipt">
                  <div className="receipt-header">
                    <h2>VIDALITA</h2>
                    <p>Termez, Burkhoniddin Marginoniy Street, 29G</p>
                    <p>Tel: +998 95 359 28 28</p>
                    <p>Email: nfo@turkglobalcenter.uz</p>
                  </div>

                  <div className="receipt-divider"></div>

                  <div className="receipt-meta-row">
                    <span>Faktura №:</span>
                    <strong style={{ fontWeight: 'bold' }}>{activePOSInvoice.id}</strong>
                  </div>
                  <div className="receipt-meta-row">
                    <span>Sana / Vaqt:</span>
                    <span>{activePOSInvoice.date} {activePOSInvoice.time}</span>
                  </div>
                  <div className="receipt-meta-row">
                    <span>Sotuvchi:</span>
                    <span>{activePOSInvoice.sellerName || (currentUser ? currentUser.name : "Adizova D. (POS)")}</span>
                  </div>
                  <div className="receipt-meta-row">
                    <span>Mijoz:</span>
                    <span>{activePOSInvoice.customerName}</span>
                  </div>
                  <div className="receipt-meta-row" style={{ borderBottom: '1px dashed #000', paddingBottom: '0.4rem' }}>
                    <span>Tel:</span>
                    <span>{activePOSInvoice.customerPhone}</span>
                  </div>

                  <table className="receipt-table">
                    <thead>
                      <tr>
                        <th style={{ width: '55%' }}>Mahsulot</th>
                        <th style={{ width: '15%', textAlign: 'center' }}>Soni</th>
                        <th style={{ width: '30%', textAlign: 'right' }}>Jami</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activePOSInvoice.items.map((item, idx) => {
                        const isPriceChanged = item.originalPrice !== undefined && item.originalPrice !== item.price;
                        return (
                          <tr key={idx}>
                            <td>
                              <div>{item.name.split(' - ')[0]}</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                                <span style={{ fontSize: '0.7rem', color: '#555' }}>
                                  Variant: {item.name.split(' - ')[1] || 'Oddiy'}
                                </span>
                                {isPriceChanged ? (
                                  <span style={{ fontSize: '0.68rem', color: '#D97706', fontWeight: 500 }}>
                                    Asl narxi: <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{formatSum(item.originalPrice)}</span> | Yangi: {formatSum(item.price)}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.68rem', color: '#777' }}>
                                    Narxi: {formatSum(item.price)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>{item.qty}</td>
                            <td style={{ textAlign: 'right' }}>{formatSum(item.price * item.qty)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="receipt-divider"></div>

                  <div className="receipt-total-section">
                    <div className="receipt-total-row">
                      <span>Oraliq jami (Subtotal):</span>
                      <span>{formatSum(activePOSInvoice.subtotal)}</span>
                    </div>
                    {activePOSInvoice.discountAmount > 0 && (
                      <div className="receipt-total-row">
                        <span>Chegirma {activePOSInvoice.discountPercent > 0 ? `(${activePOSInvoice.discountPercent}%)` : ''}:</span>
                        <span>-{formatSum(activePOSInvoice.discountAmount)}</span>
                      </div>
                    )}
                    <div className="receipt-total-row grand-total">
                      <span>TO'LANDI JAMI:</span>
                      <span>{formatSum(activePOSInvoice.totalAmount)}</span>
                    </div>
                  </div>

                  <div className="receipt-divider" style={{ borderTop: '1px dashed #000' }}></div>
                  <div className="receipt-meta-row" style={{ marginTop: '0.2rem' }}>
                    <span>To'lov turi:</span>
                    <strong style={{ fontWeight: 'bold' }}>{activePOSInvoice.paymentMethod}</strong>
                  </div>

                  <div className="receipt-footer">
                    <p>Xaridingiz uchun rahmat!</p>
                    <p>Kosmetika vositalari yaroqlilik muddatlarini doimo tekshiring.</p>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.65rem', fontFamily: 'sans-serif', color: 'var(--color-text-light)' }}>
                      Vidalita
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setActivePOSInvoice(null)}>Yopish</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  window.print();
                }}
              >
                <Printer size={14} />
                <span>Chop etish (Print)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OTHER BACK-COMPATIBLE MODALS */}
      {/* ========================================================================= */}

      {/* MODAL: ADD BATCH */}
      {activeModal === 'add-batch' && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={submitAddBatch}>
            <div className="modal-header">
              <h3>Zaxira qo'shish</h3>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="modal-body">
              {modalError && <div style={{ color: 'var(--color-warning)', marginBottom: '1rem', fontSize: '0.85rem', padding: '0.5rem', backgroundColor: 'var(--color-warning-light)', borderRadius: '4px' }}>{modalError}</div>}
              
              <div className="form-group">
                <label>Mahsulot</label>
                <input type="text" className="form-control" value={modalInputs.productName || ''} disabled />
              </div>

              <div className="form-group">
                <label>Rang yoki variant</label>
                <input type="text" className="form-control" value={modalInputs.variantName || ''} disabled />
              </div>

              <div className="form-group">
                <label>Nechta qo'shiladi?*</label>
                <input
                  type="number"
                  className="form-control"
                  required
                  min="1"
                  placeholder="Masalan: 35"
                  value={modalInputs.qty || ''}
                  onChange={(e) => setModalInputs(prev => ({ ...prev, qty: e.target.value }))}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Qachon kelgan?*</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={modalInputs.mfgDate || ''}
                    onChange={(e) => setModalInputs(prev => ({ ...prev, mfgDate: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Qachongacha yaroqli?*</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={modalInputs.expiryDate || ''}
                    onChange={(e) => setModalInputs(prev => ({ ...prev, expiryDate: e.target.value }))}
                  />
                </div>
              </div>

              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', lineHeight: 1.5 }}>
                Masalan, omborga shu mahsulotdan 20 dona yangi kelgan bo'lsa, miqdorni 20 qilib kiriting va yaroqlilik sanasini belgilang.
              </p>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>Bekor qilish</button>
              <button type="submit" className="btn btn-primary">Zaxiraga qo'shish</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CANCEL TRANSACTION */}
      {activeModal === 'cancel-transaction' && cancellingTrx && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={submitCancelTransaction} style={{ maxWidth: '500px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ color: '#EF4444' }}>Faktura № {cancellingTrx.id} ni bekor qilish</h3>
              <button type="button" className="modal-close-btn" onClick={() => { setActiveModal(null); setCancellingTrx(null); }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {modalError && (
                <div style={{ color: 'var(--color-warning)', padding: '0.6rem', backgroundColor: 'var(--color-warning-light)', borderRadius: '4px', fontSize: '0.85rem' }}>
                  {modalError}
                </div>
              )}

              <div style={{ backgroundColor: 'rgba(0,0,0,0.02)', padding: '0.85rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Mijoz:</span>
                  <span style={{ fontWeight: 600 }}>{cancellingTrx.customerName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Telefon:</span>
                  <span style={{ fontWeight: 600 }}>{cancellingTrx.customerPhone}</span>
                </div>

                <div style={{ fontWeight: 600, borderTop: '1px solid var(--color-border)', paddingTop: '8px', marginBottom: '6px' }}>
                  Sotilgan tovarlar tarkibi:
                </div>
                <div style={{ maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
                  {cancellingTrx.items.map((item, index) => (
                    <div key={`${item.sku}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem' }}>
                      <span>{item.name} x {item.qty}</span>
                      <span>{formatSum(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, borderTop: '1px solid var(--color-border)', paddingTop: '8px', marginTop: '8px', fontSize: '0.9rem', color: 'var(--color-text)' }}>
                  <span>Jami Qaytariladigan Summa:</span>
                  <span>{formatSum(cancellingTrx.totalAmount)}</span>
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Bekor qilish sababi (Izoh)*</label>
                <textarea
                  className="form-control"
                  required
                  placeholder="Masalan: Xato kiritilgan, Mijoz mahsulotni qaytardi, va hokazo..."
                  value={modalInputs.cancelReason || ''}
                  onChange={(e) => setModalInputs(prev => ({ ...prev, cancelReason: e.target.value }))}
                  style={{ minHeight: '90px', width: '100%', resize: 'vertical', padding: '8px' }}
                />
              </div>

              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', lineHeight: 1.4, margin: 0 }}>
                Diqqat: Faktura bekor qilinganda undagi tovarlar avtomatik tarzda zaxiraga (omborga) qaytariladi.
              </p>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setActiveModal(null); setCancellingTrx(null); }}>
                Ortga (Yopish)
              </button>
              <button type="submit" className="btn btn-danger" style={{ backgroundColor: '#EF4444', borderColor: '#EF4444', color: '#FFF' }}>
                Fakturani bekor qilish
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADD HISTORICAL SALE */}
      {activeModal === 'add-historical-sale' && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={submitHistoricalTransaction} style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3>Tarixiy Savdo Ma'lumotlarini Kiritish</h3>
              <button type="button" className="modal-close-btn" onClick={() => { setActiveModal(null); resetHistStates(); }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '75vh', overflowY: 'auto' }}>
              {modalError && (
                <div style={{ color: 'var(--color-warning)', padding: '0.5rem', backgroundColor: 'var(--color-warning-light)', borderRadius: '4px', fontSize: '0.85rem' }}>
                  {modalError}
                </div>
              )}

              {/* DATE & TIME */}
              <div className="form-row">
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>Sana (Date)*</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={histDate}
                    onChange={(e) => setHistDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>Vaqt (Time)*</label>
                  <input
                    type="time"
                    className="form-control"
                    required
                    value={histTime}
                    onChange={(e) => setHistTime(e.target.value)}
                  />
                </div>
              </div>

              {/* CUSTOMER */}
              <div className="form-row">
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>Mijoz Ismi</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Masalan: Nilufar"
                    value={histCustomerName}
                    onChange={(e) => setHistCustomerName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>Mijoz Telefoni</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="+998 90..."
                    value={histCustomerPhone}
                    onChange={(e) => setHistCustomerPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* PAYMENT METHOD */}
              <div className="form-group">
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>To'lov Usuli (Payment Method)</label>
                <div className="pay-methods-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                  {[
                    { id: 'Naqd (Cash)', title: 'Naqd (Cash)', Icon: Banknote },
                    { id: 'Karta (Card)', title: 'Karta (Card)', Icon: CreditCard },
                    { id: 'Click/Payme', title: 'Click/Payme', Icon: Smartphone },
                    { id: 'Aralash (Mix)', title: 'Aralash (Mix)', Icon: Layers }
                  ].map(method => (
                    <button
                      key={method.id}
                      type="button"
                      className={`pay-method-card ${histPaymentMethod === method.id ? 'active' : ''}`}
                      onClick={() => setHistPaymentMethod(method.id)}
                      style={{ padding: '0.4rem 0.15rem' }}
                    >
                      <method.Icon size={16} className="pay-method-icon" />
                      <span className="pay-method-title" style={{ fontSize: '0.68rem' }}>{method.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {histPaymentMethod === 'Aralash (Mix)' && (
                <div style={{ 
                  backgroundColor: 'rgba(0,0,0,0.02)', 
                  padding: '0.75rem', 
                  borderRadius: '6px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.5rem',
                  border: '1px dashed var(--color-border || rgba(0,0,0,0.1))'
                }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div className="form-group" style={{ margin: 0, flex: 1 }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 600 }}>Naqd summasi (Cash)</label>
                      <input
                        type="number"
                        min="0"
                        max={histTotalAmount}
                        className="form-control"
                        value={histMixCash}
                        onChange={(e) => handleHistMixCashChange(e.target.value)}
                        style={{ height: '32px', fontSize: '0.85rem', padding: '0.3rem 0.5rem' }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0, flex: 1 }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 600 }}>Karta summasi (Card)</label>
                      <input
                        type="number"
                        min="0"
                        max={histTotalAmount}
                        className="form-control"
                        value={histMixCard}
                        onChange={(e) => handleHistMixCardChange(e.target.value)}
                        style={{ height: '32px', fontSize: '0.85rem', padding: '0.3rem 0.5rem' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ADD ITEM SECTION */}
              <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.01)' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 600 }}>Mahsulot qo'shish (Add Item to Invoice)</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ margin: 0, flex: '2 1 200px' }}>
                    <label style={{ fontSize: '0.7rem' }}>Mahsulot va Variant*</label>
                    <select
                      className="form-control"
                      value={histSelectedSku}
                      onChange={(e) => setHistSelectedSku(e.target.value)}
                      style={{ height: '34px', fontSize: '0.8rem', padding: '0.2rem' }}
                    >
                      <option value="">-- Mahsulotni tanlang --</option>
                      {products.map(p => 
                        p.variants.map(v => (
                          <option key={v.sku} value={v.sku}>
                            {p.name} ({v.name}) - {formatSum(v.price)}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0, flex: '1 1 80px' }}>
                    <label style={{ fontSize: '0.7rem' }}>Sotilgan narx*</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      value={histSelectedPrice}
                      onChange={(e) => setHistSelectedPrice(e.target.value)}
                      style={{ height: '34px', fontSize: '0.8rem', padding: '0.3rem' }}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0, flex: '1 1 60px' }}>
                    <label style={{ fontSize: '0.7rem' }}>Soni*</label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      value={histSelectedQty}
                      onChange={(e) => setHistSelectedQty(e.target.value)}
                      style={{ height: '34px', fontSize: '0.8rem', padding: '0.3rem' }}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={addHistItem}
                    disabled={!histSelectedSku}
                    style={{ height: '34px', padding: '0 1rem' }}
                  >
                    Qo'shish
                  </button>
                </div>
              </div>

              {/* LIST OF ADDED ITEMS */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                <div style={{ 
                  padding: '0.5rem 0.75rem', 
                  backgroundColor: 'rgba(0,0,0,0.03)', 
                  fontSize: '0.8rem', 
                  fontWeight: 600, 
                  borderBottom: '1px solid var(--border-color)',
                  borderTopLeftRadius: '5px',
                  borderTopRightRadius: '5px'
                }}>
                  Invoice tovarlari ro'yxati
                </div>
                <div style={{ 
                  maxHeight: '180px', 
                  overflowY: 'scroll', 
                  paddingBottom: '8px',
                  borderBottomLeftRadius: '5px',
                  borderBottomRightRadius: '5px'
                }}>
                  {histItems.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                      Hozircha hech qanday mahsulot qo'shilmagan.
                    </div>
                  ) : (
                    <table className="custom-table" style={{ fontSize: '0.78rem' }}>
                      <thead>
                        <tr>
                          <th>Tovar nomi</th>
                          <th>Narx</th>
                          <th>Soni</th>
                          <th>Jami</th>
                          <th style={{ width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {histItems.map(item => (
                          <tr key={item.sku}>
                            <td>
                              <div>{item.name}</div>
                              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{item.sku}</span>
                            </td>
                            <td>{formatSum(item.price)}</td>
                            <td>{item.qty} dona</td>
                            <td style={{ fontWeight: 600 }}>{formatSum(item.price * item.qty)}</td>
                            <td>
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}
                                onClick={() => removeHistItem(item.sku)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* DISCOUNT AND GRAND TOTAL SUMMARY */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.01)' }}>
                
                {/* General Discount Inputs */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Umumiy chegirma (Total Discount):</span>
                  
                  {/* Toggle between % and sum */}
                  <div style={{ 
                    display: 'flex', 
                    borderRadius: '6px', 
                    overflow: 'hidden', 
                    border: '1px solid var(--border-color)', 
                    height: '28px',
                    boxSizing: 'border-box',
                    flex: 'none',
                    backgroundColor: 'rgba(0,0,0,0.02)'
                  }}>
                    <button
                      type="button"
                      onClick={() => handleHistDiscountTypeChange("percent")}
                      style={{
                        border: 'none',
                        borderRight: '1px solid var(--border-color)',
                        padding: '0 0.6rem',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        backgroundColor: histDiscountType === 'percent' ? 'var(--color-primary)' : 'transparent',
                        color: histDiscountType === 'percent' ? '#fff' : 'var(--color-text-muted)',
                        fontWeight: histDiscountType === 'percent' ? '600' : 'normal',
                        height: '100%',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHistDiscountTypeChange("amount")}
                      style={{
                        border: 'none',
                        padding: '0 0.6rem',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        backgroundColor: histDiscountType === 'amount' ? 'var(--color-primary)' : 'transparent',
                        color: histDiscountType === 'amount' ? '#fff' : 'var(--color-text-muted)',
                        fontWeight: histDiscountType === 'amount' ? '600' : 'normal',
                        height: '100%',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      so'm
                    </button>
                  </div>

                  {/* Discount Input */}
                  <input
                    type="text"
                    className="form-control"
                    placeholder={histDiscountType === 'percent' ? "10%" : "so'm"}
                    value={histDiscountValue}
                    onChange={(e) => handleHistDiscountChange(e.target.value)}
                    style={{
                      height: '28px',
                      boxSizing: 'border-box',
                      fontSize: '0.8rem',
                      padding: '0 0.5rem',
                      borderRadius: '6px',
                      width: '100px',
                      flex: 'none'
                    }}
                  />
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.4rem', paddingTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
                    <span>Orta jami (Subtotal):</span>
                    <span>{formatSum(histSubtotal)}</span>
                  </div>
                  {histDiscountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#EF4444' }}>
                      <span>Chegirma (Discount):</span>
                      <span>-{formatSum(histDiscountAmount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.9rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.3rem', marginTop: '0.2rem' }}>
                    <span>Umumiy Summa:</span>
                    <span style={{ color: 'var(--color-primary)' }}>{formatSum(histTotalAmount)}</span>
                  </div>
                </div>

              </div>

              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', lineHeight: 1.4, margin: 0 }}>
                * Tarixiy savdolarni kiritishda joriy ombordagi zaxiralar kamaytirilmaydi. Barcha tovarlar faqat faktura tarixiga va hisobotlarga qo'shiladi.
              </p>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setActiveModal(null); resetHistStates(); }}>
                Yopish
              </button>
              <button type="submit" className="btn btn-primary" disabled={histItems.length === 0}>
                Fakturani Saqlash
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADD PRODUCT */}
      {activeModal === 'add-product' && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={submitAddProduct} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Tizimga Yangi Mahsulot Kiritish</h3>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {modalError && <div style={{ color: 'var(--color-warning)', marginBottom: '1rem', fontSize: '0.85rem', padding: '0.5rem', backgroundColor: 'var(--color-warning-light)', borderRadius: '4px' }}>{modalError}</div>}

              <div className="form-row">
                <div className="form-group">
                  <label>Mahsulot Nomi*</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="Masalan: Golden Glow Highlighter"
                    value={modalInputs.name || ''}
                    onChange={(e) => setModalInputs(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Brend*</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="Vidalita"
                    value={modalInputs.brand || ''}
                    onChange={(e) => setModalInputs(prev => ({ ...prev, brand: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Kategoriya*</label>
                  <select
                    className="form-control"
                    required
                    value={modalInputs.category || ''}
                    onChange={(e) => setModalInputs(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="">Tanlang...</option>
                    <option value="Face">Face (Yuz)</option>
                    <option value="Lips">Lips (Lablar)</option>
                    <option value="Skincare">Skincare (Teri parvarishi)</option>
                    <option value="Sun Care">Sun Care (Quyoshdan himoya)</option>
                    <option value="Eyes">Eyes (Ko'zlar)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Mahsulot ichki kodi*</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="Masalan: FACE-001"
                    value={modalInputs.skuPrefix || ''}
                    onChange={(e) => setModalInputs(prev => ({ ...prev, skuPrefix: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Kam qolgan deb hisoblanadigan miqdor*</label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    value={modalInputs.reorderLevel || '10'}
                    onChange={(e) => setModalInputs(prev => ({ ...prev, reorderLevel: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Batafsil tasnif</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Tavsifi..."
                    value={modalInputs.desc || ''}
                    onChange={(e) => setModalInputs(prev => ({ ...prev, desc: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', margin: '1rem 0', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', color: 'var(--color-brand)' }}>BIRINCHI RANG / VARIANT</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Rang yoki variant nomi*</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="Gold Sparkle"
                      value={modalInputs.variantName || ''}
                      onChange={(e) => setModalInputs(prev => ({ ...prev, variantName: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Variant ichki kodi*</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="Masalan: FACE-001-GOLD"
                      value={modalInputs.variantSku || ''}
                      onChange={(e) => setModalInputs(prev => ({ ...prev, variantSku: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Narxi ($)*</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      required
                      placeholder="28.00"
                      value={modalInputs.variantPrice || ''}
                      onChange={(e) => setModalInputs(prev => ({ ...prev, variantPrice: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Variant Rangi (Rang kodi)</label>
                    <input
                      type="color"
                      className="form-control"
                      style={{ height: '38px', padding: '2px' }}
                      value={modalInputs.variantColor || '#E4C3AD'}
                      onChange={(e) => setModalInputs(prev => ({ ...prev, variantColor: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Shtrix-kod (Barcode / QR-kod)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Shtrix-kodni skanerlang yoki yozing..."
                      value={modalInputs.variantBarcode || ''}
                      onChange={(e) => setModalInputs(prev => ({ ...prev, variantBarcode: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>Bekor qilish</button>
              <button type="submit" className="btn btn-primary">Mahsulotni Yaratish</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EDIT BARCODE */}
      {activeModal === 'edit-barcode' && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={handleSaveBarcode} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Shtrix-kodni (Barcode) Tahrirlash</h3>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {modalError && <div style={{ color: 'var(--color-warning)', marginBottom: '1rem', fontSize: '0.85rem', padding: '0.5rem', backgroundColor: 'var(--color-warning-light)', borderRadius: '4px' }}>{modalError}</div>}

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>Mahsulot Shtrix-kodi (Barcode / QR)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Shtrix-kodni skanerlang yoki yozing..."
                  value={modalInputs.barcode || ''}
                  onChange={(e) => setModalInputs(prev => ({ ...prev, barcode: e.target.value }))}
                  required
                  autoFocus
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                  Shtrix-kod o'quvchi to'pponcha yordamida to'g'ridan-to'g'ri shu maydonga skanerlashingiz mumkin.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>Bekor qilish</button>
              <button type="submit" className="btn btn-primary">Saqlash</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EDIT TRANSACTION */}
      {activeModal === 'edit-transaction' && editingTrx && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={submitEditTransaction} style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3>Fakturani Tahrirlash (ID: {editingTrx.id})</h3>
              <button type="button" className="modal-close-btn" onClick={() => { setActiveModal(null); setEditingTrx(null); }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '75vh', overflowY: 'auto' }}>
              {modalError && (
                <div style={{ color: 'var(--color-warning)', padding: '0.5rem', backgroundColor: 'var(--color-warning-light)', borderRadius: '4px', fontSize: '0.85rem' }}>
                  {modalError}
                </div>
              )}

              {/* DATE & TIME */}
              <div className="form-row">
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>Sana (Date)*</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>Vaqt (Time)*</label>
                  <input
                    type="time"
                    className="form-control"
                    required
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                  />
                </div>
              </div>

              {/* CUSTOMER */}
              <div className="form-row">
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>Mijoz Ismi</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Masalan: Nilufar"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>Mijoz Telefoni</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="+998 90..."
                    value={editCustomerPhone}
                    onChange={(e) => setEditCustomerPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* PAYMENT METHOD */}
              <div className="form-group">
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>To'lov Usuli (Payment Method)</label>
                <div className="pay-methods-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                  {[
                    { id: 'Naqd (Cash)', title: 'Naqd (Cash)', Icon: Banknote },
                    { id: 'Karta (Card)', title: 'Karta (Card)', Icon: CreditCard },
                    { id: 'Click/Payme', title: 'Click/Payme', Icon: Smartphone },
                    { id: 'Aralash (Mix)', title: 'Aralash (Mix)', Icon: Layers }
                  ].map(method => (
                    <button
                      key={method.id}
                      type="button"
                      className={`pay-method-card ${editPaymentMethod === method.id ? 'active' : ''}`}
                      onClick={() => setEditPaymentMethod(method.id)}
                      style={{ padding: '0.4rem 0.15rem' }}
                    >
                      <method.Icon size={16} className="pay-method-icon" />
                      <span className="pay-method-title" style={{ fontSize: '0.68rem' }}>{method.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {editPaymentMethod === 'Aralash (Mix)' && (
                <div style={{ 
                  backgroundColor: 'rgba(0,0,0,0.02)', 
                  padding: '0.75rem', 
                  borderRadius: '6px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.5rem',
                  border: '1px dashed var(--color-border)'
                }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-main)' }}>Naqd (Cash) Summa</label>
                      <input
                        type="number"
                        step="any"
                        className="form-control"
                        value={editMixCash}
                        onChange={(e) => handleEditMixCashChange(e.target.value)}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-main)' }}>Karta (Card) Summa</label>
                      <input
                        type="number"
                        step="any"
                        className="form-control"
                        value={editMixCard}
                        onChange={(e) => handleEditMixCardChange(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>
                    Faktura umumiy summasi: {formatSum(editingTrx.totalAmount)}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setActiveModal(null); setEditingTrx(null); }}>
                Bekor qilish
              </button>
              <button type="submit" className="btn btn-primary">
                Saqlash
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: YANGI XODIM QO'SHISH */}
      {isAddUserModalOpen && currentUser && currentUser.role === 'admin' && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Yangi Xodim / Sotuvchi Qo'shish</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsAddUserModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500 }}>Xodim Ismi*</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="Masalan: Sardor Aliyev"
                      value={userForm.name}
                      onChange={e => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500 }}>E-pochta manzili (Logini)*</label>
                    <input
                      type="email"
                      className="form-control"
                      required
                      placeholder="masalan: sardor@vidalita.uz"
                      value={userForm.email}
                      onChange={e => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500 }}>Parol*</label>
                    <input
                      type="password"
                      className="form-control"
                      required
                      placeholder="••••••••"
                      value={userForm.password}
                      onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500 }}>Lavozimi (Roli)*</label>
                    <select
                      className="form-control"
                      required
                      value={userForm.role}
                      onChange={e => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    >
                      <option value="sotuvchi">Sotuvchi (Cashier)</option>
                      <option value="admin">Admin (Full Access)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddUserModalOpen(false)}>Bekor qilish</button>
                <button type="submit" className="btn btn-primary">Xodimni Yaratish</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CAMERA QR SCANNER */}
      {isCameraScannerOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '480px', width: '100%' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode size={20} style={{ color: 'var(--color-brand)' }} />
                <span>Kamera orqali QR/Barcode Skanerlash</span>
              </h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsCameraScannerOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                Mahsulot QR-kodini yoki shtrix-kodini kamera oldida ko'rsating.
              </p>
              
              <div 
                id="qr-reader" 
                style={{ 
                  width: '100%', 
                  maxWidth: '350px', 
                  margin: '0 auto', 
                  borderRadius: '12px', 
                  overflow: 'hidden',
                  border: '2px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              ></div>
              
              <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                Ruxsat berilgandan so'ng kamera tasviri paydo bo'ladi.
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setIsCameraScannerOpen(false)}
                style={{ width: '100%' }}
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM TOAST NOTIFICATIONS */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast-alert ${toast.type}`}>
            {toast.type === 'success' && <CheckCircle2 style={{ color: 'var(--color-success)', flexShrink: 0 }} size={20} />}
            {toast.type === 'warning' && <AlertTriangle style={{ color: 'var(--color-warning)', flexShrink: 0 }} size={20} />}
            {toast.type === 'info' && <Info style={{ color: 'var(--color-info)', flexShrink: 0 }} size={20} />}
            <div>
              <span className="toast-alert-title">{toast.title}</span>
              <span className="toast-alert-desc">{toast.desc}</span>
            </div>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-light)', marginLeft: 'auto', paddingLeft: '0.5rem' }}
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
