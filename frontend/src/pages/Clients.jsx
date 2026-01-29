import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Filter, RefreshCw, Users, Trash2 } from 'lucide-react';
import ClientModal from '../components/ClientModal';
import { toast } from 'sonner';
import GlassCard from '../components/ui/GlassCard';
import AnimatedButton from '../components/ui/AnimatedButton';
import ExportMenu from '../components/ExportMenu';

const Clients = () => {
  const { api } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  
  // Filter States
  const [branches, setBranches] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');

  const fetchClients = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (selectedBranch) params.branch_id = selectedBranch;
      if (selectedGroup) params.customer_group_id = selectedGroup;
      
      const response = await api.client.get('/api/clients/', { params });
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchDropdowns = async () => {
    try {
      const [branchesRes, groupsRes] = await Promise.all([
        api.branches.list(),
        api.customerGroups.list()
      ]);
      setBranches(branchesRes);
      setGroups(groupsRes);
    } catch (error) {
      console.error("Failed to load filters", error);
    }
  };

  useEffect(() => {
    fetchDropdowns();
  }, []);

  useEffect(() => {
    fetchClients();
  }, [search, selectedBranch, selectedGroup]);

  const handleAddClient = () => {
    setSelectedClient(null);
    setShowModal(true);
  };

  const handleEditClient = (client) => {
    setSelectedClient(client);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedClient(null);
  };

  const handleClientSaved = () => {
    fetchClients();
    handleCloseModal();
  };
  
  const handleDelete = async (id) => {
    if(!confirm("Are you sure you want to delete this client?")) return;
    try {
      await api.clients.delete(id);
      toast.success("Client deleted");
      fetchClients();
    } catch (err) {
      toast.error("Failed to delete client");
    }
  };



  // Data prep for export
  const exportData = clients.map(client => ({
    "First Name": client.first_name,
    "Last Name": client.last_name,
    "Phone": client.phone,
    "ID Number": client.id_number,
    "Branch": branches.find(b => b.id === client.branch_id)?.name || '-',
    "Group": groups.find(g => g.id === client.customer_group_id)?.name || '-',
    "Status": client.status,
    "Joined": new Date(client.created_at).toLocaleDateString()
  }));

  const pdfColumns = [
    { header: 'First Name', dataKey: 'First Name' },
    { header: 'Last Name', dataKey: 'Last Name' },
    { header: 'Phone', dataKey: 'Phone' },
    { header: 'ID', dataKey: 'ID Number' },
    { header: 'Branch', dataKey: 'Branch' },
    { header: 'Group', dataKey: 'Group' },
    { header: 'Status', dataKey: 'Status' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
            <div className="flex items-center gap-2 mb-2">
                <Users size={18} className="text-tytaj-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500">Client Management</span>
            </div>
          <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none">Client Directory</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium tracking-tight">Managing <span className="text-gray-900 dark:text-white font-bold">{clients.length} clients</span> and their loans.</p>
        </div>

        <div className="flex gap-4 w-full sm:w-auto">
            <ExportMenu 
                data={exportData} 
                columns={pdfColumns} 
                filename="Clients_List" 
                title="Client Directory" 
            />
            <AnimatedButton
              onClick={handleAddClient}
              className="w-full sm:w-auto shadow-xl shadow-tytaj-600/20"
            >
              <Plus className="w-5 h-5 mr-1" />
              Add Client
            </AnimatedButton>
        </div>
      </div>

      <GlassCard className="!p-0 border-white/20 dark:border-white/5 overflow-visible shadow-2xl">
        {/* Filters Bar */}
        <div className="p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-white/5 flex flex-col xl:flex-row gap-6 justify-between items-center">
          <div className="relative w-full xl:max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, phone, or ID number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-medium placeholder:text-gray-400"
            />
          </div>
          
          <div className="flex flex-wrap gap-4 w-full xl:w-auto">
             <div className="relative flex-1 sm:flex-none min-w-[180px]">
                <label className="absolute -top-2.5 left-4 px-1 bg-[#efeff4] dark:bg-[#11111a] text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest z-10 transition-colors">Branch Node</label>
                <select 
                  value={selectedBranch} 
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full appearance-none bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-200 py-3.5 pl-4 pr-10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 cursor-pointer font-bold text-sm"
                >
                  <option value="">All Regions</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id} className="dark:bg-slate-900">{b.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                  <Filter size={14} />
                </div>
             </div>
             
             <div className="relative flex-1 sm:flex-none min-w-[200px]">
                <label className="absolute -top-2.5 left-4 px-1 bg-[#efeff4] dark:bg-[#11111a] text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest z-10">Client Cluster</label>
                <select 
                  value={selectedGroup} 
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full appearance-none bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-200 py-3.5 pl-4 pr-10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 cursor-pointer font-bold text-sm"
                >
                  <option value="">All Protocol Groups</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id} className="dark:bg-slate-900">{g.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                  <Filter size={14} />
                </div>
             </div>
             
             <button 
                title="Recalibrate Data" 
                onClick={fetchClients} 
                className="text-gray-500 dark:text-gray-400 hover:text-tytaj-600 dark:hover:text-tytaj-400 p-3.5 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center shadow-sm"
            >
               <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
             </button>
          </div>
        </div>

        <div className="overflow-x-auto selection:bg-tytaj-500/30">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-white/5">
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Client Name</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Contact Info</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Branch</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Group</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Status</th>
  <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {loading && clients.length === 0 ? (
                 <tr><td colSpan="6" className="p-20 text-center text-gray-400 dark:text-gray-600 font-bold italic tracking-tight">Loading clients...</td></tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
                        <Search size={40} className="text-gray-200 dark:text-gray-800" />
                      </div>
                      <p className="text-xl font-black text-gray-900 dark:text-white mb-2">No Clients Found</p>
                      <p className="text-gray-500 dark:text-gray-400 font-medium max-w-xs mx-auto">No clients found matching current search parameters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                clients.map((client) => {
                  const branchName = branches.find(b => b.id === client.branch_id)?.name || '-';
                  const groupName = groups.find(g => g.id === client.customer_group_id)?.name || '-';
                  
                  return (
                    <tr key={client.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all group">
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                           <span className="font-black text-gray-900 dark:text-white tracking-tight text-lg">{client.first_name} {client.last_name}</span>
                           <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">ID: {client.id_number}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-gray-800 dark:text-gray-300">{client.phone}</span>
                           <span className="text-xs font-medium text-gray-500 dark:text-gray-500">{client.email || 'NO_DIGITAL_LINK'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{branchName}</span>
                            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{client.town || 'CENTRAL_HUB'}</span>
                         </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {groupName}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                         <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                           client.status === 'active' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                            : 'bg-gray-500/10 text-gray-600 dark:text-gray-500 border border-gray-500/20'
                         }`}>
                           <div className={`w-1.5 h-1.5 rounded-full ${client.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
                           {client.status || 'Active'}
                         </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                            <button
                              onClick={() => handleEditClient(client)}
                              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-tytaj-600 dark:text-tytaj-400 hover:bg-tytaj-500 dark:hover:bg-tytaj-500 hover:text-white transition-all active:scale-95 shadow-sm"
                            >
                              <RefreshCw size={16} />
                            </button>
                             <button
                              onClick={() => handleDelete(client.id)}
                              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-sm"
                            >
                              <Trash2 size={16} />
                            </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {showModal && (
        <ClientModal
          client={selectedClient}
          onClose={handleCloseModal}
          onSave={handleClientSaved}
        />
      )}
    </div>
  );
};

export default Clients;
