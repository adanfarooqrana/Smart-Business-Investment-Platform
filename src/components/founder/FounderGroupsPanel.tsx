import { useEffect, useMemo, useState } from "react";
import { Users, Plus, Send, Bot, X, Lock, Search, UserPlus, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToGroups,
  createGroup,
  addGroupMember,
  subscribeToGroupMessages,
  sendGroupMessage,
  fetchUserDirectory,
  filterDirectoryUsers,
  type FounderGroup,
  type GroupMessage,
  type DirectoryUser,
} from "@/services/founderCommunityService";
import { toast } from "sonner";

type Props = {
  founderId: string;
  founderName: string;
  isOpen: boolean;
  onClose: () => void;
};

const ROLE_LABEL: Record<string, string> = {
  entrepreneur: "Founder",
  investor: "Investor",
  business: "Business",
  consultant: "Wholesaler",
  wholesaler: "Wholesaler",
};

export function FounderGroupsPanel({ founderId, founderName, isOpen, onClose }: Props) {
  const { currentUser } = useAuth();
  const [groups, setGroups] = useState<FounderGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<FounderGroup | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("Business");
  const [isPrivate, setIsPrivate] = useState(false);
  const [addMemberId, setAddMemberId] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<DirectoryUser[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);

  const authUid = currentUser?.uid ?? founderId;

  // Live listener: groups/ (Firebase RTDB)
  useEffect(() => {
    if (!isOpen) return;
    if (!currentUser?.uid) {
      setGroups([]);
      setGroupsLoading(false);
      return;
    }

    setGroupsLoading(true);
    const unsub = subscribeToGroups((list) => {
      setGroups(list);
      setGroupsLoading(false);
      setSelectedGroup((prev) => {
        if (!prev) return prev;
        return list.find((g) => g.id === prev.id) ?? prev;
      });
    });
    return unsub;
  }, [isOpen, currentUser?.uid]);

  // Live listener: group_messages/{groupId}/
  useEffect(() => {
    if (!selectedGroup?.id || !currentUser?.uid) {
      setMessages([]);
      setMessagesLoading(false);
      return;
    }

    setMessagesLoading(true);
    const unsub = subscribeToGroupMessages(selectedGroup.id, (list) => {
      setMessages(list);
      setMessagesLoading(false);
    });
    return unsub;
  }, [selectedGroup?.id, currentUser?.uid]);

  useEffect(() => {
    if (!showCreate) return;
    let cancelled = false;
    setLoadingDirectory(true);
    fetchUserDirectory()
      .then((list) => {
        if (!cancelled) setDirectory(list);
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load user directory. Publish user_directory rules in Firebase.");
      })
      .finally(() => {
        if (!cancelled) setLoadingDirectory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showCreate]);

  const searchResults = useMemo(
    () => filterDirectoryUsers(directory, memberSearch, authUid),
    [directory, memberSearch, authUid],
  );

  const toggleMember = (user: DirectoryUser) => {
    setSelectedMembers((prev) =>
      prev.some((m) => m.uid === user.uid)
        ? prev.filter((m) => m.uid !== user.uid)
        : [...prev, user],
    );
  };

  const resetCreateForm = () => {
    setNewName("");
    setNewDesc("");
    setNewCategory("Business");
    setIsPrivate(false);
    setMemberSearch("");
    setSelectedMembers([]);
    setShowCreate(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Please enter a group name.");
      return;
    }
    const creatorUid = currentUser?.uid;
    if (!creatorUid) {
      toast.error("Firebase login required. Sign out and sign in again with email & password.");
      return;
    }

    setCreating(true);
    try {
      const memberIds = Array.from(
        new Set([creatorUid, ...selectedMembers.map((m) => m.uid)]),
      );
      const group = await createGroup({
        name: newName.trim(),
        description: newDesc.trim(),
        category: newCategory,
        members: memberIds,
        createdBy: creatorUid,
        isPrivate,
      });
      setSelectedGroup(group);
      resetCreateForm();
      toast.success(`Group "${group.name}" created with ${memberIds.length} member(s)!`);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Could not create group: ${msg}`);
    } finally {
      setCreating(false);
    }
  };

  const handleSend = async () => {
    if (!draft.trim() || !selectedGroup) return;
    const uid = currentUser?.uid;
    if (!uid) {
      toast.error("Sign in required to send messages.");
      return;
    }
    try {
      await sendGroupMessage({
        groupId: selectedGroup.id,
        userId: uid,
        userName: founderName,
        message: draft.trim(),
      });
      setDraft("");
    } catch {
      toast.error("Failed to send message.");
    }
  };

  const handleAddMember = async () => {
    if (!addMemberId.trim() || !selectedGroup) return;
    try {
      await addGroupMember(selectedGroup.id, addMemberId.trim());
      toast.success(`Added member ${addMemberId.trim()}`);
      setAddMemberId("");
    } catch {
      toast.error("Could not add member. Check the user ID.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(0,0,0,0.8)" }}>
      <div
        className="mx-auto my-8 flex w-full max-w-4xl overflow-hidden rounded-3xl border border-[#FFD700]/20 shadow-2xl"
        style={{ background: "#1a1a2e" }}
      >
        {/* Group list */}
        <div className="flex w-72 shrink-0 flex-col border-r border-[#FFD700]/10">
          <div className="border-b border-[#FFD700]/10 p-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-white">
                <Users className="h-5 w-5 text-[#FFD700]" /> Groups
              </h2>
              <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              Search users by ID, name, or email when creating a group
            </p>
          </div>
          <div className="p-3">
            <Button
              size="sm"
              className="w-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-xs font-bold text-[#1a1a2e]"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Create Group
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {groupsLoading ? (
              <div className="flex items-center justify-center gap-2 p-6 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading groups...
              </div>
            ) : (
              <>
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGroup(g)}
                className={`mb-1 w-full rounded-xl p-3 text-left transition ${
                  selectedGroup?.id === g.id
                    ? "border border-[#FFD700]/40 bg-[#FFD700]/20"
                    : "hover:bg-white/5"
                }`}
              >
                <p className="text-sm font-bold text-white">{g.name}</p>
                <p className="text-[10px] text-slate-500">
                  {g.category} · {g.members.length} members
                </p>
                {g.isPrivate && <Lock className="mt-1 h-3 w-3 text-slate-500" />}
              </button>
            ))}
            {groups.length === 0 && !groupsLoading && (
              <p className="p-3 text-center text-xs text-slate-500">
                {!currentUser?.uid
                  ? "Sign in with Firebase to view and create groups."
                  : "No groups yet. Create one!"}
              </p>
            )}
              </>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex flex-1 flex-col">
          {selectedGroup ? (
            <>
              <div className="border-b border-[#FFD700]/10 p-4">
                <h3 className="font-bold text-white">{selectedGroup.name}</h3>
                <p className="text-xs text-slate-400">{selectedGroup.description}</p>
                <div className="mt-2 flex gap-2">
                  <Input
                    value={addMemberId}
                    onChange={(e) => setAddMemberId(e.target.value)}
                    placeholder="Add user by Firebase UID..."
                    className="h-8 border-white/10 bg-white/5 text-xs text-white"
                  />
                  <Button size="sm" className="h-8 bg-[#FFA500] text-xs" onClick={handleAddMember}>
                    Add
                  </Button>
                </div>
              </div>

              <div className="flex flex-1 overflow-hidden">
                <div className="flex flex-1 flex-col">
                  <div className="flex-1 space-y-2 overflow-y-auto p-4">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading messages...
                      </div>
                    ) : messages.length === 0 ? (
                      <p className="py-8 text-center text-xs text-slate-500">No messages yet. Say hello!</p>
                    ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                          m.userId === authUid
                            ? "ml-auto bg-[#FFA500]/30 text-white"
                            : "bg-white/10 text-slate-200"
                        }`}
                      >
                        <p className="text-[10px] font-bold text-[#FFD700]">{m.userName}</p>
                        <p>{m.message}</p>
                      </div>
                    ))
                    )}
                  </div>
                  <div className="flex gap-2 border-t border-white/5 p-3">
                    <Input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      placeholder="Type a message..."
                      className="border-white/10 bg-white/5 text-white"
                    />
                    <Button size="icon" className="bg-[#FFA500]" onClick={handleSend}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <aside className="hidden w-48 shrink-0 border-l border-[#FFD700]/10 p-3 md:block">
                  <p className="mb-2 flex items-center gap-1 text-[10px] font-bold text-[#FFD700]">
                    <Bot className="h-3 w-3" /> AI Insights
                  </p>
                  <div className="space-y-2 text-[10px] text-slate-400">
                    <p className="rounded-lg bg-white/5 p-2">💡 Active members: {selectedGroup.members.length}</p>
                    <p className="rounded-lg bg-white/5 p-2">📈 Category: {selectedGroup.category}</p>
                  </div>
                </aside>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-slate-500">
              <div className="text-center">
                <Users className="mx-auto mb-3 h-12 w-12 text-[#FFD700]/30" />
                <p className="text-sm">Select a group to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create group modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#FFD700]/30 p-6 shadow-2xl"
            style={{ background: "linear-gradient(165deg, #1e1e35 0%, #141428 100%)" }}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">Create New Group</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Invite founders, investors & wholesalers by searching their user ID
                </p>
              </div>
              <button type="button" onClick={resetCreateForm} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Group name
                </label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Investing in Gold"
                  className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Description
                </label>
                <Input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="What is this group about?"
                  className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#1a1a2e] px-3 py-2.5 text-sm text-white outline-none focus:border-[#FFD700]"
                >
                  {["Business", "Rice", "Tech", "Investors", "Packaging"].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="accent-[#FFA500]"
                />
                <Lock className="h-3.5 w-3.5 text-[#FFD700]" />
                Private group (members only)
              </label>

              {/* Member search */}
              <div className="rounded-2xl border border-[#FFD700]/20 bg-black/20 p-4">
                <label className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#FFD700]">
                  <UserPlus className="h-3.5 w-3.5" /> Add members
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search by user ID, name, or email..."
                    className="border-white/10 bg-white/5 pl-9 text-sm text-white placeholder:text-slate-500"
                  />
                </div>

                {loadingDirectory ? (
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading users...
                  </div>
                ) : (
                  <div className="mt-3 max-h-36 space-y-1 overflow-y-auto">
                    {searchResults.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        {directory.length === 0
                          ? "No users in directory yet. Users appear after they register."
                          : "No users match your search."}
                      </p>
                    ) : (
                      searchResults.map((user) => {
                        const picked = selectedMembers.some((m) => m.uid === user.uid);
                        return (
                          <button
                            key={user.uid}
                            type="button"
                            onClick={() => toggleMember(user)}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                              picked
                                ? "border border-[#FFD700]/40 bg-[#FFD700]/15"
                                : "border border-transparent hover:bg-white/5"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-white">{user.name}</p>
                              <p className="truncate font-mono text-[10px] text-slate-500">{user.uid}</p>
                            </div>
                            <span className="ml-2 shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-400">
                              {ROLE_LABEL[user.role] || user.role}
                            </span>
                            {picked && <Check className="ml-1 h-3.5 w-3.5 text-[#FFD700]" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}

                {selectedMembers.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {selectedMembers.map((m) => (
                      <span
                        key={m.uid}
                        className="inline-flex items-center gap-1 rounded-full bg-[#FFA500]/20 px-2.5 py-1 text-[10px] font-medium text-[#FFD700]"
                      >
                        {m.name}
                        <button type="button" onClick={() => toggleMember(m)} className="hover:text-white">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <Button
                className="flex-1 bg-gradient-to-r from-[#FFD700] to-[#FFA500] font-bold text-[#1a1a2e]"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                  </>
                ) : (
                  "Create Group"
                )}
              </Button>
              <Button variant="ghost" className="text-slate-400" onClick={resetCreateForm} disabled={creating}>
                Cancel
              </Button>
            </div>

            {!currentUser && (
              <p className="mt-3 text-center text-[10px] text-amber-400">
                ⚠ Sign in with Firebase (email/password) to save groups to the backend.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
