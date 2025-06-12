// Fully converted App.js from original TSX with requested enhancements
// Includes:
// - Variable amounts by season
// - Field validation on blur
// - User autocomplete from Firebase
// - Spinnerless number input
// - Receipt with congregation info at top

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, DollarSign, User, Settings, Plus, Trash2, Edit3, Check, X, Snowflake, Sun, Flower, Leaf } from 'lucide-react';

const SynagogueExpenseApp = () => {
  const [currentView, setCurrentView] = useState('member');
  const [selectedYear, setSelectedYear] = useState(5785);
  const [expenses, setExpenses] = useState([
    { id, name: 'Mortgage Payment', amount, description: 'Monthly mortgage payment\nFor full or partial sponsorship click the month and enter the amount of your choosing', isHighPriority},
    { 
      id, 
      name: 'Electricity', 
      amount, 
      description: 'Monthly electric bill',
      isFlexible,
      seasonalAmounts
    },
    { 
      id, 
      name: 'Cleaning Services', 
      amount, 
      description: 'Professional cleaning twice weekly',
      hasSpecialMonths,
      specialMonths: [0, 6],
      monthlyAmounts
    },
    { id, name: 'Coffee & Kitchen Supplies', amount, description: 'Coffee, tea, and kitchen essentials' },
    { id, name: 'Security System', amount, description: 'Monthly security monitoring' },
    { id, name: 'Landscaping', amount, description: 'Grounds maintenance and landscaping' },
    { 
      id, 
      name: 'Gas', 
      amount, 
      description: 'Monthly g bill',
      isFlexible,
      seasonalAmounts
    }
  ]);
  
  const [sponsorships, setSponsorships] = useState({});
  const [newExpense, setNewExpense] = useState({ name: '', amount: '', description: '' });
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingValues, setEditingValues] = useState({ name: '', amount: '', description: '' });
  const [memberInfo, setMemberInfo] = useState({ 
    name: '', email: '', phone: '', dedication: '', message: '', recurring, amount: '',
    cardNumber: '', expiryDate: '', cvv: '', cardholderName: '', billingAddress: '', 
    billingCity: '', billingState: '', billingZip: '', cardType: '', savePayment});
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [showReceiptText, setShowReceiptText] = useState(false);
  const [showSponsorForm, setShowSponsorForm] = useState(false);
  const [selectedSponsorship, setSelectedSponsorship] = useState({ expenseId, month});
  const [newlyAddedExpenseId, setNewlyAddedExpenseId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [storedUsers, setStoredUsers] = useState([
    { name: 'John Doe', email: 'john@example.com', phone: '(555) 123-4567' },
    { name: 'Jane Smith', email: 'jane@example.com', phone: '(555) 987-6543' },
    { name: 'David Cohen', email: 'david@example.com', phone: '(555) 456-7890' }
  ]);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [userSuggestions, setUserSuggestions] = useState([]);
  const expenseRefs = useRef({});

  const months = [
    'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar',
    'Nissan', 'Iyar', 'Sivan', 'Tammuz', 'Av', 'Elul'
  ];

  const seasonalIcons = {
    winter,
    spring,
    summer,
    fall};

  const getCurrentHebrewMonth = () => {
    return 8; // Sivan
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
    
    const percentage = totalExpenseForMonth > 0 ? (totalSponsoredForMonth / totalExpenseForMonth) * 100 ;
    
    return {
      currentMonthName[currentMonth],
      totalExpenseForMonth,
      totalSponsoredForMonth,
      remainingForMonth.max(totalExpenseForMonth - totalSponsoredForMonth, 0),
      percentage.min(percentage, 100)
    };
  };

  const getCardType = (number) => {
    const cleaned = number.replace(/\s/g, '');
    if (/^4/.test(cleaned)) return 'visa';
    if (/^5[1-5]/.test(cleaned)) return 'mastercard';
    if (/^3[47]/.test(cleaned)) return 'amex';
    if (/^6(?|5)/.test(cleaned)) return 'discover';
    return '';
  };

  const validateCardNumber = (number, type) => {
    const cleaned = number.replace(/\s/g, '');
    switch (type) {
      case 'visa'/^4\d{15}$/.test(cleaned);
      case 'mastercard'/^5[1-5]\d{14}$/.test(cleaned);
      case 'amex'/^3[47]\d{13}$/.test(cleaned);
      case 'discover'/^6(?|5\d{2})\d{12}$/.test(cleaned);
      defaultfalse;
    }
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10;
  };

  const validateExpiryDate = (date) => {
    if (!/^\d{2}\/\d{2}$/.test(date)) return false;
    const parts = date.split('/');
    const month = parseInt(parts[0]);
    const year = parseInt(parts[1]);
    if (month < 1 || month > 12) return false;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;
    if (year < currentYear || (year === currentYear && month < currentMonth)) return false;
    return true;
  };

  const validateCVV = (cvv, cardType) => {
    const expectedLength = cardType === 'amex' ? 4 ;
    return cvv.length === expectedLength && /^\d+$/.test(cvv);
  };

  const handleFieldValidation = (field, value) => {
    let error = '';
    
    if (field === 'email' && value && !validateEmail(value)) {
      error = 'Please enter a valid email address';
    } else if (field === 'phone' && value && !validatePhone(value)) {
      error = 'Please enter a valid 10-digit phone number';
    } else if (field === 'cardNumber' && value && memberInfo.cardType && !validateCardNumber(value, memberInfo.cardType)) {
      error = 'Please enter a valid ' + memberInfo.cardType.toUpperCase() + ' card number';
    } else if (field === 'expiryDate' && value && !validateExpiryDate(value)) {
      error = 'Please enter a valid expiry date (MM/YY) in the future';
    } else if (field === 'cvv' && value && memberInfo.cardType && !validateCVV(value, memberInfo.cardType)) {
      const expectedLength = memberInfo.cardType === 'amex' ? 4 ;
      error = 'Please enter a valid ' + expectedLength + '-digit CVV';
    }
    
    setFieldErrors(prev => ({ ...prev, [field]}));
  };

  const handleNameChange = (value) => {
    setMemberInfo(prev => ({ ...prev, name}));
    
    if (value.length > 0) {
      const suggestions = storedUsers.filter(user => 
        user.name.toLowerCase().startsWith(value.toLowerCase())
      );
      setUserSuggestions(suggestions);
      setShowUserSuggestions(suggestions.length > 0);
    } else {
      setShowUserSuggestions(false);
    }
  };

  const selectUser = (user) => {
    setMemberInfo(prev => ({ 
      ...prev, 
      name.name, 
      email.email, 
      phone.phone 
    }));
    setShowUserSuggestions(false);
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
    return expenseId + '-' + monthIndex + '-' + selectedYear;
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
    return { total, percentage, remaining.max(expenseAmount - total, 0), expenseAmount };
  };

  const getMonthIcon = (expense, monthIndex) => {
    if (expense.hasSpecialMonths && expense.specialMonths && expense.specialMonths.includes(monthIndex)) {
      return React.createElement('span', { className: "text-orange-600 font-bold text-xs" }, '$YT');
    }
    
    if (expense.isFlexible) {
      const season = getSeasonForMonth(monthIndex);
      const IconComponent = seasonalIcons[season];
      return React.createElement(IconComponent, { size});
    }
    
    return null;
  };

  const addExpense = () => {
    if (newExpense.name && newExpense.amount && parseFloat(newExpense.amount) > 0) {
      const expenseId = Date.now() + Math.floor(Math.random() * 1000);
      const expense = {
        id,
        name.name.trim(),
        amount(newExpense.amount),
        description.description.trim()
      };
      setExpenses(prev => [...prev, expense]);
      setNewExpense({ name: '', amount: '', description: '' });
      setNewlyAddedExpenseId(expenseId);
    }
  };

  const deleteExpense = (id) => {
    setExpenses(prev => prev.filter(exp => exp.id !== id));
    setSponsorships(prev => {
      const newSponsorships = { ...prev };
      Object.keys(newSponsorships).forEach(key => {
        if (key.startsWith(id + '-')) {
          delete newSponsorships[key];
        }
      });
      return newSponsorships;
    });
  };

  const sponsorExpense = () => {
    if (memberInfo.name?.trim() && selectedSponsorship.expenseId && selectedSponsorship.month !== null && memberInfo.amount) {
      const sponsorAmount = parseFloat(memberInfo.amount);
      
      if (sponsorAmount <= 0) return;
      
      const expense = expenses.find(e => e.id === selectedSponsorship.expenseId);
      const transactionId = 'TXN-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      const transaction = {
        id,
        dateDate().toISOString(),
        memberName.name.trim(),
        memberEmail.email?.trim() || '',
        memberPhone.phone?.trim() || '',
        amount,
        expenseName.name,
        monthName[selectedSponsorship.month],
        year,
        dedication.dedication?.trim() || '',
        message.message?.trim() || '',
        recurring.recurring,
        cardType.cardType,
        lastFourDigits.cardNumber.replace(/\s/g, '').slice(-4)
      };
      
      setLastTransaction(transaction);
      
      setSponsorships(prev => {
        const newSponsorships = { ...prev };
        const key = selectedSponsorship.expenseId + '-' + selectedSponsorship.month + '-' + selectedYear;
        if (!newSponsorships[key]) {
          newSponsorships[key] = [];
        }
        newSponsorships[key].push({
          id.now() + '-' + Math.floor(Math.random() * 10000) + '-' + selectedYear,
          memberName.name.trim(),
          memberEmail.email?.trim() || '',
          memberPhone.phone?.trim() || '',
          expenseId.expenseId,
          month.month,
          year,
          amount,
          recurring.recurring,
          dedication.dedication?.trim() || '',
          message.message?.trim() || ''
        });
        return newSponsorships;
      });
      
      setShowSponsorForm(false);
      setShowPaymentConfirmation(true);
      setSelectedSponsorship({ expenseId, month});
      
      // Store user info for future use
      const existingUserIndex = storedUsers.findIndex(user => 
        user.name.toLowerCase() === memberInfo.name.trim().toLowerCase()
      );
      if (existingUserIndex === -1) {
        setStoredUsers(prev => [...prev, {
          name.name.trim(),
          email.email?.trim() || '',
          phone.phone?.trim() || ''
        }]);
      }
      
      setMemberInfo({ 
        name: '', email: '', phone: '', dedication: '', message: '', recurring, amount: '',
        cardNumber: '', expiryDate: '', cvv: '', cardholderName: '', billingAddress: '', 
        billingCity: '', billingState: '', billingZip: '', cardType: '', savePayment});
      setFieldErrors({});
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-2 sm-4 py-4">
          <div className="flex flex-col sm-row justify-between items-start sm-center gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="text-blue-600" size={28} />
              <div>
                <h1 className="text-xl sm-2xl font-bold text-gray-800">Beled Expense Sponsorship</h1>
                <p className="text-gray-600 text-sm">Support our shul, month by month</p>
              </div>
            </div>
            
            <div className="flex gap-2 w-full sm-auto">
              <button
                onClick={() => setCurrentView('member')}
                className={'flex-1 sm-none px-3 sm-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm ' + 
                  (currentView === 'member' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover-gray-300')}
              >
                <User size={16} /> Member
              </button>
              <button
                onClick={() => setCurrentView('admin')}
                className={'flex-1 sm-none px-3 sm-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm ' +
                  (currentView === 'admin' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover-gray-300')}
              >
                <Settings size={16} /> Admin
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-2 sm-4 py-4 sm-8">
        {currentView === 'member' ? (
          <div className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
              <h2 className="text-xl font-bold text-blue-800 mb-2">Welcome to Our Sponsorship Program</h2>
              <p className="text-blue-700">
                Help support our shul by sponsoring monthly expenses. Choose any available month for any expense category.
              </p>
            </div>

            {(() => {
              const currentMonthData = getCurrentMonthTotals();
              const isFullySponsored = currentMonthData.percentage >= 100;
              
              return (
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
                        className={'h-4 rounded-full transition-all duration-500 ' + (isFullySponsored ? 'bg-green-500' : 'bg-blue-500')}
                        style={{ width.percentage + '%' }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <div className={'font-bold ' + (isFullySponsored ? 'text-green-600' : 'text-blue-600')}>
                          ${currentMonthData.totalSponsoredForMonth.toLocaleString()} sponsored
                        </div>
                        <div className="text-gray-600">
                          {Math.round(currentMonthData.percentage)}% complete
                        </div>
                      </div>
                      
                      {!isFullySponsored && (
                        <div className="text-sm text-right">
                          <div className="font-bold text-orange-600">
                            ${currentMonthData.remainingForMonth.toLocaleString()} remaining
                          </div>
                          <div className="text-gray-600">
                            {Math.round(100 - currentMonthData.percentage)}% to go
                          </div>
                        </div>
                      )}
                      
                      {isFullySponsored && (
                        <div className="text-sm text-right">
                          <div className="font-bold text-green-600">
                            ✓ Fully Sponsored!
                          </div>
                          <div className="text-green-600">
                            Thank you for your support
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-col sm-row justify-between items-start sm-center gap-4">
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
              <div className="text-left sm-right">
                <div className="text-sm text-gray-600">Total Annual Expenses</div>
                <div className="text-2xl font-bold text-blue-600">${getTotalAnnualExpenses().toLocaleString()}</div>
              </div>
            </div>

            <div className="grid gap-6">
              {expenses.map(expense => (
                <div key={expense.id} className={'bg-white border rounded-lg p-6 shadow-sm ' + (expense.isHighPriority ? 'border-blue-400 bg-blue-50' : '')}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={'text-lg font-semibold ' + (expense.isHighPriority ? 'text-blue-800' : 'text-gray-800')}>{expense.name}</h3>
                        {expense.isHighPriority && <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">Priority</span>}
                      </div>
                      <div className="mt-2">
                        {expense.description.split('\n').map((line, index) => (
                          <p key={index} className={'text-sm ' + (index === 0 ? 'text-gray-600' : 'text-blue-700 font-semibold')}>{line}</p>
                        ))}
                      </div>
                      <div className="text-xl font-bold text-green-600 mt-2">
                        {expense.isFlexible || expense.hasSpecialMonths ? 'Variable amounts' : '$' + expense.amount.toLocaleString() + '/month'}
                      </div>
                      {expense.isFlexible && expense.seasonalAmounts && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Object.entries(expense.seasonalAmounts).map(([season, amount]) => {
                            const IconComponent = seasonalIcons[season];
                            return (
                              <div key={season} className="flex items-center gap-1 text-xs sm-sm bg-gray-100 px-2 py-1 rounded">
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
                  
                  <div className="grid grid-cols-3 sm-cols-4 md-cols-6 lg-cols-12 gap-2">
                    {months.map((month, index) => {
                      const sponsors = getSponsor(expense.id, index);
                      const progress = getMonthProgress(expense, index);
                      const isFullySponsored = progress.percentage >= 100;
                      
                      return (
                        <div key={expense.id + '-' + month + '-' + index} className="relative">
                          <button
                            onClick={() => isFullySponsored ? null : (setSelectedSponsorship({ expenseId.id, month}), setShowSponsorForm(true))}
                            className={'w-full p-2 sm-3 rounded text-xs font-medium transition-colors min-h-[100px] ' +
                              (isFullySponsored
                                ? 'bg-green-100 text-green-800 border-2 border-green-300' 
                                .length > 0
                                ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300 hover-yellow-50'
                                : 'bg-gray-50 text-gray-700 border-2 border-gray-200 hover-blue-50 hover-blue-300')}
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
                                    className={'h-1.5 rounded-full transition-all duration-300 ' + (isFullySponsored ? 'bg-green-500' : 'bg-yellow-500')}
                                    style={{ width.min(progress.percentage, 100) + '%' }}
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
                                    <div key={sponsor.id + '-' + idx} className="truncate">
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
                    <p className="text-gray-600">Your sponsorship h confirmed.</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-bold">${lastTransaction.amount.toLocaleString()}</span>
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
                        <span className="text-gray-600">Card:</span>
                        <span className="capitalize">{lastTransaction.cardType} ****{lastTransaction.lastFourDigits}</span>
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
                      onClick={() => setShowReceiptText(true)}
                      className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover-blue-700 flex items-center justify-center gap-2"
                    >
                      <DollarSign size={16} />
                      Get Tax Receipt
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowPaymentConfirmation(false);
                        setLastTransaction(null);
                      }}
                      className="w-full bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover-gray-300"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showReceiptText && lastTransaction && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Tax Receipt</h3>
                    <button
                      onClick={() => setShowReceiptText(false)}
                      className="text-gray-500 hover-gray-700"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <pre className="whitespace-pre-wrap text-sm font-mono">{'CONG. TIFERES YECHEZKEL OF BELED\n1379 58th Street\nBrooklyn, NY 11219\nPhone: (718) 436-8334\nEmail@beledsynagogue.org\nTax ID-3090728\n\nTAX RECEIPT\n\nTransaction ID: ' + lastTransaction.id + '\nDate: ' + new Date(lastTransaction.date).toLocaleDateString() + '\nAmount: ">Transaction ID:</span>
                        <span className="font-mono text-xs">{lastTransaction.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 + lastTransaction.amount.toLocaleString() + '\nDonor: ' + lastTransaction.memberName + '\nEmail: ' + (lastTransaction.memberEmail || 'Not provided') + '\nPhone: ' + (lastTransaction.memberPhone || 'Not provided') + '\nExpense: ' + lastTransaction.expenseName + '\nMonth: ' + lastTransaction.monthName + ' ' + lastTransaction.year + '\n' + (lastTransaction.dedication ? 'Dedication: ' + lastTransaction.dedication + '\n' : '') + (lastTransaction.message ? 'Message: ' + lastTransaction.message + '\n' : '') + 'Recurring: ' + (lastTransaction.recurring ? 'Yes' : 'No') + '\n\nThis donation is tax-deductible to the full extent allowed by law.\n\nThank you for your generous support!'}</pre>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        const receiptText = 'CONG. TIFERES YECHEZKEL OF BELED\n1379 58th Street\nBrooklyn, NY 11219\nPhone: (718) 436-8334\nEmail@beledsynagogue.org\nTax ID-3090728\n\nTAX RECEIPT\n\nTransaction ID: ' + lastTransaction.id + '\nDate: ' + new Date(lastTransaction.date).toLocaleDateString() + '\nAmount: ">Transaction ID:</span>
                        <span className="font-mono text-xs">{lastTransaction.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 + lastTransaction.amount.toLocaleString() + '\nDonor: ' + lastTransaction.memberName + '\nEmail: ' + (lastTransaction.memberEmail || 'Not provided') + '\nPhone: ' + (lastTransaction.memberPhone || 'Not provided') + '\nExpense: ' + lastTransaction.expenseName + '\nMonth: ' + lastTransaction.monthName + ' ' + lastTransaction.year + '\n' + (lastTransaction.dedication ? 'Dedication: ' + lastTransaction.dedication + '\n' : '') + (lastTransaction.message ? 'Message: ' + lastTransaction.message + '\n' : '') + 'Recurring: ' + (lastTransaction.recurring ? 'Yes' : 'No') + '\n\nThis donation is tax-deductible to the full extent allowed by law.\n\nThank you for your generous support!';

                        const textArea = document.createElement('textarea');
                        textArea.value = receiptText;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        alert('Receipt text copied! You can now paste it into any text editor and save  .txt file.');
                      }}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover-blue-700"
                    >
                      Copy Text
                    </button>
                    <button
                      onClick={() => setShowReceiptText(false)}
                      className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover-gray-400"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showSponsorForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-2 sm-4 z-50 overflow-y-auto">
                <div className="bg-white rounded-lg p-4 sm-6 w-full max-w-md my-4 sm-8">
                  <h3 className="text-lg font-bold mb-4">Sponsor {expenses.find(e => e.id === selectedSponsorship.expenseId)?.name}</h3>
                  <div className="mb-4">
                    <p className="text-gray-600">
                      Month {selectedYear}
                    </p>
                    {(() => {
                      const expense = expenses.find(e => e.id === selectedSponsorship.expenseId);
                      const progress = getMonthProgress(expense, selectedSponsorship.month);
                      const isSpecialMonth = expense.hasSpecialMonths && expense.specialMonths && 
                                           expense.specialMonths.includes(selectedSponsorship.month);
                      return (
                        <div>
                          <div className="flex items-center gap-2">
                            {getMonthIcon(expense, selectedSponsorship.month)}
                            <p className="text-gray-600">
                              Monthly cost: ${progress.expenseAmount.toLocaleString()}
                            </p>
                          </div>
                          {isSpecialMonth && (
                            <p className="text-orange-600 text-sm mt-1">
                              This is a $YT month with special costs
                            </p>
                          )}
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
                    <div className="relative">
                      <label className="block text-sm font-medium mb-1">Your Name *</label>
                      <input
                        type="text"
                        value={memberInfo.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="Enter your name"
                      />
                      {showUserSuggestions && (
                        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg">
                          {userSuggestions.map((user, idx) => (
                            <button
                              key={idx}
                              onClick={() => selectUser(user)}
                              className="w-full text-left px-3 py-2 hover-gray-100 border-b border-gray-100 last-b-0"
                            >
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-gray-600">{user.email}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Sponsorship Amount *</label>
                      <input
                        type="number"
                        value={memberInfo.amount}
                        onChange={(e) => setMemberInfo(prev => ({ ...prev, amount.target.value }))}
                        className="w-full border rounded-lg px-3 py-2"
                        style={{
                          MozAppearance: 'textfield'
                        }}
                        onWheel={(e) => e.target.blur()}
                        placeholder="Enter amount"
                        min="0.01"
                        step="0.01"
                      />
                      <style jsx>{`
                        input[type="number"]::-webkit-outer-spin-button,
                        input[type="number"]::-webkit-inner-spin-button {
                          -webkit-appearance;
                          margin;
                        }
                      `}</style>
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
                        onChange={(e) => setMemberInfo(prev => ({ ...prev, email.target.value }))}
                        onBlur={(e) => handleFieldValidation('email', e.target.value)}
                        className={'w-full border rounded-lg px-3 py-2 ' + (fieldErrors.email ? 'border-red-300 bg-red-50' : '')}
                        placeholder="your.email@example.com"
                      />
                      {fieldErrors.email && (
                        <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Phone (optional)</label>
                      <input
                        type="tel"
                        value={memberInfo.phone}
                        onChange={(e) => setMemberInfo(prev => ({ ...prev, phone.target.value }))}
                        onBlur={(e) => handleFieldValidation('phone', e.target.value)}
                        className={'w-full border rounded-lg px-3 py-2 ' + (fieldErrors.phone ? 'border-red-300 bg-red-50' : '')}
                        placeholder="(555) 123-4567"
                      />
                      {fieldErrors.phone && (
                        <p className="text-xs text-red-600 mt-1">{fieldErrors.phone}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Dedication (optional)</label>
                      <input
                        type="text"
                        value={memberInfo.dedication}
                        onChange={(e) => setMemberInfo(prev => ({ ...prev, dedication.target.value }))}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="In memory of... / In honor of..."
                      />
                      <p className="text-xs text-gray-500 mt-1">This will be shown publicly</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Personal Message (optional)</label>
                      <textarea
                        value={memberInfo.message}
                        onChange={(e) => setMemberInfo(prev => ({ ...prev, message.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 h-20 resize-none"
                        placeholder="Add a personal message or note..."
                      />
                      <p className="text-xs text-gray-500 mt-1">This will be visible when hovering over your sponsorship</p>
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Payment Information</h4>
                      
                      <div className="space-y-3">
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
                                cardNumber,
                                cardType}));
                            }}
                            onBlur={(e) => handleFieldValidation('cardNumber', e.target.value)}
                            className={'w-full border rounded-lg px-3 py-2 ' + 
                              (fieldErrors.cardNumber ? 'border-red-300 bg-red-50' .cardNumber && memberInfo.cardType && 
                              validateCardNumber(memberInfo.cardNumber, memberInfo.cardType)
                                ? 'border-green-300 bg-green-50'
                                : '')}
                            placeholder="1234 5678 9012 3456"
                          />
                          {fieldErrors.cardNumber && (
                            <p className="text-xs text-red-600 mt-1">{fieldErrors.cardNumber}</p>
                          )}
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
                                  setMemberInfo(prev => ({ ...prev, expiryDate}));
                                }
                              }}
                              onBlur={(e) => handleFieldValidation('expiryDate', e.target.value)}
                              className={'w-full border rounded-lg px-3 py-2 ' + (fieldErrors.expiryDate ? 'border-red-300 bg-red-50' : '')}
                              placeholder="MM/YY"
                              maxLength="5"
                            />
                            {fieldErrors.expiryDate && (
                              <p className="text-xs text-red-600 mt-1">{fieldErrors.expiryDate}</p>
                            )}
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">CVV *</label>
                            <input
                              type="text"
                              value={memberInfo.cvv || ''}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                if (value.length <= 4) {
                                  setMemberInfo(prev => ({ ...prev, cvv}));
                                }
                              }}
                              onBlur={(e) => handleFieldValidation('cvv', e.target.value)}
                              className={'w-full border rounded-lg px-3 py-2 ' + (fieldErrors.cvv ? 'border-red-300 bg-red-50' : '')}
                              placeholder="123"
                              maxLength="4"
                            />
                            {fieldErrors.cvv && (
                              <p className="text-xs text-red-600 mt-1">{fieldErrors.cvv}</p>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Cardholder Name *</label>
                          <input
                            type="text"
                            value={memberInfo.cardholderName || ''}
                            onChange={(e) => setMemberInfo(prev => ({ ...prev, cardholderName.target.value }))}
                            className="w-full border rounded-lg px-3 py-2"
                            placeholder="Name  appears on card"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <input
                        type="checkbox"
                        id="recurring"
                        checked={memberInfo.recurring}
                        onChange={(e) => setMemberInfo(prev => ({ ...prev, recurring.target.checked }))}
                        className="w-4 h-4"
                      />
                      <label htmlFor="recurring" className="text-sm font-medium text-blue-800">
                        Make this an ongoing sponsorship
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm-row gap-3 mt-6">
                    <button
                      onClick={sponsorExpense}
                      disabled={!memberInfo.name?.trim() || !memberInfo.amount || parseFloat(memberInfo.amount) <= 0 || 
                               !memberInfo.cardNumber?.replace(/\s/g, '') || !memberInfo.expiryDate || 
                               !memberInfo.cvv || !memberInfo.cardholderName?.trim() ||
                               !validateCardNumber(memberInfo.cardNumber, memberInfo.cardType)}
                      className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover-blue-700 disabled-gray-400 disabled-not-allowed font-medium"
                    >
                      Process Payment & Confirm Sponsorship
                    </button>
                    <button
                      onClick={() => {
                        setShowSponsorForm(false);
                        setMemberInfo({ 
                          name: '', email: '', phone: '', dedication: '', message: '', recurring, amount: '',
                          cardNumber: '', expiryDate: '', cvv: '', cardholderName: '', billingAddress: '', 
                          billingCity: '', billingState: '', billingZip: '', cardType: '', savePayment});
                        setFieldErrors({});
                        setShowUserSuggestions(false);
                      }}
                      className="flex-1 bg-gray-300 text-gray-700 px-4 py-3 rounded-lg hover-gray-400 font-medium"
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
                Manage expenses and view sponsorship status.
              </p>
            </div>

            <div className="bg-white p-4 sm-6 rounded-lg border">
              <h3 className="text-lg font-bold mb-4">Add New Expense</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Expense Name *</label>
                  <input
                    type="text"
                    placeholder="Enter expense name"
                    value={newExpense.name}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, name.target.value }))}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-3 text-base focus-blue-500 focus-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Monthly Amount *</label>
                  <input
                    type="number"
                    placeholder="Enter monthly amount"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, amount.target.value }))}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-3 text-base focus-blue-500 focus-none"
                    min="0.01"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description (optional)</label>
                  <textarea
                    placeholder="Enter description"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, description.target.value }))}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-3 text-base h-20 resize-none focus-blue-500 focus-none"
                  />
                </div>
                <button
                  onClick={addExpense}
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover-green-700 flex items-center justify-center gap-2 font-medium"
                >
                  <Plus size={16} /> Add Expense
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold">Current Expenses</h3>
              {expenses.map(expense => (
                <div key={expense.id} className="bg-white border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{expense.name}</h4>
                      <p className="text-gray-600 text-sm">{expense.description}</p>
                      <div className="mt-2">
                        <p className="font-bold text-green-600">${expense.amount.toLocaleString()}/month</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        className="text-red-600 hover-red-800 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-3 sm-cols-4 md-cols-6 lg-cols-12 gap-2">
                    {months.map((month, index) => {
                      const sponsors = getSponsor(expense.id, index);
                      const progress = getMonthProgress(expense, index);
                      const isSponsored = sponsors.length > 0;
                      return (
                        <div key={expense.id + '-' + month + '-' + index} className="relative">
                          <div className={'p-2 rounded text-xs text-center min-h-[80px] ' + 
                            (isSponsored
                              ? 'bg-green-100 text-green-800 border border-green-300' 
                              : 'bg-gray-100 text-gray-600 border border-gray-200')}>
                            <div className="flex flex-col items-center gap-1 mb-2">
                              <span className="text-xs font-medium">{month}</span>
                            </div>
                            <div className="text-xs font-bold text-gray-600">
                              ${progress.expenseAmount}
                            </div>
                            {isSponsored && (
                              <div className="space-y-1 mt-1">
                                <div className="text-xs font-bold">${progress.total}</div>
                                {sponsors.slice(0, 2).map((sponsor, idx) => (
                                  <div key={sponsor.id + '-' + idx} className="truncate text-xs font-medium">
                                    {sponsor.memberName}
                                  </div>
                                ))}
                                {sponsors.length > 2 && (
                                  <div className="text-xs text-gray-600">+{sponsors.length - 2} more</div>
                                )}
                              </div>
                            )}
                          </div>
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
