import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Car, Zap, Utensils, Trash2, Plus } from 'lucide-react';

export default function CarbonFootprint() {
   const [history, setHistory] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [showModal, setShowModal] = useState(false);
   const { token } = useAuth();
   
   // Form State
   const [category, setCategory] = useState('Transport');
   const [value, setValue] = useState('');
   const [desc, setDesc] = useState('');

   const COLORS = ['#16a34a', '#2563eb', '#ea580c', '#9333ea'];

   useEffect(() => {
      fetchHistory();
   }, []);

   const fetchHistory = async () => {
      try {
         const res = await axios.get('/api/carbon/history', { headers: { Authorization: `Bearer ${token}` } });
         setHistory(res.data);
      } catch (err) {
         console.error(err);
      } finally {
         setLoading(false);
      }
   };

   const handleAdd = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
         await axios.post('/api/carbon/add', { category, value: Number(value), description: desc }, {
            headers: { Authorization: `Bearer ${token}` }
         });
         setShowModal(false);
         setValue('');
         setDesc('');
         fetchHistory();
      } catch (err) {
         console.error(err);
      }
   };

   // Aggregate data for charts
   const pieData = ['Transport', 'Energy', 'Diet', 'Waste'].map(cat => ({
       name: cat,
       value: history.filter(h => h.category === cat).reduce((sum, curr) => sum + curr.value, 0)
   })).filter(d => d.value > 0);

   const barData = history.slice(0, 10).reverse().map(h => ({
       name: new Date(h.date).toLocaleDateString(),
       amount: h.value
   }));

   const totalFootprint = history.reduce((sum, h) => sum + h.value, 0).toFixed(1);

   return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
       <div className="flex justify-between items-end">
         <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Carbon Footprint Tracker</h1>
            <p className="text-slate-400 mt-1">Track and reduce your environmental impact.</p>
         </div>
         <button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold flex items-center shadow-md shadow-emerald-200/50 transition-colors">
            <Plus className="h-5 w-5 mr-1" /> Add Entry
         </button>
       </div>

       {loading ? (
          <div className="text-center py-20 text-slate-400">Loading data...</div>
       ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-1 border border-emerald-500 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-6 shadow-lg shadow-emerald-200/50 flex flex-col justify-center items-center">
                 <h2 className="text-emerald-100 font-bold mb-2 uppercase tracking-widest text-xs">Total Footprint</h2>
                 <div className="text-6xl font-black">{totalFootprint}</div>
                 <div className="text-emerald-200 mt-2 font-medium text-sm">kg CO2 Equivalent</div>
             </div>

             <div className="lg:col-span-2 border border-slate-100 rounded-3xl bg-white p-6 shadow-sm">
                 <h3 className="text-sm font-bold text-slate-800 mb-4 tracking-tight">Footprint by Category</h3>
                 <div className="h-64">
                    {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(val) => `${val} kg CO2`} />
                          </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data recorded yet</div>
                    )}
                 </div>
             </div>

             <div className="lg:col-span-3 border border-slate-100 rounded-3xl bg-white p-6 shadow-sm">
                 <h3 className="text-sm font-bold text-slate-800 mb-4 tracking-tight">Recent Activity Logs</h3>
                 <div className="h-64 w-full">
                     {barData.length > 0 ? (
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}kg`} />
                              <Tooltip cursor={{fill: 'transparent'}} />
                              <Bar dataKey="amount" fill="#10b981" radius={[8, 8, 0, 0]} />
                            </BarChart>
                         </ResponsiveContainer>
                     ) : (
                         <div className="h-full flex items-center justify-center text-slate-400 text-sm">No activity recorded yet</div>
                     )}
                 </div>
             </div>
          </div>
       )}

       {/* Add Modal */}
       {showModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl max-w-md w-full p-8 shadow-xl">
                 <h2 className="text-lg font-bold text-slate-800 mb-6">Log Carbon Activity</h2>
                 <form onSubmit={handleAdd} className="space-y-4">
                    <div>
                       <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Category</label>
                       <select value={category} onChange={e => setCategory(e.target.value)} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border bg-slate-50 text-slate-800">
                          <option>Transport</option>
                          <option>Energy</option>
                          <option>Diet</option>
                          <option>Waste</option>
                       </select>
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Estimated CO2 (kg)</label>
                       <input type="number" required step="0.1" value={value} onChange={e => setValue(e.target.value)} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border text-slate-800" placeholder="e.g. 5.5" />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                       <input type="text" value={desc} onChange={e => setDesc(e.target.value)} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border text-slate-800" placeholder="e.g. Drove 20km to work" />
                    </div>
                    <div className="mt-8 flex justify-end space-x-3">
                       <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-500 hover:bg-slate-100 rounded-xl font-bold transition-colors">Cancel</button>
                       <button type="submit" className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-md transition-colors">Save Log</button>
                    </div>
                 </form>
             </motion.div>
          </div>
       )}
    </motion.div>
   )
}
