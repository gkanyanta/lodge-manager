'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { getTenantSlugFromClient } from '@/lib/tenant';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
}

const availableRoles = ['admin', 'manager', 'receptionist', 'housekeeping', 'accountant'];

function UserSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-stone-200" />
        <div>
          <div className="h-4 w-32 rounded bg-stone-200" />
          <div className="mt-1 h-3 w-48 rounded bg-stone-200" />
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add user modal
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    roles: ['receptionist'] as string[],
  });
  const [addLoading, setAddLoading] = useState(false);

  // Edit roles modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const tenantSlug = getTenantSlugFromClient();
      const data = await api.get<User[]>('/admin/users', { tenantSlug });
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAddUser = async () => {
    setAddLoading(true);
    try {
      const tenantSlug = getTenantSlugFromClient();
      await api.post(
        '/admin/users',
        {
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          password: newUser.password,
          roles: newUser.roles,
        },
        { tenantSlug },
      );
      setShowAddUser(false);
      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        roles: ['receptionist'],
      });
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add user');
    } finally {
      setAddLoading(false);
    }
  };

  const handleEditRoles = async () => {
    if (!editingUser) return;
    setEditLoading(true);
    try {
      const tenantSlug = getTenantSlugFromClient();
      await api.patch(
        `/admin/users/${editingUser.id}/roles`,
        { roles: editRoles },
        { tenantSlug },
      );
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update roles');
    } finally {
      setEditLoading(false);
    }
  };

  const toggleRole = (role: string, roles: string[], setRoles: (r: string[]) => void) => {
    if (roles.includes(role)) {
      setRoles(roles.filter((r) => r !== role));
    } else {
      setRoles([...roles, role]);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Users</h1>
        <Button size="sm" onClick={() => setShowAddUser(true)}>
          + Add User
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* User list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <UserSkeleton key={i} />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-sm font-medium text-stone-900">No users found</p>
          <p className="mt-1 text-sm text-stone-500">Add team members to manage your lodge.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="card">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className={cn(
                  'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                  user.isActive
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-stone-200 text-stone-500',
                )}>
                  {getInitials(user.firstName, user.lastName)}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-stone-900">
                      {user.firstName} {user.lastName}
                    </p>
                    {!user.isActive && (
                      <span className="badge-gray">Inactive</span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-stone-500">{user.email}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium capitalize text-stone-600 ring-1 ring-inset ring-stone-200"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Edit button */}
                <button
                  onClick={() => {
                    setEditingUser(user);
                    setEditRoles([...user.roles]);
                  }}
                  className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add user modal */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddUser(false)} />
          <div className="relative z-10 w-full max-w-md rounded-t-xl bg-white p-6 shadow-xl sm:rounded-xl">
            <h3 className="mb-4 text-lg font-semibold text-stone-900">Add User</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  required
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                  placeholder="John"
                />
                <Input
                  label="Last Name"
                  required
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                  placeholder="Doe"
                />
              </div>
              <Input
                label="Email"
                type="email"
                required
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="john@lodge.com"
              />
              <Input
                label="Password"
                type="password"
                required
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Min 8 characters"
              />
              <div className="w-full">
                <label className="mb-1.5 block text-sm font-medium text-stone-700">Roles</label>
                <div className="flex flex-wrap gap-2">
                  {availableRoles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() =>
                        toggleRole(role, newUser.roles, (r) =>
                          setNewUser({ ...newUser, roles: r }),
                        )
                      }
                      className={cn(
                        'rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors min-h-[40px]',
                        newUser.roles.includes(role)
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50',
                      )}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="secondary" onClick={() => setShowAddUser(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                loading={addLoading}
                onClick={handleAddUser}
                disabled={
                  !newUser.firstName ||
                  !newUser.lastName ||
                  !newUser.email ||
                  !newUser.password ||
                  newUser.roles.length === 0
                }
                className="flex-1"
              >
                Add User
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit roles modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditingUser(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-t-xl bg-white p-6 shadow-xl sm:rounded-xl">
            <h3 className="text-lg font-semibold text-stone-900">
              Edit Roles
            </h3>
            <p className="mb-4 text-sm text-stone-500">
              {editingUser.firstName} {editingUser.lastName}
            </p>
            <div className="flex flex-wrap gap-2">
              {availableRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role, editRoles, setEditRoles)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors min-h-[44px]',
                    editRoles.includes(role)
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50',
                  )}
                >
                  {role}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="secondary" onClick={() => setEditingUser(null)} className="flex-1">
                Cancel
              </Button>
              <Button
                loading={editLoading}
                onClick={handleEditRoles}
                disabled={editRoles.length === 0}
                className="flex-1"
              >
                Save Roles
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
