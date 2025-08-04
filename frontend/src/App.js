import React, { useState, useEffect, createContext, useContext } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Auth Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      checkUser();
    }
  }, [token]);

  const checkUser = async () => {
    try {
      const response = await axios.get(`${API}/me`);
      setUser(response.data);
    } catch (error) {
      logout();
    }
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/login`, { username, password });
      const { access_token, user } = response.data;
      setToken(access_token);
      setUser(user);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Login Component
const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const result = await login(username, password);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center mb-4">
            <i className="fas fa-satellite text-white text-2xl"></i>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
            Afrikanet Online
          </h1>
          <p className="mt-2 text-slate-400">Connectez-vous à votre compte</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nom d'utilisateur
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                placeholder="Entrez votre nom d'utilisateur"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                placeholder="Entrez votre mot de passe"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-yellow-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 transition-all duration-200"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          <div className="text-center">
            <p className="text-sm text-slate-400">
              Compte par défaut: <span className="text-orange-400">admin</span> / <span className="text-orange-400">admin123</span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

// Sidebar Component
const Sidebar = ({ activeView, setActiveView }) => {
  const { logout, user } = useAuth();
  
  const navItems = [
    { id: 'dashboard', icon: 'fas fa-chart-line', label: 'Tableau de Bord' },
    { id: 'subscriptions', icon: 'fas fa-users', label: 'Abonnements' },
    { id: 'alerts', icon: 'fas fa-bell', label: 'Alertes' },
  ];

  return (
    <div className="w-80 bg-slate-800/80 backdrop-blur-xl border-r border-slate-700 h-screen fixed left-0 top-0 z-50">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center">
            <i className="fas fa-satellite text-white text-xl"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
              Afrikanet Online
            </h1>
            <p className="text-sm text-slate-400">Plateforme de Gestion</p>
          </div>
        </div>
      </div>

      <nav className="mt-6">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`w-full flex items-center space-x-3 px-6 py-4 text-left hover:bg-orange-500/10 hover:text-orange-400 transition-all duration-200 ${
              activeView === item.id 
                ? 'bg-orange-500/20 text-orange-400 border-r-2 border-orange-500' 
                : 'text-slate-300'
            }`}
          >
            <i className={`${item.icon} text-lg w-6`}></i>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="absolute bottom-6 left-6 right-6">
        <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center text-white font-bold">
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <div>
              <p className="text-white font-medium">{user?.full_name}</p>
              <p className="text-slate-400 text-sm">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full py-2 px-4 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors duration-200"
          >
            <i className="fas fa-sign-out-alt mr-2"></i>
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, alertsRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/alerts`)
      ]);
      setStats(statsRes.data);
      setAlerts(alertsRes.data.slice(0, 3)); // Show only first 3 alerts
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-6 hover:border-orange-500/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-orange-400">{stats?.total_subscribers || 0}</p>
              <p className="text-slate-400 mt-1">Total Abonnés</p>
            </div>
            <div className="h-14 w-14 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center">
              <i className="fas fa-users text-white text-xl"></i>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-6 hover:border-green-500/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-green-400">{(stats?.monthly_revenue / 1000000).toFixed(1) || 0}M</p>
              <p className="text-slate-400 mt-1">Revenus Mensuels</p>
            </div>
            <div className="h-14 w-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <i className="fas fa-coins text-white text-xl"></i>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-6 hover:border-blue-500/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-blue-400">{stats?.active_subscriptions || 0}</p>
              <p className="text-slate-400 mt-1">Abonnements Actifs</p>
            </div>
            <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <i className="fas fa-wifi text-white text-xl"></i>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-6 hover:border-red-500/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-red-400">{stats?.urgent_alerts || 0}</p>
              <p className="text-slate-400 mt-1">Alertes Urgentes</p>
            </div>
            <div className="h-14 w-14 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
              <i className="fas fa-exclamation-triangle text-white text-xl"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Technology Stats */}
      {stats?.technology_breakdown && (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Répartition par Technologie</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.technology_breakdown.map((tech, index) => (
              <div key={index} className="text-center p-4 bg-slate-700/30 rounded-xl">
                <div className={`text-3xl mb-2 ${tech._id === 'Starlink' ? 'text-orange-400' : 'text-blue-400'}`}>
                  <i className="fas fa-satellite"></i>
                </div>
                <p className="text-2xl font-bold text-white">{tech.count}</p>
                <p className="text-slate-400 text-sm">{tech._id}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">Alertes Récentes</h3>
            <span className="text-slate-400 text-sm">{alerts.length} alertes</span>
          </div>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start space-x-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <i className="fas fa-exclamation-triangle text-yellow-400 mt-1"></i>
                <div className="flex-1">
                  <p className="text-white font-medium">{alert.client_name}</p>
                  <p className="text-slate-300 text-sm">{alert.message}</p>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(alert.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Subscriptions Component
const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [formData, setFormData] = useState({
    client_name: '',
    phone: '',
    technology: 'Starlink',
    plan: 'Starlink Residential',
    bandwidth: '100Mbps',
    frequency: 'Ka-band',
    amount: 150000,
    duration_months: 6,
    start_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const response = await axios.get(`${API}/subscriptions`);
      setSubscriptions(response.data);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        start_date: new Date(formData.start_date).toISOString()
      };

      if (editingSubscription) {
        await axios.put(`${API}/subscriptions/${editingSubscription.id}`, submitData);
      } else {
        await axios.post(`${API}/subscriptions`, submitData);
      }
      
      setShowModal(false);
      setEditingSubscription(null);
      resetForm();
      fetchSubscriptions();
    } catch (error) {
      console.error('Error saving subscription:', error);
    }
  };

  const handleEdit = (subscription) => {
    setEditingSubscription(subscription);
    setFormData({
      client_name: subscription.client_name,
      phone: subscription.phone,
      technology: subscription.technology,
      plan: subscription.plan,
      bandwidth: subscription.bandwidth,
      frequency: subscription.frequency,
      amount: subscription.amount,
      duration_months: subscription.duration_months,
      start_date: subscription.start_date.split('T')[0]
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet abonnement ?')) {
      try {
        await axios.delete(`${API}/subscriptions/${id}`);
        fetchSubscriptions();
      } catch (error) {
        console.error('Error deleting subscription:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      client_name: '',
      phone: '',
      technology: 'Starlink',
      plan: 'Starlink Residential',
      bandwidth: '100Mbps',
      frequency: 'Ka-band',
      amount: 150000,
      duration_months: 6,
      start_date: new Date().toISOString().split('T')[0]
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-500/20 text-green-400',
      expiring: 'bg-yellow-500/20 text-yellow-400',
      expired: 'bg-red-500/20 text-red-400'
    };
    return badges[status] || badges.active;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Gestion des Abonnements</h2>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-yellow-600 transition-all duration-200"
        >
          <i className="fas fa-plus mr-2"></i>Nouvel Abonnement
        </button>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-6 py-4 text-left text-slate-300 font-medium">Client</th>
                <th className="px-6 py-4 text-left text-slate-300 font-medium">Technologie</th>
                <th className="px-6 py-4 text-left text-slate-300 font-medium">Plan</th>
                <th className="px-6 py-4 text-left text-slate-300 font-medium">Montant</th>
                <th className="px-6 py-4 text-left text-slate-300 font-medium">Dates</th>
                <th className="px-6 py-4 text-left text-slate-300 font-medium">Statut</th>
                <th className="px-6 py-4 text-left text-slate-300 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {subscriptions.map((subscription) => (
                <tr key={subscription.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-medium">{subscription.client_name}</p>
                      <p className="text-slate-400 text-sm">{subscription.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      subscription.technology === 'Starlink' 
                        ? 'bg-orange-500/20 text-orange-400' 
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {subscription.technology}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white">{subscription.plan}</p>
                      <p className="text-slate-400 text-sm">{subscription.bandwidth}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white font-medium">
                    {subscription.amount.toLocaleString()} FCFA
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <p className="text-slate-300">Du: {new Date(subscription.start_date).toLocaleDateString()}</p>
                      <p className="text-slate-300">Au: {new Date(subscription.end_date).toLocaleDateString()}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(subscription.status)}`}>
                      {subscription.status === 'active' ? 'Actif' : 
                       subscription.status === 'expiring' ? 'Expirant' : 'Expiré'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(subscription)}
                        className="p-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                      >
                        <i className="fas fa-edit text-sm"></i>
                      </button>
                      <button
                        onClick={() => handleDelete(subscription.id)}
                        className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                      >
                        <i className="fas fa-trash text-sm"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                {editingSubscription ? 'Modifier l\'Abonnement' : 'Nouvel Abonnement'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingSubscription(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    Nom du Client
                  </label>
                  <input
                    type="text"
                    value={formData.client_name}
                    onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    Téléphone
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    Technologie
                  </label>
                  <select
                    value={formData.technology}
                    onChange={(e) => setFormData({...formData, technology: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="Starlink">Starlink</option>
                    <option value="VSAT">VSAT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    Plan
                  </label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({...formData, plan: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="Starlink Residential">Starlink Residential</option>
                    <option value="Starlink Business">Starlink Business</option>
                    <option value="VSAT Standard">VSAT Standard</option>
                    <option value="VSAT Premium">VSAT Premium</option>
                    <option value="VSAT Enterprise">VSAT Enterprise</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    Bande Passante
                  </label>
                  <select
                    value={formData.bandwidth}
                    onChange={(e) => setFormData({...formData, bandwidth: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="10Mbps">10Mbps</option>
                    <option value="20Mbps">20Mbps</option>
                    <option value="50Mbps">50Mbps</option>
                    <option value="100Mbps">100Mbps</option>
                    <option value="200Mbps">200Mbps</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    Fréquence
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="C-band">C-band</option>
                    <option value="Ku-band">Ku-band</option>
                    <option value="Ka-band">Ka-band</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    Durée (mois)
                  </label>
                  <select
                    value={formData.duration_months}
                    onChange={(e) => setFormData({...formData, duration_months: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value={1}>1 mois</option>
                    <option value={3}>3 mois</option>
                    <option value={6}>6 mois</option>
                    <option value={12}>12 mois</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    Montant (FCFA)
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    Date de Début
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              <div className="flex space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingSubscription(null);
                  }}
                  className="flex-1 py-3 px-4 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-yellow-600 transition-all duration-200"
                >
                  {editingSubscription ? 'Modifier' : 'Créer'} Abonnement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Alerts Component
const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await axios.get(`${API}/alerts`);
      setAlerts(response.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Alertes d'Expiration</h2>

      {alerts.length === 0 ? (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-12 text-center">
          <i className="fas fa-bell-slash text-6xl text-slate-400 mb-4"></i>
          <h3 className="text-xl font-semibold text-white mb-2">Aucune alerte</h3>
          <p className="text-slate-400">Tous les abonnements sont à jour.</p>
        </div>
      ) : (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-6">
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start space-x-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex-shrink-0">
                  <i className="fas fa-exclamation-triangle text-yellow-400 text-xl mt-1"></i>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-white">{alert.client_name}</h4>
                  <p className="text-slate-300 mt-1">{alert.message}</p>
                  <div className="flex items-center space-x-4 mt-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      alert.alert_type === 'expiring' 
                        ? 'bg-yellow-500/20 text-yellow-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {alert.alert_type === 'expiring' ? 'Expirant' : 'Expiré'}
                    </span>
                    <span className="text-slate-400 text-sm">
                      {new Date(alert.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">
                    Renouveler
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Main App Component
const MainApp = () => {
  const [activeView, setActiveView] = useState('dashboard');

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'subscriptions':
        return <Subscriptions />;
      case 'alerts':
        return <Alerts />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="flex-1 ml-80 p-6">
        <div className="max-w-7xl mx-auto">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

// Main App
function App() {
  const { user } = useAuth();

  return (
    <div className="App">
      {user ? <MainApp /> : <Login />}
    </div>
  );
}

// App with Auth Provider
function AppWithAuth() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

export default AppWithAuth;