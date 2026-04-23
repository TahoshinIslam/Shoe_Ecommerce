import { useState } from "react";
import { Users, Shield, User as UserIcon, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Select from "../../components/ui/Select.jsx";
import Modal from "../../components/ui/Modal.jsx";
import ConfirmDialog from "../../components/ui/ConfirmDialog.jsx";
import Skeleton from "../../components/ui/Skeleton.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";

import {
  useListUsersQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from "../../store/userApi.js";
import { formatDate } from "../../lib/utils.js";

export default function AdminUsersPage() {
  const { data, isLoading } = useListUsersQuery();
  const users = data?.users ?? [];
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteUser, { isLoading: deleting }] = useDeleteUserMutation();

  const handleDelete = async () => {
    try {
      await deleteUser(confirmDelete._id).unwrap();
      toast.success("User deleted");
      setConfirmDelete(null);
    } catch (e) {
      toast.error(e?.data?.message || "Could not delete");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-black">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">{users.length} users</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="No users" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">User</th>
                <th className="hidden p-3 text-left sm:table-cell">Role</th>
                <th className="hidden p-3 text-left md:table-cell">Joined</th>
                <th className="hidden p-3 text-center md:table-cell">Verified</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-muted/20">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          u.name?.[0]?.toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden p-3 sm:table-cell">
                    {u.role === "admin" ? (
                      <Badge variant="accent"><Shield className="h-3 w-3" />admin</Badge>
                    ) : (
                      <Badge variant="outline"><UserIcon className="h-3 w-3" />customer</Badge>
                    )}
                  </td>
                  <td className="hidden p-3 text-muted-foreground md:table-cell">{formatDate(u.createdAt)}</td>
                  <td className="hidden p-3 text-center md:table-cell">
                    {u.isVerified ? <Badge variant="success">✓</Badge> : <Badge variant="warning">no</Badge>}
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEditing(u)}>Edit</Button>
                      {u.role !== "admin" && (
                        <button onClick={() => setConfirmDelete(u)} className="rounded p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger" aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={`Delete ${confirmDelete?.name}?`}
        description="Their account and cart will be removed. Orders remain in history."
        loading={deleting}
      />
    </div>
  );
}

function EditUserModal({ user, onClose }) {
  const [role, setRole] = useState(user.role);
  const [isVerified, setIsVerified] = useState(user.isVerified);
  const [updateUser, { isLoading }] = useUpdateUserMutation();

  const handleSave = async () => {
    try {
      await updateUser({ id: user._id, role, isVerified }).unwrap();
      toast.success("User updated");
      onClose();
    } catch (e) {
      toast.error(e?.data?.message || "Could not update");
    }
  };

  return (
    <Modal open onClose={onClose} title={`Edit ${user.name}`} size="sm">
      <div className="space-y-4 p-5">
        <div className="rounded-md bg-muted/30 p-3 text-sm">
          <p><strong>{user.name}</strong></p>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="customer">Customer</option>
          <option value="admin">Admin</option>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-accent" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} />
          Email verified
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={isLoading}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}