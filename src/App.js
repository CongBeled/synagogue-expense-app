import React, { useState, useRef, useEffect } from 'react';
import { Calendar, DollarSign, User, Settings, Plus, Trash2, Edit3, Check, X, Snowflake, Sun, Flower, Leaf } from 'lucide-react';
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  onSnapshot,
  query,
  orderBy 
} from 'firebase/firestore';

const SynagogueExpenseApp = () => {
  const [currentView, setCurrentView] = useState('member');
  const [selectedYear, setSelectedYear] = useState(5785);
  const [expenses, setExpenses] = useState([]);
  const [sponsorships, setSponsorships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newExpense, setNewExpense] = useState({ 
    name: '', 
    amount: '', 
    description: '', 
    isFlexible: false,
    hasSpecialMonths: false,
    seasonalAmounts: { winter: '', spring: '', summer: '', fall: '' },
    specialMonths: [],
    monthlyAmounts: {}
  });
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingValues, setEditingValues] = useState({ 
    name: '', 
    amount: '', 
    description: '',
    isFlexible: false,
    hasSpecialMonths: false,
    seasonalAmounts: { winter: '', spring: '', summer: '', fall: '' },
    specialMonths: [],
    monthlyAmounts: {}
  });
  const [memberInfo, setMemberInfo] = useState({ 
    name: '', email: '', phone: '', dedication: '', message: '', recurring: true, amount: '',
    cardNumber: '', expiryDate: '', cvv: '', cardholderName: '', billingAddress: '', 
    billingCity: '', billingState: '', billingZip: '', cardType: '', savePayment: false
  });
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showSponsorForm, setShowSponsorForm] = useState(false);
  const [selectedSponsorship, setSelectedSponsorship] = useState({ expenseId: null, month: null });
  const [newlyAddedExpenseId, setNewlyAddedExpenseId] = useState(null);
  const expenseRefs = useRef({});

  const months = [
    'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar',
    'Nissan', 'Iyar', 'Sivan', 'Tammuz', 'Av', 'Elul'
  ];

  const seasonalIcons = {
    winter: Snowflake,
    spring: Flower,
    summer: Sun,
    fall: Leaf
  };

  // Load data from Firebase on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load expenses
        const expensesQuery = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'));
        const expensesSnapshot = await getDocs(expensesQuery);
        const expensesData = expensesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Set default expenses if none exist
        if (expensesData.length === 0) {
          const defaultExpenses = [
            { 
              name: 'Mortgage Payment', 
              amount: 1500, 
              description: 'Monthly mortgage payment\nFor full or partial sponsorship click the month and enter the amount of your choosing', 
              isHighPriority: true,
              order: 1
            },
            { 
              name: 'Electricity', 
              amount: 350, 
              description: 'Monthly electric bill',
              order: 2,
              isFlexible: true,
              seasonalAmounts: {
                winter: 450,
                spring: 300,
                summer: 400,
                fall: 280
              }
            },
            { 
              name: 'Cleaning Services', 
              amount: 400, 
              description: 'Professional cleaning twice weekly',
              order: 3,
              hasSpecialMonths: true,
              specialMonths: [0, 6],
              monthlyAmounts: {
                0: 600,
                6: 550
              }
            },
            { name: 'Coffee & Kitchen Supplies', amount: 150, description: 'Coffee, tea, and kitchen essentials', order: 4 },
            { name: 'Security System', amount: 200, description: 'Monthly security monitoring', order: 5 },
            { name: 'Landscaping', amount: 300, description: 'Grounds maintenance and landscaping', order: 6 },
            { 
              name: 'Gas', 
              amount: 200, 
              description: 'Monthly gas utility bill',
              order: 7,
              isFlexible: true,
              seasonalAmounts: {
                winter: 300,
                spring: 150,
                summer: 120,
                fall: 180
              }
            }
          ];
          
          for (const expense of defaultExpenses) {
            await addDoc(collection(db, 'expenses'), {
              ...expense,
              createdAt: new Date()
            });
          }
          
          // Reload expenses after adding defaults
          const newSnapshot = await getDocs(expensesQuery);
          const newExpensesData = newSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setExpenses(sortExpenses(newExpensesData));
        } else {
          setExpenses(sortExpenses(expensesData));
        }

        // Load sponsorships
        const sponsorshipsSnapshot = await getDocs(collection(db, 'sponsorships'));
        const sponsorshipsData = sponsorshipsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSponsorships(sponsorshipsData);
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to default data if Firebase fails
        const fallbackExpenses = [
          { id: '1', name: 'Mortgage Payment', amount: 1500, description: 'Monthly mortgage payment', isHighPriority: true, order: 1 },
          { id: '2', name: 'Electricity', amount: 350, description: 'Monthly electric bill', order: 2 },
          { id: '3', name: 'Cleaning Services', amount: 400, description: 'Professional cleaning twice weekly', order: 3 },
          { id: '4', name: 'Coffee & Kitchen Supplies', amount: 150, description: 'Coffee, tea, and kitchen essentials', order: 4 },
          { id: '5', name: 'Security System', amount: 200, description: 'Monthly security monitoring', order: 5 },
          { id: '6', name: 'Landscaping', amount: 300, description: 'Grounds maintenance and landscaping', order: 6 },
          { id: '7', name: 'Gas', amount: 200, description: 'Monthly gas utility bill', order: 7 }
        ];
        setExpenses(sortExpenses(fallbackExpenses));
        setSponsorships([]);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Real-time listener for sponsorships
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'sponsorships'), (snapshot) => {
      const sponsorshipsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSponsorships(sponsorshipsData);
    });

    return () => unsubscribe();
  }, []);

  const sortExpenses = (expenseList) => {
    return [...expenseList].sort((a, b) => {
      // Mortgage Payment always first
      if (a.name === 'Mortgage Payment') return -1;
      if (b.name === 'Mortgage Payment') return 1;
      
      // If both have order numbers, sort by order
      if (a.order && b.order) return a.order - b.order;
      
      // If only one has order, prioritize it
      if (a.order && !b.order) return -1;
      if (!a.order && b.order) return 1;
      
      // For new expenses without order, sort by creation date (newest last)
      if (a.createdAt && b.createdAt) {
        return new Date(a.createdAt.seconds || a.createdAt) - new Date(b.createdAt.seconds || b.createdAt);
      }
      
      // Fallback to alphabetical
      return a.name.localeCompare(b.name);
    });
  };

  const getCurrentHebrewMonth = () => {
    return 8; // Sivan for June 2025
  };

  const getCurrentMonthTotals = () => {
    const currentMonth = getCurrentHebrewMonth();
    let totalExpenseForMonth = 0;
    let totalSponsoredForMonth = 0;
    
    expenses.forEach(expense => {
      const monthExpenseAmount = getExpenseAmountForMonth(expense, currentMonth);
      const monthProgress = getMonthProgress(expense, currentMonth);
      
      totalExpenseForMonth += monthExpenseAmount;
      totalSponsoredForMonth += monthProgress.total;
    });
    
    const percentage = totalExpenseForMonth > 0 ? (totalSponsoredForMonth / totalExpenseForMonth) * 100 : 0;
    
    return {
      currentMonthName: months[currentMonth],
      totalExpenseForMonth,
      totalSponsoredForMonth,
      remainingForMonth: Math.max(totalExpenseForMonth - totalSponsoredForMonth, 0),
      percentage: Math.min(percentage, 100)
    };
  };

  const getCardType = (number) => {
    const cleaned = number.replace(/\s/g, '');
    if (/^4/.test(cleaned)) return 'visa';
    if (/^5[1-5]/.test(cleaned)) return 'mastercard';
    if (/^3[47]/.test(cleaned)) return 'amex';
    if (/^6(?:011|5)/.test(cleaned)) return 'discover';
    return '';
  };

  const validateCardNumber = (number, type) => {
    const cleaned = number.replace(/\s/g, '');
    switch (type) {
      case 'visa':
        return /^4\d{15}$/.test(cleaned);
      case 'mastercard':
        return /^5[1-5]\d{14}$/.test(cleaned);
      case 'amex':
        return /^3[47]\d{13}$/.test(cleaned);
      case 'discover':
        return /^6(?:011|5\d{2})\d{12}$/.test(cleaned);
      default:
        return false;
    }
  };

  const formatCardNumber = (value, type) => {
    const cleaned = value.replace(/\s/g, '').replace(/\D/g, '');
    if (type === 'amex') {
      return cleaned.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3').substr(0, 17);
    } else {
      return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ').substr(0, 19);
    }
  };

  const getSeasonForMonth = (monthIndex) => {
    if (monthIndex >= 0 && monthIndex <= 2) return 'fall';
    if (monthIndex >= 3 && monthIndex <= 5) return 'winter';
    if (monthIndex >= 6 && monthIndex <= 8) return 'spring';
    return 'summer';
  };

  const getExpenseAmountForMonth = (expense, monthIndex) => {
    if (expense.monthlyAmounts && expense.monthlyAmounts[monthIndex]) {
      return expense.monthlyAmounts[monthIndex];
    }
    
    if (expense.isFlexible && expense.seasonalAmounts) {
      const season = getSeasonForMonth(monthIndex);
      return expense.seasonalAmounts[season] || expense.amount;
    }
    
    return expense.amount;
  };

  const getSponsor = (expenseId, monthIndex) => {
    return sponsorships.filter(s => 
      s.expenseId === expenseId && 
      s.month === monthIndex && 
      s.year === selectedYear
    );
  };

  const getMonthTotal = (expenseId, monthIndex) => {
    const sponsors = getSponsor(expenseId, monthIndex);
    return sponsors.reduce((total, sponsor) => total + sponsor.amount, 0);
  };

  const getMonthProgress = (expense, monthIndex) => {
    const total = getMonthTotal(expense.id, monthIndex);
    const expenseAmount = getExpenseAmountForMonth(expense, monthIndex);
    const percentage = Math.min((total / expenseAmount) * 100, 100);
    return { total, percentage, remaining: Math.max(expenseAmount - total, 0), expenseAmount };
  };

  const getMonthIcon = (expense, monthIndex) => {
    if (expense.hasSpecialMonths && expense.specialMonths && expense.specialMonths.includes(monthIndex)) {
      return <span className="text-orange-600 font-bold text-xs">$YT</span>;
    }
    
    if (expense.isFlexible) {
      const season = getSeasonForMonth(monthIndex);
      const IconComponent = seasonalIcons[season];
      return <IconComponent size={12} />;
    }
    
    return null;
  };

  const addExpense = async () => {
    if (newExpense.name && newExpense.amount && parseFloat(newExpense.amount) > 0) {
      try {
        // Get the highest order number and add 1 for new expenses
        const maxOrder = Math.max(...expenses.map(e => e.order || 0), 7);
        
        const expenseData = {
          name: newExpense.name.trim(),
          amount: parseFloat(newExpense.amount),
          description: newExpense.description.trim(),
          order: maxOrder + 1,
          createdAt: new Date()
        };

        // Add seasonal amounts if flexible
        if (newExpense.isFlexible) {
          expenseData.isFlexible = true;
          expenseData.seasonalAmounts = {
            winter: parseFloat(newExpense.seasonalAmounts.winter) || parseFloat(newExpense.amount),
            spring: parseFloat(newExpense.seasonalAmounts.spring) || parseFloat(newExpense.amount),
            summer: parseFloat(newExpense.seasonalAmounts.summer) || parseFloat(newExpense.amount),
            fall: parseFloat(newExpense.seasonalAmounts.fall) || parseFloat(newExpense.amount)
          };
        }

        // Add special months if applicable
        if (newExpense.hasSpecialMonths && newExpense.specialMonths.length > 0) {
          expenseData.hasSpecialMonths = true;
          expenseData.specialMonths = newExpense.specialMonths;
          expenseData.monthlyAmounts = {};
          newExpense.specialMonths.forEach(monthIndex => {
            if (newExpense.monthlyAmounts[monthIndex]) {
              expenseData.monthlyAmounts[monthIndex] = parseFloat(newExpense.monthlyAmounts[monthIndex]);
            }
          });
        }
        
        const docRef = await addDoc(collection(db, 'expenses'), expenseData);
        
        const newExpenseObj = {
          id: docRef.id,
          ...expenseData
        };
        
        setExpenses(prev => sortExpenses([...prev, newExpenseObj]));
        setNewExpense({ 
          name: '', 
          amount: '', 
          description: '', 
          isFlexible: false,
          hasSpecialMonths: false,
          seasonalAmounts: { winter: '', spring: '', summer: '', fall: '' },
          specialMonths: [],
          monthlyAmounts: {}
        });
        setNewlyAddedExpenseId(docRef.id);
      } catch (error) {
        console.error('Error adding expense:', error);
        alert('Failed to add expense. Please try again.');
      }
    }
  };

  const deleteExpense = async (id) => {
    try {
      await deleteDoc(doc(db, 'expenses', id));
      setExpenses(prev => sortExpenses(prev.filter(exp => exp.id !== id)));
      
      // Remove associated sponsorships
      const relatedSponsorships = sponsorships.filter(s => s.expenseId === id);
      for (const sponsorship of relatedSponsorships) {
        await deleteDoc(doc(db, 'sponsorships', sponsorship.id));
      }
      
      if (newlyAddedExpenseId === id) {
        setNewlyAddedExpenseId(null);
      }
      
      if (expenseRefs.current[id]) {
        delete expenseRefs.current[id];
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense. Please try again.');
    }
  };

  const updateExpense = async (id, updatedExpense) => {
    try {
      const updateData = {
        name: updatedExpense.name,
        amount: parseFloat(updatedExpense.amount),
        description: updatedExpense.description
      };

      // Handle flexible expenses
      if (updatedExpense.isFlexible) {
        updateData.isFlexible = true;
        updateData.seasonalAmounts = {
          winter: parseFloat(updatedExpense.seasonalAmounts.winter) || parseFloat(updatedExpense.amount),
          spring: parseFloat(updatedExpense.seasonalAmounts.spring) || parseFloat(updatedExpense.amount),
          summer: parseFloat(updatedExpense.seasonalAmounts.summer) || parseFloat(updatedExpense.amount),
          fall: parseFloat(updatedExpense.seasonalAmounts.fall) || parseFloat(updatedExpense.amount)
        };
      } else {
        updateData.isFlexible = false;
        // Remove seasonal amounts if no longer flexible
        updateData.seasonalAmounts = null;
      }

      // Handle special months
      if (updatedExpense.hasSpecialMonths && updatedExpense.specialMonths.length > 0) {
        updateData.hasSpecialMonths = true;
        updateData.specialMonths = updatedExpense.specialMonths;
        updateData.monthlyAmounts = {};
        updatedExpense.specialMonths.forEach(monthIndex => {
          if (updatedExpense.monthlyAmounts[monthIndex]) {
            updateData.monthlyAmounts[monthIndex] = parseFloat(updatedExpense.monthlyAmounts[monthIndex]);
          }
        });
      } else {
        updateData.hasSpecialMonths = false;
        updateData.specialMonths = [];
        updateData.monthlyAmounts = {};
      }
      
      await updateDoc(doc(db, 'expenses', id), updateData);
      
      setExpenses(prev => sortExpenses(prev.map(exp => 
        exp.id === id ? { ...exp, ...updateData } : exp
      )));
      setEditingExpense(null);
      setEditingValues({ 
        name: '', 
        amount: '', 
        description: '',
        isFlexible: false,
        hasSpecialMonths: false,
        seasonalAmounts: { winter: '', spring: '', summer: '', fall: '' },
        specialMonths: [],
        monthlyAmounts: {}
      });
    } catch (error) {
      console.error('Error updating expense:', error);
      alert('Failed to update expense. Please try again.');
    }
  };

  const startEditing = (expense) => {
    setEditingExpense(expense.id);
    setEditingValues({
      name: expense.name,
      amount: expense.amount.toString(),
      description: expense.description,
      isFlexible: expense.isFlexible || false,
      hasSpecialMonths: expense.hasSpecialMonths || false,
      seasonalAmounts: {
        winter: expense.seasonalAmounts?.winter?.toString() || '',
        spring: expense.seasonalAmounts?.spring?.toString() || '',
        summer: expense.seasonalAmounts?.summer?.toString() || '',
        fall: expense.seasonalAmounts?.fall?.toString() || ''
      },
      specialMonths: expense.specialMonths || [],
      monthlyAmounts: expense.monthlyAmounts || {}
    });
  };

  const cancelEditing = () => {
    setEditingExpense(null);
    setEditingValues({ 
      name: '', 
      amount: '', 
      description: '',
      isFlexible: false,
      hasSpecialMonths: false,
      seasonalAmounts: { winter: '', spring: '', summer: '', fall: '' },
      specialMonths: [],
      monthlyAmounts: {}
    });
  };

  const sponsorExpense = async () => {
    if (memberInfo.name?.trim() && selectedSponsorship.expenseId && selectedSponsorship.month !== null && memberInfo.amount) {
      const sponsorAmount = parseFloat(memberInfo.amount);
      
      if (sponsorAmount <= 0) return;
      
      try {
        const expense = expenses.find(e => e.id === selectedSponsorship.expenseId);
        const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const transaction = {
          id: transactionId,
          date: new Date().toISOString(),
          memberName: memberInfo.name.trim(),
          memberEmail: memberInfo.email?.trim() || '',
          memberPhone: memberInfo.phone?.trim() || '',
          amount: sponsorAmount,
          expenseName: expense.name,
          monthName: months[selectedSponsorship.month],
          year: selectedYear,
          dedication: memberInfo.dedication?.trim() || '',
          message: memberInfo.message?.trim() || '',
          recurring: memberInfo.recurring,
          cardType: memberInfo.cardType,
          lastFourDigits: memberInfo.cardNumber.replace(/\s/g, '').slice(-4)
        };
        
        setLastTransaction(transaction);
        
        if (memberInfo.recurring) {
          // Add sponsorship for multiple years
          for (const year of [5784, 5785, 5786, 5787, 5788]) {
            await addDoc(collection(db, 'sponsorships'), {
              expenseId: selectedSponsorship.expenseId,
              memberName: memberInfo.name.trim(),
              memberEmail: memberInfo.email?.trim() || '',
              memberPhone: memberInfo.phone?.trim() || '',
              month: selectedSponsorship.month,
              year: year,
              amount: sponsorAmount,
              recurring: true,
              dedication: memberInfo.dedication?.trim() || '',
              message: memberInfo.message?.trim() || '',
              createdAt: new Date()
            });
          }
        } else {
          // Add sponsorship for selected year only
          await addDoc(collection(db, 'sponsorships'), {
            expenseId: selectedSponsorship.expenseId,
            memberName: memberInfo.name.trim(),
            memberEmail: memberInfo.email?.trim() || '',
            memberPhone: memberInfo.phone?.trim() || '',
            month: selectedSponsorship.month,
            year: selectedYear,
            amount: sponsorAmount,
            recurring: false,
            dedication: memberInfo.dedication?.trim() || '',
            message: memberInfo.message?.trim() || '',
            createdAt: new Date()
          });
        }
        
        setShowSponsorForm(false);
        setShowPaymentConfirmation(true);
        setSelectedSponsorship({ expenseId: null, month: null });
        
        setMemberInfo({ 
          name: '', email: '', phone: '', dedication: '', message: '', recurring: true, amount: '',
          cardNumber: '', expiryDate: '', cvv: '', cardholderName: '', billingAddress: '', 
          billingCity: '', billingState: '', billingZip: '', cardType: '', savePayment: false
        });
      } catch (error) {
        console.error('Error adding sponsorship:', error);
        alert('Failed to submit sponsorship. Please try again.');
      }
    }
  };

  const removeSponsor = async (sponsorshipId) => {
    try {
      await deleteDoc(doc(db, 'sponsorships', sponsorshipId));
    } catch (error) {
      console.error('Error removing sponsorship:', error);
      alert('Failed to remove sponsorship. Please try again.');
    }
  };

  const getTotalAnnualExpenses = () => {
    return expenses.reduce((total, expense) => {
      const yearTotal = months.reduce((yearSum, month, index) => {
        const monthAmount = getExpenseAmountForMonth(expense, index);
        return yearSum + monthAmount;
      }, 0);
      return total + yearTotal;
    }, 0);
  };

  const getTotalSponsored = () => {
    return sponsorships
      .filter(s => s.year === selectedYear)
      .reduce((total, sponsorship) => total + sponsorship.amount, 0);
  };

  useEffect(() => {
    if (newlyAddedExpenseId && expenseRefs.current[newlyAddedExpenseId]) {
      const timeoutId = setTimeout(() => {
        const element = expenseRefs.current[newlyAddedExpenseId];
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
        const clearId = setTimeout(() => setNewlyAddedExpenseId(null), 1000);
        return () => clearTimeout(clearId);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [newlyAddedExpenseId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sponsorship data...</p>
        </div>
      </div>
    );
  }

  const currentMonthData = getCurrentMonthTotals();
  const isFullySponsored = currentMonthData.percentage >= 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="text-blue-600" size={28} />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Beled Expense Sponsorship</h1>
                <p className="text-gray-600 text-sm">Support our shul, month by month</p>
              </div>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setCurrentView('member')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm ${
                  currentView === 'member' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <User size={16} /> Member
              </button>
              <button
                onClick={() => setCurrentView('admin')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm ${
                  currentView === 'admin' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Settings size={16} /> Admin
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {currentView === 'member' ? (
          <div className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
              <h2 className="text-xl font-bold text-blue-800 mb-2">Welcome to Our Sponsorship Program</h2>
              <p className="text-blue-700">
                Help support our shul by sponsoring monthly expenses. Choose any available month for any expense category.
              </p>
            </div>

            <div className="bg-white border rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-3">
                Progress this Month - {currentMonthData.currentMonthName} {selectedYear}
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Total Monthly Expenses:</span>
                  <span className="font-bold text-gray-800">${currentMonthData.totalExpenseForMonth.toLocaleString()}</span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div 
                    className={`h-4 rounded-full transition-all duration-500 ${
                      isFullySponsored ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${currentMonthData.percentage}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-sm">
                    <div className={`font-bold ${isFullySponsored ? 'text-green-600' : 'text-blue-600'}`}>
                      ${currentMonthData.totalSponsoredForMonth.toLocaleString()} sponsored
                    </div>
                    {currentMonthData.totalSponsoredForMonth > 0 && !isFullySponsored && (
                      <div className="text-black">Thank you</div>
                    )}
                    <div className="text-gray-600">
                      {Math.round(currentMonthData.percentage)}% complete
                    </div>
                  </div>
                  
                  {!isFullySponsored && (
                    <div className="text-sm text-right">
                      <div className="font-bold text-orange-600">
                        ${currentMonthData.remainingForMonth.toLocaleString()} remaining
                      </div>
                      {currentMonthData.totalSponsoredForMonth > 0 && (
                        <div className="text-black">Rak B'Achdus</div>
                      )}
                      <div className="text-gray-600">
                        {Math.round(100 - currentMonthData.percentage)}% to go
                      </div>
                    </div>
                  )}
                  
                  {isFullySponsored && (
                    <div className="text-sm text-right">
                      <div className="font-bold text-green-600">✓ Fully Sponsored!</div>
                      <div className="text-green-600">Thank you for your support</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Year:</label>
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="border rounded-lg px-3 py-2 bg-white"
                >
                  {[5784, 5785, 5786, 5787, 5788].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-sm text-gray-600">Total Annual Expenses</div>
                <div className="text-2xl font-bold text-blue-600">${getTotalAnnualExpenses().toLocaleString()}</div>
              </div>
            </div>

            <div className="grid gap-6">
              {expenses.map(expense => (
                <div key={expense.id} className={`bg-white border rounded-lg p-6 shadow-sm ${expense.isHighPriority ? 'border-blue-400 bg-blue-50' : ''}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`text-lg font-semibold ${expense.isHighPriority ? 'text-blue-800' : 'text-gray-800'}`}>{expense.name}</h3>
                        {expense.isHighPriority && <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">Priority</span>}
                      </div>
                      <div className="mt-2">
                        {expense.description && expense.description.split('\n').map((line, index) => (
                          <p key={index} className={`text-sm ${
                            index === 0 ? 'text-gray-600' : 'text-blue-700 font-semibold'
                          }`}>{line}</p>
                        ))}
                      </div>
                      <div className="text-xl font-bold text-green-600 mt-2">
                        {expense.isFlexible || expense.hasSpecialMonths ? 'Variable amounts' : `${expense.amount.toLocaleString()}/month`}
                      </div>
                      {expense.isFlexible && expense.seasonalAmounts && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Object.entries(expense.seasonalAmounts).map(([season, amount]) => {
                            const IconComponent = seasonalIcons[season];
                            return (
                              <div key={season} className="flex items-center gap-1 text-xs sm:text-sm bg-gray-100 px-2 py-1 rounded">
                                <IconComponent size={12} />
                                <span className="capitalize">{season}:</span>
                                <span className="font-semibold">${amount}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
                    {months.map((month, index) => {
                      const sponsors = getSponsor(expense.id, index);
                      const progress = getMonthProgress(expense, index);
                      const isFullySponsored = progress.percentage >= 100;
                      
                      return (
                        <div key={`${expense.id}-${month}-${index}`} className="relative">
                          <button
                            onClick={() => isFullySponsored ? null : (setSelectedSponsorship({ expenseId: expense.id, month: index }), setShowSponsorForm(true))}
                            className={`w-full p-2 sm:p-3 rounded text-xs font-medium transition-colors min-h-[100px] ${
                              isFullySponsored
                                ? 'bg-green-100 text-green-800 border-2 border-green-300' 
                                : sponsors.length > 0
                                ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300 hover:bg-yellow-50'
                                : 'bg-gray-50 text-gray-700 border-2 border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                            }`}
                            disabled={isFullySponsored}
                          >
                            <div className="flex flex-col items-center gap-1 mb-2">
                              {getMonthIcon(expense, index)}
                              <div className="text-xs font-medium">{month}</div>
                            </div>
                            
                            <div className="text-xs font-bold text-gray-600 mb-1">
                              ${progress.expenseAmount}
                            </div>
                            
                            {sponsors.length > 0 && (
                              <div className="mt-1 space-y-1">
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                      isFullySponsored ? 'bg-green-500' : 'bg-yellow-500'
                                    }`}
                                    style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                                  ></div>
                                </div>
                                <div className="text-xs">
                                  <div className="font-medium">${progress.total.toLocaleString()}</div>
                                  {!isFullySponsored && (
                                    <div className="text-gray-600">${progress.remaining.toLocaleString()} left</div>
                                  )}
                                </div>
                                <div className="text-xs space-y-0.5">
                                  {sponsors.slice(0, 2).map((sponsor, idx) => (
                                    <div key={`${sponsor.id}-${idx}`} className="truncate" title={`${sponsor.memberName} - ${sponsor.amount}${sponsor.dedication ? ` - ${sponsor.dedication}` : ''}`}>
                                      {sponsor.memberName} (${sponsor.amount})
                                    </div>
                                  ))}
                                  {sponsors.length > 2 && (
                                    <div className="text-xs text-gray-600">+{sponsors.length - 2} more</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {showPaymentConfirmation && lastTransaction && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-green-800 mb-2">Payment Submitted!</h3>
                    <p className="text-gray-600">Your sponsorship has been confirmed and saved to our database.</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Transaction ID:</span>
                        <span className="font-mono text-xs">{lastTransaction.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Expense:</span>
                        <span>{lastTransaction.expenseName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Month:</span>
                        <span>{lastTransaction.monthName} {lastTransaction.year}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-bold">${lastTransaction.amount.toLocaleString()}</span>
                      </div>
                      {lastTransaction.dedication && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Dedication:</span>
                          <span className="text-right">{lastTransaction.dedication}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Recurring:</span>
                        <span>{lastTransaction.recurring ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowReceiptModal(true)}
                      className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      📄 View Receipt
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowPaymentConfirmation(false);
                        setLastTransaction(null);
                      }}
                      className="w-full bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showReceiptModal && lastTransaction && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <h3 className="text-xl font-bold text-green-800 mb-4">Tax Receipt</h3>
                  
                  <div className="bg-gray-50 border rounded-lg p-4 mb-4">
                    <textarea 
                      readOnly
                      value={`Cong. Tiferes Yechezkel of Beled
1379 58th Street
Brooklyn, NY 11219
Phone: (718) 436-8334
Email: congbeled@gmail.com
Tax ID: 11-3090728

TAX RECEIPT

Transaction ID: ${lastTransaction.id}
Date: ${new Date(lastTransaction.date).toLocaleDateString()}
Amount: ${lastTransaction.amount.toLocaleString()}
Donor: ${lastTransaction.memberName}
Email: ${lastTransaction.memberEmail || 'Not provided'}
Phone: ${lastTransaction.memberPhone || 'Not provided'}
Expense: ${lastTransaction.expenseName}
Month: ${lastTransaction.monthName} ${lastTransaction.year}
${lastTransaction.dedication ? `Dedication: ${lastTransaction.dedication}` : ''}
${lastTransaction.message ? `Message: ${lastTransaction.message}` : ''}
Recurring: ${lastTransaction.recurring ? 'Yes' : 'No'}

This donation is tax-deductible to the full extent allowed by law.

Thank you for your generous support!`}
                      className="w-full h-80 text-sm font-mono bg-white border rounded p-3 resize-none"
                      onClick={(e) => e.target.select()}
                    />
                  </div>
                  
                  <div className="flex justify-center">
                    <button
                      onClick={() => setShowReceiptModal(false)}
                      className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300"
                    >
                      Close
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-3 text-center">
                    Click in the text area above to select all text, then copy and save as needed
                  </p>
                </div>
              </div>
            )}

            {showSponsorForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-2 sm:p-4 z-50 overflow-y-auto">
                <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md my-4 sm:my-8">
                  <h3 className="text-lg font-bold mb-4">Sponsor {expenses.find(e => e.id === selectedSponsorship.expenseId)?.name}</h3>
                  <div className="mb-4">
                    <p className="text-gray-600">
                      Month: {months[selectedSponsorship.month]} {selectedYear}
                    </p>
                    {(() => {
                      const expense = expenses.find(e => e.id === selectedSponsorship.expenseId);
                      const progress = getMonthProgress(expense, selectedSponsorship.month);
                      return (
                        <div>
                          <p className="text-gray-600">
                            Monthly cost: ${progress.expenseAmount.toLocaleString()}
                          </p>
                          {progress.total > 0 && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-600">
                                Already sponsored: ${progress.total.toLocaleString()} ({Math.round(progress.percentage)}%)
                              </p>
                              <p className="text-sm text-gray-600">
                                Remaining: ${progress.remaining.toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Your Name *</label>
                      <input
                        type="text"
                        value={memberInfo.name}
                        onChange={(e) => setMemberInfo(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="Enter your name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Sponsorship Amount *</label>
                      <input
                        type="number"
                        value={memberInfo.amount}
                        onChange={(e) => setMemberInfo(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="Enter amount"
                        min="0.01"
                        step="0.01"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Up to full amount of ${(() => {
                          const expense = expenses.find(e => e.id === selectedSponsorship.expenseId);
                          const progress = getMonthProgress(expense, selectedSponsorship.month);
                          return progress.remaining.toLocaleString();
                        })()}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Email (optional)</label>
                      <input
                        type="email"
                        value={memberInfo.email}
                        onChange={(e) => setMemberInfo(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="your.email@example.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Phone (optional)</label>
                      <input
                        type="tel"
                        value={memberInfo.phone}
                        onChange={(e) => setMemberInfo(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Dedication (optional)</label>
                      <input
                        type="text"
                        value={memberInfo.dedication}
                        onChange={(e) => setMemberInfo(prev => ({ ...prev, dedication: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="In memory of... / In honor of..."
                      />
                      <p className="text-xs text-gray-500 mt-1">This will be shown publicly</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Personal Message (optional)</label>
                      <textarea
                        value={memberInfo.message}
                        onChange={(e) => setMemberInfo(prev => ({ ...prev, message: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 h-20 resize-none"
                        placeholder="Add a personal message or note..."
                      />
                      <p className="text-xs text-gray-500 mt-1">This will be visible when hovering over your sponsorship</p>
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Payment Information</h4>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Payment Method</label>
                          <div className="grid grid-cols-4 gap-2 mb-3">
                            {[
                              { type: 'visa', name: 'Visa', color: 'bg-blue-600' },
                              { type: 'mastercard', name: 'Mastercard', color: 'bg-red-600' },
                              { type: 'amex', name: 'Amex', color: 'bg-green-600' },
                              { type: 'discover', name: 'Discover', color: 'bg-orange-600' }
                            ].map(card => (
                              <div
                                key={card.type}
                                className={`p-2 rounded text-center text-xs font-medium text-white ${card.color} ${
                                  memberInfo.cardType === card.type ? 'ring-2 ring-offset-2 ring-gray-400' : 'opacity-60'
                                }`}
                              >
                                {card.name}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Card Number *</label>
                          <input
                            type="text"
                            value={memberInfo.cardNumber || ''}
                            onChange={(e) => {
                              const cardType = getCardType(e.target.value);
                              const formattedValue = formatCardNumber(e.target.value, cardType);
                              setMemberInfo(prev => ({ 
                                ...prev, 
                                cardNumber: formattedValue,
                                cardType: cardType
                              }));
                            }}
                            className={`w-full border rounded-lg px-3 py-2 ${
                              memberInfo.cardNumber && memberInfo.cardType && 
                              !validateCardNumber(memberInfo.cardNumber, memberInfo.cardType) 
                                ? 'border-red-300 bg-red-50' 
                                : memberInfo.cardNumber && memberInfo.cardType && 
                                  validateCardNumber(memberInfo.cardNumber, memberInfo.cardType)
                                ? 'border-green-300 bg-green-50'
                                : ''
                            }`}
                            placeholder={memberInfo.cardType === 'amex' ? '1234 567890 12345' : '1234 5678 9012 3456'}
                            maxLength={memberInfo.cardType === 'amex' ? '17' : '19'}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium mb-1">Expiry Date *</label>
                            <input
                              type="text"
                              value={memberInfo.expiryDate || ''}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                let formattedValue = value;
                                if (value.length >= 2) {
                                  formattedValue = value.slice(0, 2) + '/' + value.slice(2, 4);
                                }
                                if (formattedValue.length <= 5) {
                                  setMemberInfo(prev => ({ ...prev, expiryDate: formattedValue }));
                                }
                              }}
                              className="w-full border rounded-lg px-3 py-2"
                              placeholder="MM/YY"
                              maxLength="5"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">CVV *</label>
                            <input
                              type="text"
                              value={memberInfo.cvv || ''}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                const maxLength = memberInfo.cardType === 'amex' ? 4 : 3;
                                if (value.length <= maxLength) {
                                  setMemberInfo(prev => ({ ...prev, cvv: value }));
                                }
                              }}
                              className="w-full border rounded-lg px-3 py-2"
                              placeholder={memberInfo.cardType === 'amex' ? '1234' : '123'}
                              maxLength={memberInfo.cardType === 'amex' ? '4' : '3'}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Cardholder Name *</label>
                          <input
                            type="text"
                            value={memberInfo.cardholderName || ''}
                            onChange={(e) => setMemberInfo(prev => ({ ...prev, cardholderName: e.target.value }))}
                            className="w-full border rounded-lg px-3 py-2"
                            placeholder="Name as it appears on card"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Billing Address *</label>
                          <input
                            type="text"
                            value={memberInfo.billingAddress || ''}
                            onChange={(e) => setMemberInfo(prev => ({ ...prev, billingAddress: e.target.value }))}
                            className="w-full border rounded-lg px-3 py-2"
                            placeholder="Street address"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium mb-1">City *</label>
                            <input
                              type="text"
                              value={memberInfo.billingCity || ''}
                              onChange={(e) => setMemberInfo(prev => ({ ...prev, billingCity: e.target.value }))}
                              className="w-full border rounded-lg px-3 py-2"
                              placeholder="City"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">State *</label>
                            <input
                              type="text"
                              value={memberInfo.billingState || ''}
                              onChange={(e) => setMemberInfo(prev => ({ ...prev, billingState: e.target.value }))}
                              className="w-full border rounded-lg px-3 py-2"
                              placeholder="State"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">ZIP Code *</label>
                          <input
                            type="text"
                            value={memberInfo.billingZip || ''}
                            onChange={(e) => setMemberInfo(prev => ({ ...prev, billingZip: e.target.value }))}
                            className="w-full border rounded-lg px-3 py-2"
                            placeholder="ZIP Code"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <input
                        type="checkbox"
                        id="recurring"
                        checked={memberInfo.recurring}
                        onChange={(e) => setMemberInfo(prev => ({ ...prev, recurring: e.target.checked }))}
                        className="w-4 h-4"
                      />
                      <label htmlFor="recurring" className="text-sm font-medium text-blue-800">
                        Make this an ongoing sponsorship
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <button
                      onClick={sponsorExpense}
                      disabled={!memberInfo.name?.trim() || !memberInfo.amount || parseFloat(memberInfo.amount) <= 0 || 
                               !memberInfo.cardNumber?.replace(/\s/g, '') || !memberInfo.expiryDate || 
                               !memberInfo.cvv || !memberInfo.cardholderName?.trim() ||
                               !memberInfo.billingAddress?.trim() || !memberInfo.billingCity?.trim() ||
                               !memberInfo.billingState?.trim() || !memberInfo.billingZip?.trim() ||
                               !validateCardNumber(memberInfo.cardNumber, memberInfo.cardType)}
                      className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                    >
                      Process Payment & Confirm Sponsorship
                    </button>
                    <button
                      onClick={() => {
                        setShowSponsorForm(false);
                        setMemberInfo({ 
                          name: '', email: '', phone: '', dedication: '', message: '', recurring: true, amount: '',
                          cardNumber: '', expiryDate: '', cvv: '', cardholderName: '', billingAddress: '', 
                          billingCity: '', billingState: '', billingZip: '', cardType: '', savePayment: false
                        });
                      }}
                      className="flex-1 bg-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-400 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-500">
              <h2 className="text-xl font-bold text-purple-800 mb-2">Administrator Dashboard</h2>
              <p className="text-purple-700">
                Manage expenses and view sponsorship status. All data is automatically saved to Firebase.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-2xl font-bold text-blue-600">${getTotalSponsored().toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total Sponsored ({selectedYear})</div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-2xl font-bold text-green-600">${getTotalAnnualExpenses().toLocaleString()}</div>
                <div className="text-sm text-gray-600">Annual Expense Total</div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-2xl font-bold text-orange-600">
                  {getTotalAnnualExpenses() > 0 ? Math.round((getTotalSponsored() / getTotalAnnualExpenses()) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-600">Sponsored Coverage</div>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg border">
              <h3 className="text-lg font-bold mb-4">Add New Expense</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Expense Name *</label>
                  <input
                    type="text"
                    placeholder="Enter expense name"
                    value={newExpense.name}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-3 text-base focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Monthly Amount *</label>
                  <input
                    type="number"
                    placeholder="Enter monthly amount"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-3 text-base focus:border-blue-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min="0.01"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description (optional)</label>
                  <textarea
                    placeholder="Enter description"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-3 text-base h-20 resize-none focus:border-blue-500 focus:outline-none"
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isFlexible"
                    checked={newExpense.isFlexible}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, isFlexible: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <label htmlFor="isFlexible" className="text-sm font-medium">
                    Seasonal amounts (different amounts for each season)
                  </label>
                </div>
                
                {newExpense.isFlexible && (
                  <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        <Leaf size={14} className="inline mr-1" />
                        Fall Amount
                      </label>
                      <input
                        type="number"
                        value={newExpense.seasonalAmounts.fall}
                        onChange={(e) => setNewExpense(prev => ({ 
                          ...prev, 
                          seasonalAmounts: { ...prev.seasonalAmounts, fall: e.target.value }
                        }))}
                        className="w-full border rounded-lg px-3 py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="Fall amount"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        <Snowflake size={14} className="inline mr-1" />
                        Winter Amount
                      </label>
                      <input
                        type="number"
                        value={newExpense.seasonalAmounts.winter}
                        onChange={(e) => setNewExpense(prev => ({ 
                          ...prev, 
                          seasonalAmounts: { ...prev.seasonalAmounts, winter: e.target.value }
                        }))}
                        className="w-full border rounded-lg px-3 py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="Winter amount"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        <Flower size={14} className="inline mr-1" />
                        Spring Amount
                      </label>
                      <input
                        type="number"
                        value={newExpense.seasonalAmounts.spring}
                        onChange={(e) => setNewExpense(prev => ({ 
                          ...prev, 
                          seasonalAmounts: { ...prev.seasonalAmounts, spring: e.target.value }
                        }))}
                        className="w-full border rounded-lg px-3 py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="Spring amount"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        <Sun size={14} className="inline mr-1" />
                        Summer Amount
                      </label>
                      <input
                        type="number"
                        value={newExpense.seasonalAmounts.summer}
                        onChange={(e) => setNewExpense(prev => ({ 
                          ...prev, 
                          seasonalAmounts: { ...prev.seasonalAmounts, summer: e.target.value }
                        }))}
                        className="w-full border rounded-lg px-3 py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="Summer amount"
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="hasSpecialMonths"
                    checked={newExpense.hasSpecialMonths}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, hasSpecialMonths: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <label htmlFor="hasSpecialMonths" className="text-sm font-medium">
                    Special YT months (Tishrei, Nissan with different amounts)
                  </label>
                </div>
                
                {newExpense.hasSpecialMonths && (
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="mb-3">
                      <label className="block text-sm font-medium mb-2">Select Special Months:</label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {months.map((month, index) => (
                          <label key={index} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={newExpense.specialMonths.includes(index)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewExpense(prev => ({ 
                                    ...prev, 
                                    specialMonths: [...prev.specialMonths, index]
                                  }));
                                } else {
                                  setNewExpense(prev => ({ 
                                    ...prev, 
                                    specialMonths: prev.specialMonths.filter(m => m !== index)
                                  }));
                                }
                              }}
                              className="w-3 h-3"
                            />
                            {month}
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    {newExpense.specialMonths.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Set amounts for special months:</h4>
                        {newExpense.specialMonths.map(monthIndex => (
                          <div key={monthIndex}>
                            <label className="block text-sm font-medium mb-1">
                              <span className="text-orange-600 font-bold text-xs mr-1">$YT</span>
                              {months[monthIndex]} Amount
                            </label>
                            <input
                              type="number"
                              value={newExpense.monthlyAmounts[monthIndex] || ''}
                              onChange={(e) => setNewExpense(prev => ({ 
                                ...prev, 
                                monthlyAmounts: { 
                                  ...prev.monthlyAmounts, 
                                  [monthIndex]: e.target.value 
                                }
                              }))}
                              className="w-full border rounded-lg px-3 py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              placeholder={`Amount for ${months[monthIndex]}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <button
                  onClick={addExpense}
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 font-medium text-base"
                >
                  <Plus size={16} /> Add Expense
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold">Current Expenses</h3>
              {expenses.map(expense => (
                <div 
                  key={expense.id} 
                  ref={el => expenseRefs.current[expense.id] = el}
                  className={`bg-white border rounded-lg p-4 transition-all duration-500 ${
                    newlyAddedExpenseId === expense.id 
                      ? 'border-green-400 bg-green-50 shadow-lg' 
                      : 'border-gray-200'
                  }`}
                >
                  {editingExpense === expense.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingValues.name}
                        onChange={(e) => setEditingValues(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="Expense name"
                      />
                      <input
                        type="number"
                        value={editingValues.amount}
                        onChange={(e) => setEditingValues(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="Monthly amount"
                      />
                      <input
                        type="text"
                        value={editingValues.description}
                        onChange={(e) => setEditingValues(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="Description"
                      />
                      
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`editFlexible-${expense.id}`}
                          checked={editingValues.isFlexible}
                          onChange={(e) => setEditingValues(prev => ({ ...prev, isFlexible: e.target.checked }))}
                          className="w-4 h-4"
                        />
                        <label htmlFor={`editFlexible-${expense.id}`} className="text-sm font-medium">
                          Seasonal amounts
                        </label>
                      </div>
                      
                      {editingValues.isFlexible && (
                        <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg">
                          <div>
                            <label className="block text-sm font-medium mb-1">Fall Amount</label>
                            <input
                              type="number"
                              value={editingValues.seasonalAmounts.fall}
                              onChange={(e) => setEditingValues(prev => ({ 
                                ...prev, 
                                seasonalAmounts: { ...prev.seasonalAmounts, fall: e.target.value }
                              }))}
                              className="w-full border rounded-lg px-3 py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Winter Amount</label>
                            <input
                              type="number"
                              value={editingValues.seasonalAmounts.winter}
                              onChange={(e) => setEditingValues(prev => ({ 
                                ...prev, 
                                seasonalAmounts: { ...prev.seasonalAmounts, winter: e.target.value }
                              }))}
                              className="w-full border rounded-lg px-3 py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Spring Amount</label>
                            <input
                              type="number"
                              value={editingValues.seasonalAmounts.spring}
                              onChange={(e) => setEditingValues(prev => ({ 
                                ...prev, 
                                seasonalAmounts: { ...prev.seasonalAmounts, spring: e.target.value }
                              }))}
                              className="w-full border rounded-lg px-3 py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Summer Amount</label>
                            <input
                              type="number"
                              value={editingValues.seasonalAmounts.summer}
                              onChange={(e) => setEditingValues(prev => ({ 
                                ...prev, 
                                seasonalAmounts: { ...prev.seasonalAmounts, summer: e.target.value }
                              }))}
                              className="w-full border rounded-lg px-3 py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`editSpecial-${expense.id}`}
                          checked={editingValues.hasSpecialMonths}
                          onChange={(e) => setEditingValues(prev => ({ ...prev, hasSpecialMonths: e.target.checked }))}
                          className="w-4 h-4"
                        />
                        <label htmlFor={`editSpecial-${expense.id}`} className="text-sm font-medium">
                          Special YT months
                        </label>
                      </div>
                      
                      {editingValues.hasSpecialMonths && (
                        <div className="p-4 bg-orange-50 rounded-lg">
                          <div className="mb-3">
                            <label className="block text-sm font-medium mb-2">Select Special Months:</label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {months.map((month, index) => (
                                <label key={index} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={editingValues.specialMonths.includes(index)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setEditingValues(prev => ({ 
                                          ...prev, 
                                          specialMonths: [...prev.specialMonths, index]
                                        }));
                                      } else {
                                        setEditingValues(prev => ({ 
                                          ...prev, 
                                          specialMonths: prev.specialMonths.filter(m => m !== index)
                                        }));
                                      }
                                    }}
                                    className="w-3 h-3"
                                  />
                                  {month}
                                </label>
                              ))}
                            </div>
                          </div>
                          
                          {editingValues.specialMonths.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-sm font-medium">Set amounts for special months:</h4>
                              {editingValues.specialMonths.map(monthIndex => (
                                <div key={monthIndex}>
                                  <label className="block text-sm font-medium mb-1">
                                    {months[monthIndex]} Amount
                                  </label>
                                  <input
                                    type="number"
                                    value={editingValues.monthlyAmounts[monthIndex] || ''}
                                    onChange={(e) => setEditingValues(prev => ({ 
                                      ...prev, 
                                      monthlyAmounts: { 
                                        ...prev.monthlyAmounts, 
                                        [monthIndex]: e.target.value 
                                      }
                                    }))}
                                    className="w-full border rounded-lg px-3 py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateExpense(expense.id, editingValues)}
                          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 flex items-center gap-1"
                        >
                          <Check size={14} /> Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 flex items-center gap-1"
                        >
                          <X size={14} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{expense.name}</h4>
                        <p className="text-gray-600 text-sm">{expense.description}</p>
                        <p className="font-bold text-green-600 mt-2">
                          {expense.isFlexible || expense.hasSpecialMonths ? 'Variable amounts' : `${expense.amount.toLocaleString()}/month`}
                        </p>
                        {expense.isFlexible && expense.seasonalAmounts && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {Object.entries(expense.seasonalAmounts).map(([season, amount]) => {
                              const IconComponent = seasonalIcons[season];
                              return (
                                <div key={season} className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
                                  <IconComponent size={12} />
                                  <span className="capitalize">{season}:</span>
                                  <span className="font-semibold">${amount}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Sponsored: {months.filter((_, index) => {
                            const progress = getMonthProgress(expense, index);
                            return progress.percentage >= 100;
                          }).length}/12 months fully sponsored
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditing(expense)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this expense? This will also remove all associated sponsorships.')) {
                              deleteExpense(expense.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
                    {months.map((month, index) => {
                      const sponsors = getSponsor(expense.id, index);
                      const progress = getMonthProgress(expense, index);
                      const isSponsored = sponsors.length > 0;
                      return (
                        <div key={`${expense.id}-${month}-${index}`} className="relative">
                          <div className={`p-2 rounded text-xs text-center min-h-[80px] ${
                            isSponsored
                              ? 'bg-green-100 text-green-800 border border-green-300' 
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}>
                            <div className="flex flex-col items-center gap-1 mb-2">
                              {getMonthIcon(expense, index)}
                              <span className="text-xs font-medium">{month}</span>
                            </div>
                            <div className="text-xs font-bold text-gray-600">
                              ${progress.expenseAmount}
                            </div>
                            {isSponsored && (
                              <div className="space-y-1 mt-1">
                                <div className="text-xs font-bold">${progress.total}</div>
                                {sponsors.slice(0, 2).map((sponsor, idx) => (
                                  <div key={`${sponsor.id}-${idx}`} className="truncate text-xs font-medium" title={`${sponsor.memberName} - ${sponsor.amount}${sponsor.dedication ? ` - ${sponsor.dedication}` : ''}`}>
                                    {sponsor.memberName} (${sponsor.amount})
                                  </div>
                                ))}
                                {sponsors.length > 2 && (
                                  <div className="text-xs text-gray-600">+{sponsors.length - 2} more</div>
                                )}
                              </div>
                            )}
                          </div>
                          {isSponsored && sponsors.map((sponsor, idx) => (
                            <button
                              key={sponsor.id}
                              onClick={() => {
                                if (confirm(`Remove ${sponsor.memberName}'s ${sponsor.amount} sponsorship?${sponsor.dedication ? `\nDedication: ${sponsor.dedication}` : ''}`)) {
                                  removeSponsor(sponsor.id);
                                }
                              }}
                              className={`absolute bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 font-bold ${
                                idx === 0 ? '-top-1 -right-1' : 
                                idx === 1 ? '-top-1 -left-1' :
                                '-bottom-1 -right-1'
                              }`}
                              title={`Remove ${sponsor.memberName}'s ${sponsor.amount} sponsorship${sponsor.dedication ? ` - ${sponsor.dedication}` : ''}`}
                              style={{ display: idx < 3 ? 'flex' : 'none' }}
                            >
                              ×
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SynagogueExpenseApp;
