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
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    amount: '',
    dedication: '',
    message: '',
    recurring: false,
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: '',
    billingAddress: '',
    city: '',
    state: '',
    zipCode: ''
  });

  const [newExpense, setNewExpense] = useState({
    name: '',
    amount: '',
    description: '',
    isHighPriority: false
  });

  const months = [
    'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar',
    'Nissan', 'Iyar', 'Sivan', 'Tammuz', 'Av', 'Elul'
  ];

  const seasonIcons = {
    'Tishrei': Leaf, 'Cheshvan': Leaf, 'Kislev': Snowflake,
    'Tevet': Snowflake, 'Shevat': Snowflake, 'Adar': Flower,
    'Nissan': Flower, 'Iyar': Flower, 'Sivan': Sun,
    'Tammuz': Sun, 'Av': Sun, 'Elul': Leaf
  };

  const printRef = useRef();

  // Firebase data loading
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load expenses
        const expensesRef = collection(db, 'expenses');
        const expensesQuery = query(expensesRef, orderBy('order', 'asc'));
        const expensesSnapshot = await getDocs(expensesQuery);
        
        if (expensesSnapshot.empty) {
          // Create default expenses
          const defaultExpenses = [
            { name: 'Mortgage Payment', amount: 1500, description: 'Monthly mortgage payment for the synagogue building', isHighPriority: true, order: 1 },
            { name: 'Electricity Bill', amount: 600, description: 'Monthly electricity for lighting, heating, and cooling', isHighPriority: false, order: 2 },
            { name: 'Cleaning Services', amount: 400, description: 'Professional cleaning service for the sanctuary and social hall', isHighPriority: false, order: 3 },
            { name: 'Coffee & Refreshments', amount: 300, description: 'Weekly coffee and light refreshments after services', isHighPriority: false, order: 4 },
            { name: 'Security System', amount: 200, description: 'Monthly security monitoring and maintenance', isHighPriority: true, order: 5 },
            { name: 'Ner Tamid', amount: 175, description: 'Monthly garden and grounds maintenance', isHighPriority: false, order: 6 },
            { name: 'Gas Bill', amount: 400, description: 'Monthly natural gas for heating and kitchen', isHighPriority: false, order: 7 }
          ];
          
          for (const expense of defaultExpenses) {
            await addDoc(collection(db, 'expenses'), expense);
          }
        }

        // Real-time listener for expenses
        const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
          const expensesData = [];
          snapshot.forEach((doc) => {
            expensesData.push({ id: doc.id, ...doc.data() });
          });
          setExpenses(expensesData);
        });

        // Real-time listener for sponsorships
        const sponsorshipsRef = collection(db, 'sponsorships');
        const unsubscribeSponsorships = onSnapshot(sponsorshipsRef, (snapshot) => {
          const sponsorshipsData = [];
          snapshot.forEach((doc) => {
            sponsorshipsData.push({ id: doc.id, ...doc.data() });
          });
          setSponsorships(sponsorshipsData);
        });

        setLoading(false);

        return () => {
          unsubscribeExpenses();
          unsubscribeSponsorships();
        };
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Validation functions
  const validateCardNumber = (cardNumber) => {
    const cleaned = cardNumber.replace(/\s/g, '');
    const patterns = {
      visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
      mastercard: /^5[1-5][0-9]{14}$/,
      amex: /^3[47][0-9]{13}$/,
      discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/
    };
    
    return Object.values(patterns).some(pattern => pattern.test(cleaned));
  };

  const validateExpiryDate = (expiry) => {
    const [month, year] = expiry.split('/');
    if (!month || !year) return false;
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;
    
    const expMonth = parseInt(month);
    const expYear = parseInt(year);
    
    if (expMonth < 1 || expMonth > 12) return false;
    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) return false;
    
    return true;
  };

  const validateZipCode = (zip) => {
    return /^\d{5}(-\d{4})?$/.test(zip);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name || formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.phone || formData.phone.length < 10) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    
    if (!validateCardNumber(formData.cardNumber)) {
      newErrors.cardNumber = 'Please enter a valid card number';
    }
    
    if (!validateExpiryDate(formData.expiryDate)) {
      newErrors.expiryDate = 'Invalid or expired date';
    }
    
    if (!formData.cvv || (formData.cvv.length < 3 || formData.cvv.length > 4)) {
      newErrors.cvv = 'Please enter a valid CVV';
    }
    
    if (!formData.cardName || formData.cardName.length < 2) {
      newErrors.cardName = 'Please enter the name on card';
    }
    
    if (!formData.billingAddress || formData.billingAddress.length < 5) {
      newErrors.billingAddress = 'Please enter a valid address';
    }
    
    if (!formData.city || formData.city.length < 2) {
      newErrors.city = 'Please enter a valid city';
    }
    
    if (!formData.state || formData.state.length < 2) {
      newErrors.state = 'Please enter a valid state';
    }
    
    if (!validateZipCode(formData.zipCode)) {
      newErrors.zipCode = 'Please enter a valid ZIP code';
    }

    // Check if amount exceeds remaining balance
    if (selectedExpense && selectedMonth !== null) {
      const sponsorshipsForMonth = sponsorships.filter(s => 
        s.expenseId === selectedExpense.id && 
        s.monthIndex === selectedMonth && 
        s.year === selectedYear
      );
      const totalSponsored = sponsorshipsForMonth.reduce((sum, s) => sum + s.amount, 0);
      const remaining = selectedExpense.amount - totalSponsored;
      
      if (parseFloat(formData.amount) > remaining) {
        newErrors.amount = `Amount cannot exceed remaining balance of $${remaining}`;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getFieldClassName = (fieldName) => {
    const hasError = errors[fieldName];
    const hasValue = formData[fieldName];
    
    let baseClass = "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ";
    
    if (hasError) {
      baseClass += "border-red-500 bg-red-50";
    } else if (hasValue) {
      baseClass += "border-green-500 bg-green-50";
    } else {
      baseClass += "border-gray-300";
    }
    
    return baseClass;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Save sponsorship to Firebase
      const sponsorshipData = {
        expenseId: selectedExpense.id,
        expenseName: selectedExpense.name,
        memberName: formData.name,
        memberEmail: formData.email,
        memberPhone: formData.phone,
        amount: parseFloat(formData.amount),
        monthIndex: selectedMonth,
        year: selectedYear,
        dedication: formData.dedication,
        message: formData.message,
        recurring: formData.recurring,
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'sponsorships'), sponsorshipData);
      
      setConfirmationData({
        ...sponsorshipData,
        month: months[selectedMonth]
      });
      setShowConfirmation(true);
      setSelectedExpense(null);
      setSelectedMonth(null);
      setFormData({
        name: '', email: '', phone: '', amount: '', dedication: '', message: '', recurring: false,
        cardNumber: '', expiryDate: '', cvv: '', cardName: '', billingAddress: '', city: '', state: '', zipCode: ''
      });
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('There was an error processing your payment. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      const maxOrder = expenses.length > 0 ? Math.max(...expenses.map(e => e.order || 0)) : 0;
      const expenseData = {
        ...newExpense,
        amount: parseFloat(newExpense.amount),
        order: maxOrder + 1
      };
      
      await addDoc(collection(db, 'expenses'), expenseData);
      
      setNewExpense({ name: '', amount: '', description: '', isHighPriority: false });
      setShowAddExpense(false);
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Error adding expense. Please try again.');
    }
  };

  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    try {
      const expenseRef = doc(db, 'expenses', editingExpense.id);
      await updateDoc(expenseRef, {
        name: editingExpense.name,
        amount: parseFloat(editingExpense.amount),
        description: editingExpense.description,
        isHighPriority: editingExpense.isHighPriority
      });
      
      setIsEditing(false);
      setEditingExpense(null);
    } catch (error) {
      console.error('Error updating expense:', error);
      alert('Error updating expense. Please try again.');
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteDoc(doc(db, 'expenses', expenseId));
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Error deleting expense. Please try again.');
      }
    }
  };

  const handleRemoveSponsorship = async (sponsorship) => {
    const confirmMessage = `Remove ${sponsorship.memberName}'s $${sponsorship.amount} sponsorship?${sponsorship.dedication ? `\nDedication: ${sponsorship.dedication}` : ''}`;
    
    if (window.confirm(confirmMessage)) {
      try {
        await deleteDoc(doc(db, 'sponsorships', sponsorship.id));
      } catch (error) {
        console.error('Error removing sponsorship:', error);
        alert('Error removing sponsorship. Please try again.');
      }
    }
  };

  const getSponsorshipsForExpenseAndMonth = (expenseId, monthIndex) => {
    return sponsorships.filter(s => 
      s.expenseId === expenseId && 
      s.monthIndex === monthIndex && 
      s.year === selectedYear
    );
  };

  const getTotalSponsoredForExpenseAndMonth = (expenseId, monthIndex) => {
    const monthSponsorships = getSponsorshipsForExpenseAndMonth(expenseId, monthIndex);
    return monthSponsorships.reduce((sum, s) => sum + s.amount, 0);
  };

  const getMonthlyData = () => {
    const monthlyData = [];
    
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const monthExpenses = expenses.map(expense => {
        const sponsored = getTotalSponsoredForExpenseAndMonth(expense.id, monthIndex);
        const remaining = expense.amount - sponsored;
        const percentage = expense.amount > 0 ? (sponsored / expense.amount) * 100 : 0;
        
        return {
          ...expense,
          sponsored,
          remaining,
          percentage
        };
      });
      
      const totalBudget = expenses.reduce((sum, e) => sum + e.amount, 0);
      const totalSponsored = monthExpenses.reduce((sum, e) => sum + e.sponsored, 0);
      const totalRemaining = totalBudget - totalSponsored;
      const overallPercentage = totalBudget > 0 ? (totalSponsored / totalBudget) * 100 : 0;
      
      monthlyData.push({
        month: months[monthIndex],
        monthIndex,
        expenses: monthExpenses,
        totalBudget,
        totalSponsored,
        totalRemaining,
        overallPercentage
      });
    }
    
    return monthlyData;
  };

  const getCurrentMonthData = () => {
    if (selectedMonth === null) return null;
    const monthlyData = getMonthlyData();
    return monthlyData[selectedMonth];
  };

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\s/g, '');
    const match = cleaned.match(/\d{4}/g);
    return match ? match.join(' ').substr(0, 19) : cleaned.substr(0, 16);
  };

  const formatExpiryDate = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const printReceipt = () => {
    const printContent = printRef.current;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Tax Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .receipt { max-width: 600px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            .content { line-height: 1.6; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Beled Expense Sponsorship</h1>
          <p className="text-lg text-gray-600">Hebrew Year {selectedYear}</p>
          
          <div className="flex justify-center gap-4 mt-6">
            <button
              onClick={() => setCurrentView('member')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'member' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <User className="inline-block w-4 h-4 mr-2" />
              Member View
            </button>
            <button
              onClick={() => setCurrentView('admin')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'admin' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Settings className="inline-block w-4 h-4 mr-2" />
              Admin View
            </button>
          </div>
        </div>

        {currentView === 'member' && (
          <div className="space-y-8">
            {!selectedExpense && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Monthly Expenses</h2>
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
                              <p key={index} className="text-gray-600 text-sm">{line}</p>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-800">${expense.amount}</div>
                          <div className="text-sm text-gray-500">per month</div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setSelectedExpense(expense)}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Calendar className="inline-block w-4 h-4 mr-2" />
                        Choose Month to Sponsor
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedExpense && selectedMonth === null && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Select Month for {selectedExpense.name}
                  </h2>
                  <button
                    onClick={() => setSelectedExpense(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {months.map((month, index) => {
                    const IconComponent = seasonIcons[month];
                    const sponsored = getTotalSponsoredForExpenseAndMonth(selectedExpense.id, index);
                    const remaining = selectedExpense.amount - sponsored;
                    const percentage = selectedExpense.amount > 0 ? (sponsored / selectedExpense.amount) * 100 : 0;
                    
                    return (
                      <div
                        key={month}
                        onClick={() => remaining > 0 ? setSelectedMonth(index) : null}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          remaining > 0 
                            ? 'hover:shadow-md hover:border-blue-400 border-gray-200' 
                            : 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-800">{month}</h3>
                          <IconComponent className="w-5 h-5 text-blue-600" />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Budget:</span>
                            <span className="font-medium">${selectedExpense.amount}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Sponsored:</span>
                            <span className="font-medium text-green-600">${sponsored}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Remaining:</span>
                            <span className="font-medium text-red-600">${remaining}</span>
                          </div>
                          
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          
                          <div className="text-center text-xs text-gray-500">
                            {percentage === 100 ? 'Fully Sponsored' : `${percentage.toFixed(0)}% Sponsored`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedExpense && selectedMonth !== null && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Sponsor {selectedExpense.name} for {months[selectedMonth]}
                  </h2>
                  <button
                    onClick={() => setSelectedMonth(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className={getFieldClassName('name')}
                        placeholder="Enter your full name"
                      />
                      {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={getFieldClassName('email')}
                        placeholder="Enter your email"
                      />
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className={getFieldClassName('phone')}
                        placeholder="(555) 123-4567"
                      />
                      {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sponsorship Amount *
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          max={selectedExpense.amount - getTotalSponsoredForExpenseAndMonth(selectedExpense.id, selectedMonth)}
                          value={formData.amount}
                          onChange={(e) => handleInputChange('amount', e.target.value)}
                          className={`${getFieldClassName('amount')} pl-10`}
                          placeholder="0.00"
                        />
                      </div>
                      {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
                      <p className="text-xs text-gray-500 mt-1">
                        Remaining: ${(selectedExpense.amount - getTotalSponsoredForExpenseAndMonth(selectedExpense.id, selectedMonth)).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dedication (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.dedication}
                      onChange={(e) => handleInputChange('dedication', e.target.value)}
                      className={getFieldClassName('dedication')}
                      placeholder="In memory of... / In honor of..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Personal Message (Optional)
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => handleInputChange('message', e.target.value)}
                      className={getFieldClassName('message')}
                      placeholder="Add a personal message..."
                      rows="3"
                    ></textarea>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="recurring"
                      checked={formData.recurring}
                      onChange={(e) => handleInputChange('recurring', e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor="recurring" className="text-sm text-gray-700">
                      Make this an ongoing sponsorship
                    </label>
                  </div>

                  {/* Payment Information */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Card Number *
                        </label>
                        <input
                          type="text"
                          value={formData.cardNumber}
                          onChange={(e) => handleInputChange('cardNumber', formatCardNumber(e.target.value))}
                          className={getFieldClassName('cardNumber')}
                          placeholder="1234 5678 9012 3456"
                          maxLength="19"
                        />
                        {errors.cardNumber && <p className="text-red-500 text-xs mt-1">{errors.cardNumber}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Name on Card *
                        </label>
                        <input
                          type="text"
                          value={formData.cardName}
                          onChange={(e) => handleInputChange('cardName', e.target.value)}
                          className={getFieldClassName('cardName')}
                          placeholder="John Doe"
                        />
                        {errors.cardName && <p className="text-red-500 text-xs mt-1">{errors.cardName}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expiry Date *
                        </label>
                        <input
                          type="text"
                          value={formData.expiryDate}
                          onChange={(e) => handleInputChange('expiryDate', formatExpiryDate(e.target.value))}
                          className={getFieldClassName('expiryDate')}
                          placeholder="MM/YY"
                          maxLength="5"
                        />
                        {errors.expiryDate && <p className="text-red-500 text-xs mt-1">{errors.expiryDate}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CVV *
                        </label>
                        <input
                          type="text"
                          value={formData.cvv}
                          onChange={(e) => handleInputChange('cvv', e.target.value.replace(/\D/g, ''))}
                          className={getFieldClassName('cvv')}
                          placeholder="123"
                          maxLength="4"
                        />
                        {errors.cvv && <p className="text-red-500 text-xs mt-1">{errors.cvv}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Billing Address */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Billing Address</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Street Address *
                        </label>
                        <input
                          type="text"
                          value={formData.billingAddress}
                          onChange={(e) => handleInputChange('billingAddress', e.target.value)}
                          className={getFieldClassName('billingAddress')}
                          placeholder="123 Main Street"
                        />
                        {errors.billingAddress && <p className="text-red-500 text-xs mt-1">{errors.billingAddress}</p>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            City *
                          </label>
                          <input
                            type="text"
                            value={formData.city}
                            onChange={(e) => handleInputChange('city', e.target.value)}
                            className={getFieldClassName('city')}
                            placeholder="New York"
                          />
                          {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            State *
                          </label>
                          <input
                            type="text"
                            value={formData.state}
                            onChange={(e) => handleInputChange('state', e.target.value)}
                            className={getFieldClassName('state')}
                            placeholder="NY"
                          />
                          {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ZIP Code *
                          </label>
                          <input
                            type="text"
                            value={formData.zipCode}
                            onChange={(e) => handleInputChange('zipCode', e.target.value)}
                            className={getFieldClassName('zipCode')}
                            placeholder="12345"
                          />
                          {errors.zipCode && <p className="text-red-500 text-xs mt-1">{errors.zipCode}</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Error Summary */}
                  {Object.keys(errors).length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h4>
                      <ul className="list-disc list-inside text-sm text-red-700">
                        {Object.values(errors).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || Object.keys(errors).length > 0}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                      isSubmitting || Object.keys(errors).length > 0
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                        Processing Payment...
                      </>
                    ) : (
                      'Process Payment & Confirm Sponsorship'
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {currentView === 'admin' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Expense Management</h2>
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="inline-block w-4 h-4 mr-2" />
                  Add Expense
                </button>
              </div>

              <div className="grid gap-4">
                {expenses.map(expense => (
                  <div key={expense.id} className={`p-4 border rounded-lg ${expense.isHighPriority ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-800">{expense.name}</h3>
                          {expense.isHighPriority && <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">Priority</span>}
                        </div>
                        <p className="text-gray-600 text-sm mb-2">{expense.description}</p>
                        <p className="text-lg font-bold text-gray-800">${expense.amount}/month</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingExpense(expense);
                            setIsEditing(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 p-1"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Monthly Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getMonthlyData().map((monthData, index) => {
                  const IconComponent = seasonIcons[monthData.month];
                  return (
                    <div key={monthData.month} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-800">{monthData.month}</h3>
                        <IconComponent className="w-5 h-5 text-blue-600" />
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total Budget:</span>
                          <span className="font-medium">${monthData.totalBudget}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Sponsored:</span>
                          <span className="font-medium text-green-600">${monthData.totalSponsored}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Remaining:</span>
                          <span className="font-medium text-red-600">${monthData.totalRemaining}</span>
                        </div>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${monthData.overallPercentage}%` }}
                        ></div>
                      </div>

                      <div className="text-center text-xs text-gray-500 mb-4">
                        {monthData.overallPercentage.toFixed(0)}% Sponsored
                      </div>

                      {/* Sponsorships for this month */}
                      <div className="space-y-2">
                        {monthData.expenses.map(expense => {
                          const expenseSponsorships = getSponsorshipsForExpenseAndMonth(expense.id, index);
                          return expenseSponsorships.map(sponsorship => (
                            <div key={sponsorship.id} className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-800 truncate" title={`${sponsorship.memberName} - ${expense.name}`}>
                                  {sponsorship.memberName}
                                </div>
                                <div className="text-gray-600 truncate" title={expense.name}>
                                  {expense.name} (${sponsorship.amount})
                                </div>
                                {sponsorship.dedication && (
                                  <div className="text-gray-500 truncate" title={sponsorship.dedication}>
                                    {sponsorship.dedication}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => handleRemoveSponsorship(sponsorship)}
                                className="text-red-600 hover:text-red-800 ml-2 p-1 flex-shrink-0"
                                title={`Remove ${sponsorship.memberName}'s ${sponsorship.amount} sponsorship${sponsorship.dedication ? ` - ${sponsorship.dedication}` : ''}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ));
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Add Expense Modal */}
        {showAddExpense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Add New Expense</h3>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expense Name</label>
                  <input
                    type="text"
                    value={newExpense.name}
                    onChange={(e) => setNewExpense({...newExpense, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="newExpenseHighPriority"
                    checked={newExpense.isHighPriority}
                    onChange={(e) => setNewExpense({...newExpense, isHighPriority: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="newExpenseHighPriority" className="text-sm text-gray-700">
                    High Priority
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Add Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddExpense(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Expense Modal */}
        {isEditing && editingExpense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Edit Expense</h3>
              <form onSubmit={handleUpdateExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expense Name</label>
                  <input
                    type="text"
                    value={editingExpense.name}
                    onChange={(e) => setEditingExpense({...editingExpense, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingExpense.amount}
                    onChange={(e) => setEditingExpense({...editingExpense, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={editingExpense.description}
                    onChange={(e) => setEditingExpense({...editingExpense, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="editExpenseHighPriority"
                    checked={editingExpense.isHighPriority}
                    onChange={(e) => setEditingExpense({...editingExpense, isHighPriority: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="editExpenseHighPriority" className="text-sm text-gray-700">
                    High Priority
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Update Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditingExpense(null);
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmation && confirmationData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Sponsorship Confirmed!</h3>
                <p className="text-gray-600 mb-4">
                  Thank you for sponsoring {confirmationData.expenseName} for {confirmationData.month}
                </p>
                
                <div className="bg-gray-50 p-4 rounded-lg text-left mb-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Sponsorship Details:</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Sponsor:</span>
                      <span className="font-medium">{confirmationData.memberName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="font-medium">${confirmationData.amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Month:</span>
                      <span className="font-medium">{confirmationData.month} {selectedYear}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Recurring:</span>
                      <span className="font-medium">{confirmationData.recurring ? 'Yes' : 'No'}</span>
                    </div>
                    {confirmationData.dedication && (
                      <div className="flex justify-between">
                        <span>Dedication:</span>
                        <span className="font-medium">{confirmationData.dedication}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="hidden">
                  <div ref={printRef} className="receipt">
                    <div className="header">
                      <h2>Beled Synagogue</h2>
                      <h3>Tax Deductible Receipt</h3>
                      <p>Tax ID: 12-3456789</p>
                    </div>
                    <div className="content">
                      <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                      <p><strong>Donor:</strong> {confirmationData.memberName}</p>
                      <p><strong>Amount:</strong> ${confirmationData.amount}</p>
                      <p><strong>Purpose:</strong> Sponsorship of {confirmationData.expenseName}</p>
                      <p><strong>Month:</strong> {confirmationData.month} {selectedYear}</p>
                      <p><strong>Recurring:</strong> {confirmationData.recurring ? 'Yes' : 'No'}</p>
                      {confirmationData.dedication && (
                        <p><strong>Dedication:</strong> {confirmationData.dedication}</p>
                      )}
                      <p><strong>Reference ID:</strong> {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                    </div>
                    <div className="footer">
                      <p>This receipt serves as proof of your tax-deductible contribution.</p>
                      <p>No goods or services were provided in exchange for this contribution.</p>
                      <p>Please retain this receipt for your tax records.</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={printReceipt}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Print Receipt
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmation(false);
                      setConfirmationData(null);
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SynagogueExpenseApp;
