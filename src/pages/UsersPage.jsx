import React, { useState, useEffect } from 'react'
import {
  Users,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Edit,
  UserCheck,
  UserX,
  Mail,
  Building,
  X,
} from 'lucide-react'
import { useBatchStore } from '../hooks/useBatchStore'

export function UsersPage() {
  const { addToast } = useBatchStore()
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Collector',
    organization: '',
  })

  // Load users from backend
  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/users')
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setUsers(json.data)
      } else {
        setUsers([])
      }
    } catch (err) {
      console.warn('[UsersPage] Backend fetch notice:', err.message)
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.organization?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter
    const matchesStatus = statusFilter === 'ALL' || u.accountStatus === statusFilter
    return matchesSearch && matchesRole && matchesStatus
  })

  // Add User
  const handleCreateUser = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (json.success) {
        addToast({
          type: 'success',
          title: 'User Added',
          message: `${formData.name} added to platform.`,
        })
        setShowAddModal(false)
        setFormData({ name: '', email: '', password: '', role: 'Collector', organization: '' })
        loadUsers()
      } else {
        alert(json.message || 'Error adding user')
      }
    } catch {
      const newUser = {
        _id: `usr-${Date.now()}`,
        id: `usr-${Date.now()}`,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        organization: formData.organization || 'EcoTrace Participant',
        accountStatus: 'Active',
        createdAt: new Date().toISOString(),
      }
      setUsers([newUser, ...users])
      setShowAddModal(false)
      addToast({ type: 'success', title: 'User Added', message: `${formData.name} added.` })
    }
  }

  // Toggle user active / suspended status
  const handleToggleStatus = async (user) => {
    const newStatus = user.accountStatus === 'Active' ? 'Suspended' : 'Active'
    try {
      await fetch(`/api/users/${user._id || user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountStatus: newStatus }),
      })
      addToast({
        type: 'success',
        title: 'Status Updated',
        message: `${user.name} is now ${newStatus}.`,
      })
      loadUsers()
    } catch {
      setUsers(users.map((u) => (u.id === user.id ? { ...u, accountStatus: newStatus } : u)))
      addToast({ type: 'success', title: 'Status Updated', message: `${user.name} is now ${newStatus}.` })
    }
  }

  // Update user
  const handleUpdateUser = async (e) => {
    e.preventDefault()
    if (!editingUser) return
    try {
      await fetch(`/api/users/${editingUser._id || editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser),
      })
      addToast({
        type: 'success',
        title: 'User Updated',
        message: `${editingUser.name} records saved.`,
      })
      setEditingUser(null)
      loadUsers()
    } catch {
      setUsers(users.map((u) => (u.id === editingUser.id ? editingUser : u)))
      setEditingUser(null)
    }
  }

  return (
    <div className="space-y-6 pb-12 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
            User Management &amp; Access Control
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Manage organization members, verify system participants, and configure role-based access permissions.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add User</span>
        </button>
      </div>

      {/* Role Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {['Administrator', 'Collector', 'Transporter', 'Recycler', 'Auditor'].map((roleName) => {
          const count = users.filter((u) => u.role === roleName).length
          return (
            <div key={roleName} className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
              <p className="text-[11px] text-gray-500 font-medium">{roleName}s</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{count}</p>
            </div>
          )
        })}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by user name, email, or organization..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 bg-gray-50 focus:outline-none"
          >
            <option value="ALL">All Roles</option>
            <option value="Administrator">Administrator</option>
            <option value="Collector">Collector</option>
            <option value="Transporter">Transporter</option>
            <option value="Recycler">Recycler</option>
            <option value="Auditor">Auditor</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 bg-gray-50 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Organization</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => {
                const isActive = user.accountStatus === 'Active'
                return (
                  <tr key={user._id || user.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#063D27] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 leading-tight">{user.name}</p>
                          <p className="text-[11px] text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-800">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{user.organization}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-red-50 text-red-700 border border-red-100'
                        }`}
                      >
                        {isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {user.accountStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active Member'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit User"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isActive
                              ? 'text-red-500 hover:bg-red-50 hover:text-red-700'
                              : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800'
                          }`}
                          title={isActive ? 'Deactivate User' : 'Activate User'}
                        >
                          {isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base">Add New Platform User</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. ramesh.kumar@consortium.in"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">System Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                >
                  <option value="Collector">Collector (Intake Center)</option>
                  <option value="Transporter">Transporter (Logistics Driver)</option>
                  <option value="Recycler">Recycler (Processing Plant)</option>
                  <option value="Auditor">Auditor (Regulatory CPCB)</option>
                  <option value="Administrator">Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Organization *</label>
                <input
                  type="text"
                  required
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  placeholder="e.g. VoltHaul Logistics Ltd"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-medium text-gray-600 hover:text-gray-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg shadow-xs"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base">Edit User</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                >
                  <option value="Collector">Collector</option>
                  <option value="Transporter">Transporter</option>
                  <option value="Recycler">Recycler</option>
                  <option value="Auditor">Auditor</option>
                  <option value="Administrator">Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Organization</label>
                <input
                  type="text"
                  required
                  value={editingUser.organization}
                  onChange={(e) => setEditingUser({ ...editingUser, organization: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Account Status</label>
                <select
                  value={editingUser.accountStatus}
                  onChange={(e) => setEditingUser({ ...editingUser, accountStatus: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 font-medium text-gray-600 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
