import React, { useState, useRef, useEffect } from 'react';
import { Calendar, DollarSign, User, Settings, Plus, Trash2, Edit3, Check, X, Snowflake, Sun, Flower, Leaf } from 'lucide-react';

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
    cardNumber: '', expiryDate: '', cvv: '', cardholderName: '', cardType: ''
  });
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [showReceiptText, setShowReceiptText] = useState(false);
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
          recurring: memberInfo.recurring,
          dedication: memberInfo.dedication?.trim() || '',
          message: memberInfo.message?.trim() || ''
        });
        return newSponsorships;
      });
      
      setShowSponsorForm(false);
      setShowPaymentConfirmation(true);
      setSelectedSponsorship({ expenseId: null, month: null });
      
      setMemberInfo({ 
        name: '', email: '', phone: '', dedication: '', message: '', recurring: true, amount: '',
        cardNumber: '', expiryDate: '', cvv: '', cardholderName: '', cardType: ''
      });
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
                        {expense.description.split('\n').map((line, index) => (
                          <p key={index} className={`text-sm ${
                            index === 0 ? 'text-gray-600' : 
                            'text-blue-700 font-semibold'
                          }`}>{line}</p>
                        ))}
                      </div>
                      <div className="text-xl font-bold text-green-600 mt-2">
                        {expense.isFlexible || expense.hasSpecialMonths ? 'Variable amounts' : `$${expense.amount.toLocaleString()}/month`}
                      </div>
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
                                    <div key={`${sponsor.id}-${idx}`} className="truncate">
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
                    <p className="text-gray-600">Your sponsorship has been confirmed.</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Transaction ID:</span>
                        <span className="font-mono text-xs">{lastTransaction.id}</span>
                      </div>
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
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowReceiptText(true)}
                      className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      <DollarSign size={16} />
                      Get Tax Receipt
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

            {showReceiptText && lastTransaction && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Tax Receipt</h3>
                    <button
                      onClick={() => setShowReceiptText(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <pre className="whitespace-pre-wrap text-sm font-mono">{`CONG. TIFERES YECHEZKEL OF BELED - Tax Receipt

Transaction ID: ${lastTransaction.id}
Date: ${new Date(lastTransaction.date).toLocaleDateString()}
Amount: $${lastTransaction.amount.toLocaleString()}
Donor: ${lastTransaction.memberName}
Email: ${lastTransaction.memberEmail || 'Not provided'}
Phone: ${lastTransaction.memberPhone || 'Not provided'}
Expense: ${lastTransaction.expenseName}
Month: ${lastTransaction.monthName} ${lastTransaction.year}
${lastTransaction.dedication ? `Dedication: ${lastTransaction.dedication}` : ''}
${lastTransaction.message ? `Message: ${lastTransaction.message}` : ''}
Recurring: ${lastTransaction.recurring ? 'Yes' : 'No'}

This donation is tax-deductible to the full extent allowed by law.
Tax ID: 11-3090728

Thank you for your generous support!

Cong. Tiferes Yechezkel of Beled
1379 58th Street
Brooklyn, NY 11219
Phone: (718) 436-8334
Email: info@beledsynagogue.org`}</pre>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        const receiptText = `CONG. TIFERES YECHEZKEL OF BELED - Tax Receipt

Transaction ID: ${lastTransaction.id}
Date: ${new Date(lastTransaction.date).toLocaleDateString()}
Amount: $${lastTransaction.amount.toLocaleString()}
Donor: ${lastTransaction.memberName}
Email: ${lastTransaction.memberEmail || 'Not provided'}
Phone: ${lastTransaction.memberPhone || 'Not provided'}
Expense: ${lastTransaction.expenseName}
Month: ${lastTransaction.monthName} ${lastTransaction.year}
${lastTransaction.dedication ? `Dedication: ${lastTransaction.dedication}` : ''}
${lastTransaction.message ? `Message: ${lastTransaction.message}` : ''}
Recurring: ${lastTransaction.recurring ? 'Yes' : 'No'}

This donation is tax-deductible to the full extent allowed by law.
Tax ID: 11-3090728

Thank you for your generous support!

Cong. Tiferes Yechezkel of Beled
1379 58th Street
Brooklyn, NY 11219
Phone: (718) 436-8334
Email: info@beledsynagogue.org`;

                        const textArea = document.createElement('textarea');
                        textArea.value = receiptText;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        alert('Receipt text copied! You can now paste it into any text editor and save as a .txt file.');
                      }}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Copy Text
                    </button>
                    <button
                      onClick={() => setShowReceiptText(false)}
                      className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                    >
                      Close
                    </button>
                  </div>
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
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="Enter amount"
                        min="0.01"
                        step="0.01"
                      />
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
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Personal Message (optional)</label>
                      <textarea
                        value={memberInfo.message}
                        onChange={(e) => setMemberInfo(prev => ({ ...prev, message: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 h-20 resize-none"
                        placeholder="Add a personal message or note..."
                      />
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
                                cardNumber: formattedValue,
                                cardType: cardType
                              }));
                            }}
                            className="w-full border rounded-lg px-3 py-2"
                            placeholder="1234 5678 9012 3456"
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
                                if (value.length <= 4) {
                                  setMemberInfo(prev => ({ ...prev, cvv: value }));
                                }
                              }}
                              className="w-full border rounded-lg px-3 py-2"
                              placeholder="123"
                              maxLength="4"
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
                               !memberInfo.cvv || !memberInfo.cardholderName?.trim()}
                      className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                    >
                      Process Payment & Confirm Sponsorship
                    </button>
                    <button
                      onClick={() => {
                        setShowSponsorForm(false);
                        setMemberInfo({ 
                          name: '', email: '', phone: '', dedication: '', message: '', recurring: true, amount: '',
                          cardNumber: '', expiryDate: '', cvv: '', cardholderName: '', cardType: ''
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
                Manage expenses and view sponsorship status.
              </p>
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
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-3 text-base focus:border-blue-500 focus:outline-none"
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
                <button
                  onClick={addExpense}
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 font-medium"
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
                  className="bg-white border rounded-lg p-4"
                >
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
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
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
                              <span className="text-xs font-medium">{month}</span>
                            </div>
                            <div className="text-xs font-bold text-gray-600">
                              ${progress.expenseAmount}
                            </div>
                            {isSponsored && (
                              <div className="space-y-1 mt-1">
                                <div className="text-xs font-bold">${progress.total}</div>
                                {sponsors.slice(0, 2).map((sponsor, idx) => (
                                  <div key={`${sponsor.id}-${idx}`} className="truncate text-xs font-medium">
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
