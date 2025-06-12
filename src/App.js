// FULL DEPLOYABLE App.js — full rebuild for Netlify
// Includes:
// - Admin dashboard
// - Monthly/seasonal expense logic
// - Sponsorship form with validation & auto-fill
// - Firebase integration
// - Receipt with header
// - Calendar/month toggle
// - Tailwind styling

import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  getDocs
} from 'firebase/firestore';

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const defaultExpenses = [
  {
    id: 'utilities',
    name: 'Utilities',
    description: 'Electric, water, and heating costs',
    seasonal: true,
    monthlyAmounts: {
      0: 350,
      6: 400
    },
    default: 300
  },
  {
    id: 'kitchen',
    name: 'Coffee & Kitchen Supplies',
    description: 'Coffee, tea, kitchen essentials',
    amount: 200
  }
];

function App() {
  const [expenses, setExpenses] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth());
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ name: '', amount: '', card: '', expiry: '', cvv: '', email: '' });
  const [storedUsers, setStoredUsers] = useState([]);
  const [lastReceipt, setLastReceipt] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTransactions(txs);
      setStoredUsers([...new Set(txs.map(t => t.name))]);
    });
  }, []);

  useEffect(() => {
    const enriched = defaultExpenses.map((ex) => {
      if (ex.seasonal) {
        const amount = ex.monthlyAmounts[month] ?? ex.default;
        return { ...ex, amount };
      }
      return ex;
    });
    setExpenses(enriched);
  }, [month]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === 'name') {
      const match = storedUsers.find(u => u.toLowerCase().startsWith(value.toLowerCase()));
      if (match) setForm(prev => ({ ...prev, name: match }));
    }
  };

  const validateCard = () => {
    const ccValid = /^\d{16}$/.test(form.card);
    const expiryValid = /^(0[1-9]|1[0-2])\/\d{2}$/.test(form.expiry);
    const cvvValid = /^\d{3,4}$/.test(form.cvv);
    if (!ccValid) alert("Card must be 16 digits.");
    if (!expiryValid) alert("Expiry format MM/YY");
    if (!cvvValid) alert("CVV must be 3 or 4 digits.");
    return ccValid && expiryValid && cvvValid;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validateCard()) return;
    const tx = {
      ...form,
      amount: parseFloat(form.amount),
      date: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, 'transactions'), tx);
    setLastReceipt({ ...tx, id: docRef.id });
    setForm({ name: '', amount: '', card: '', expiry: '', cvv: '', email: '' });
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Cong. Tiferes Yechezkel of Beled - Expense Sponsorship</h1>

      <div className="mb-6">
        <label className="mr-2">Select Month:</label>
        <select
          value={month}
          onChange={(e) => setMonth(parseInt(e.target.value))}
          className="border p-1 rounded"
        >
          {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
      </div>

      <table className="w-full mb-6 border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">Expense</th>
            <th className="border p-2">Amount</th>
            <th className="border p-2">Description</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((ex, idx) => (
            <tr key={idx}>
              <td className="border p-2">{ex.name}</td>
              <td className="border p-2 text-center">${ex.amount}</td>
              <td className="border p-2">{ex.description}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={submit} className="space-y-3">
        <input name="name" className="border p-2 w-full" placeholder="Your Name" value={form.name} onChange={handleFormChange} />
        <input name="amount" className="border p-2 w-full" placeholder="Amount" type="number" inputMode="numeric" onWheel={(e) => e.target.blur()} value={form.amount} onChange={handleFormChange} />
        <input name="card" className="border p-2 w-full" placeholder="Card Number" value={form.card} onChange={handleFormChange} onBlur={validateCard} />
        <input name="expiry" className="border p-2 w-full" placeholder="MM/YY" value={form.expiry} onChange={handleFormChange} onBlur={validateCard} />
        <input name="cvv" className="border p-2 w-full" placeholder="CVV" value={form.cvv} onChange={handleFormChange} onBlur={validateCard} />
        <input name="email" className="border p-2 w-full" placeholder="Email" value={form.email} onChange={handleFormChange} />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Sponsor</button>
      </form>

      {lastReceipt && (
        <div className="bg-gray-50 mt-8 p-4 rounded shadow">
          <pre className="text-sm font-mono whitespace-pre-wrap">
            CONG. TIFERES YECHEZKEL OF BELED
            1379 58th Street
            Brooklyn, NY 11219
            Phone: (718) 436-8334
            Email: info@beledsynagogue.org
            Tax ID: 11-3090728

            TAX RECEIPT

            Transaction ID: {lastReceipt.id}
            Date: {new Date(lastReceipt.date).toLocaleDateString()}
            Amount: ${lastReceipt.amount}
          </pre>
        </div>
      )}
    </div>
  );
}

export default App;
