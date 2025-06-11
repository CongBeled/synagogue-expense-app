import React, { useState, useRef, useEffect } from 'react';
import { Calendar, DollarSign, User, Settings, Plus, Trash2, Edit3, Check, X, Snowflake, Sun, Flower, Leaf } from 'lucide-react';
import './App.css';

const SynagogueExpenseApp = () => {
  const [currentView, setCurrentView] = useState('member');
  const [selectedYear, setSelectedYear] = useState(5785);
  const [expenses, setExpenses] = useState([
    { id: 1, name: 'Mortgage Payment', amount: 1500, description: 'Monthly mortgage payment\nFor full or partial sponsorship click the month and enter the amount of your choosing', isHighPriority: true },
    { 
      id: 2, 
      name: 'Electricity', 
      amount: 350, 
      description: 'Monthly electric bill',
      isFlexible: true,
      seasonalAmounts: {
        winter: 450,
        spring: 300,
        summer: 400,
        fall: 280
      }
    },
    { 
      id: 3, 
      name: 'Cleaning Services', 
      amount: 400, 
      description: 'Professional cleaning twice weekly',
      hasSpecialMonths: true,
      specialMonths: [0, 6],
      monthlyAmounts: {
        0: 600,
        6: 550
      }
    },
    { id: 4, name: 'Coffee & Kitchen Supplies', amount: 150, description: 'Coffee, tea, and kitchen essentials' },
    { id: 5, name: 'Security System', amount: 200, description: 'Monthly security monitoring' },
    { id: 6, name: 'Landscaping', amount: 300, description: 'Grounds maintenance and landscaping' },
    { 
      id: 7, 
      name: 'Gas', 
      amount: 200, 
      description: 'Monthly gas utility bill',
      isFlexible: true,
      seasonalAmounts: {
        winter: 300,
        spring: 150,
        summer: 120,
        fall: 180
      }
    }
  ]);
  
  const [sponsorships, setSponsorships] = useState({});
  const [newExpense, setNewExpense] = useState({ name: '', amount: '', description: '' });
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingValues, setEditingValues] = useState({ name: '', amount: '', description: '' });
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

  const getCurrentHebrewMonth = () => {
    // June 2025 corresponds to Sivan/Tammuz 5785
    // More accurate mapping would be around Sivan 5785
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

  const getSponsorshipKey = (expenseId, monthIndex) => {
    return `${expenseId}-${monthIndex}-${selectedYear}`;
  };

  const getSponsor = (expenseId, monthIndex) => {
    const sponsorshipArray = sponsorships[getSponsorshipKey(expenseId, monthIndex)];
    return sponsorshipArray || [];
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

  const addExpense = () => {
    if (newExpense.name && newExpense.amount && parseFloat(newExpense.amount) > 0) {
      const expenseId = Date.now() + Math.floor(Math.random() * 1000);
      const expense = {
        id: expenseId,
        name: newExpense.name.trim(),
        amount: parseFloat(newExpense.amount),
        description: newExpense.description.trim()
      };
      setExpenses(prev => [...prev, expense]);
      setNewExpense({ name: '', amount: '', description: '' });
      setNewlyAddedExpenseId(expenseId);
    }
  };

  const deleteExpense = (id) => {
    if (newlyAddedExpenseId === id) {
      setNewlyAddedExpenseId(null);
    }
    
    setExpenses(prev => prev.filter(exp => exp.id !== id));
    setSponsorships(prev => {
      const newSponsorships = { ...prev };
      Object.keys(newSponsorships).forEach(key => {
        if (key.startsWith(`${id}-`)) {
          delete newSponsorships[key];
        }
      });
      return newSponsorships;
    });
    
    if (expenseRefs.current[id]) {
      delete expenseRefs.current[id];
    }
  };

  const updateExpense = (id, updatedExpense) => {
    setExpenses(prev => prev.map(exp => 
      exp.id === id ? { ...exp, ...updatedExpense, amount: parseFloat(updatedExpense.amount) } : exp
    ));
    setEditingExpense(null);
    setEditingValues({ name: '', amount: '', description: '' });
  };

  const startEditing = (expense) => {
    setEditingExpense(expense.id);
    setEditingValues({
      name: expense.name,
      amount: expense.amount.toString(),
      description: expense.description
    });
  };

  const cancelEditing = () => {
    setEditingExpense(null);
    setEditingValues({ name: '', amount: '', description: '' });
  };

  const sponsorExpense = () => {
    if (memberInfo.name?.trim() && selectedSponsorship.expenseId && selectedSponsorship.month !== null && memberInfo.amount) {
      const sponsorAmount = parseFloat(memberInfo.amount);
      
      if (sponsorAmount <= 0) return;
      
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
      
      setSponsorships(prev => {
        const newSponsorships = { ...prev };
        
        if (memberInfo.recurring) {
          [5784, 5785, 5786, 5787, 5788].forEach(year => {
            const key = `${selectedSponsorship.expenseId}-${selectedSponsorship.month}-${year}`;
            if (!newSponsorships[key]) {
              newSponsorships[key] = [];
            }
            newSponsorships[key].push({
              id: `${Date.now()}-${Math.floor(Math.random() * 10000)}-${year}`,
              memberName: memberInfo.name.trim(),
              memberEmail: memberInfo.email?.trim() || '',
              memberPhone: memberInfo.phone?.trim() || '',
              expenseId: selectedSponsorship.expenseId,
              month: selectedSponsorship.month,
              year: year,
              amount: sponsorAmount,
              recurring: true,
              dedication: memberInfo.dedication?.trim() || '',
              message: memberInfo.message?.trim() || ''
            });
          });
        } else {
          const key = `${selectedSponsorship.expenseId}-${selectedSponsorship.month}-${selectedYear}`;
          if (!newSponsorships[key]) {
            newSponsorships[key] = [];
          }
          newSponsorships[key].push({
            id: `${Date.now()}-${Math.floor(Math.random() * 10000)}-${selectedYear}`,
            memberName: memberInfo.name.trim(),
            memberEmail: memberInfo.email?.trim() || '',
            memberPhone: memberInfo.phone?.trim() || '',
            expenseId: selectedSponsorship.expenseId,
            month: selectedSponsorship.month,
            year: selectedYear,
            amount: sponsorAmount,
            recurring: false,
            dedication: memberInfo.dedication?.trim() || '',
            message: memberInfo.message?.trim() || ''
          });
        }
        
        return newSponsorships;
      });
      
      setShowSponsorForm(false);
      setShowPaymentConfirmation(true);
      setSelectedSponsorship({ expenseId: null, month: null });
      
      setMemberInfo({ 
        name: '', email: '', phone: '', dedication: '', message: '', recurring: true, amount: '',
        cardNumber: '', expiryDate: '', cvv: '', cardholderName: '', billingAddress: '', 
        billingCity: '', billingState: '', billingZip: '', cardType: '', savePayment: false
      });
    }
  };

  const removeSponsor = (expenseId, monthIndex, sponsorId) => {
    const key = getSponsorshipKey(expenseId, monthIndex);
    setSponsorships(prev => {
      const newSponsorships = { ...prev };
      if (newSponsorships[key]) {
        newSponsorships[key] = newSponsorships[key].filter(sponsor => sponsor.id !== sponsorId);
        if (newSponsorships[key].length === 0) {
          delete newSponsorships[key];
        }
      }
      return newSponsorships;
    });
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
    return Object.keys(sponsorships)
      .filter(key => key.endsWith(`-${selectedYear}`))
      .reduce((total, key) => {
        const sponsorshipArray = sponsorships[key];
        if (Array.isArray(sponsorshipArray)) {
          return total + sponsorshipArray.reduce((sum, sponsorship) => sum + sponsorship.amount, 0);
        }
        return total;
      }, 0);
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
                        <div className="text-black">
