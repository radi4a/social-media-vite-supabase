import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase-client";
import { Link } from "react-router";
import { useState, useEffect } from "react";

export interface Community {
  id: number;
  name: string;
  description: string;
  created_at: string;
  user_id: string;
  isFollowed?: boolean;
}

interface CommunityListProps {
  filterUserId?: string;
  followedUserId?: string;
  currentUserId?: string;
}

export const fetchCommunities = async (
  currentUserId?: string,
  filterUserId?: string
): Promise<Community[]> => {
  let query = supabase.from("communities").select("*").order("created_at", { ascending: false });

  if (filterUserId) query = query.eq("user_id", filterUserId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  if (currentUserId) {
    const { data: followedData } = await supabase
      .from("community_follows")
      .select("community_id")
      .eq("user_id", currentUserId);

    const followedIds = (followedData || []).map(f => f.community_id);

    return (data || []).map(c => ({
      ...c,
      isFollowed: followedIds.includes(c.id),
    }));
  }

  return data as Community[];
};

export const fetchFollowedCommunities = async (userId: string): Promise<Community[]> => {
  const { data, error } = await supabase
    .from("community_follows")
    .select("community_id, communities(*)")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  return (data || [])
    .map(d => ({ ...d.communities, isFollowed: true }))
    .flat()
    .filter(Boolean);
};

const toggleFollowCommunity = async (communityId: number, userId: string) => {
  const { data: existing } = await supabase
    .from("community_follows")
    .select("*")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    await supabase
      .from("community_follows")
      .delete()
      .eq("community_id", communityId)
      .eq("user_id", userId);
    return false;
  } else {
    await supabase
      .from("community_follows")
      .insert({ community_id: communityId, user_id: userId });
    return true;
  }
};

const updateCommunity = async (communityId: number, name: string, description: string) => {
  const { data, error } = await supabase
    .from("communities")
    .update({ name, description })
    .eq("id", communityId)
    .single();

  if (error) throw new Error(error.message);
  return data as Community;
};

const deleteCommunity = async (communityId: number) => {
  const { error } = await supabase
    .from("communities")
    .delete()
    .eq("id", communityId);

  if (error) throw new Error(error.message);
  return communityId;
};

export const CommunityList = ({ filterUserId, followedUserId, currentUserId }: CommunityListProps) => {
  const queryClient = useQueryClient();

  const [userRole, setUserRole] = useState<string | null>(null);
  const [followStates, setFollowStates] = useState<Record<number, boolean>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCommunityId, setSelectedCommunityId] = useState<number | null>(null);

  // ⭐ Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // ⭐ Debounce search (300ms pro UX)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const fetchRole = async () => {
      if (currentUserId) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", currentUserId)
          .single();

        setUserRole(profileData?.role || "user");
      }
    };

    fetchRole();
  }, [currentUserId]);

  const { data, error, isLoading } = useQuery<Community[], Error>({
    queryKey: ["communities", filterUserId, followedUserId, currentUserId],
    queryFn: () =>
      followedUserId
        ? fetchFollowedCommunities(followedUserId)
        : fetchCommunities(currentUserId, filterUserId),
  });

  useEffect(() => {
    if (data && currentUserId) {
      const initialStates: Record<number, boolean> = {};
      data.forEach(c => {
        initialStates[c.id] = !!c.isFollowed;
      });
      setFollowStates(initialStates);
    }
  }, [data, currentUserId]);

  // ⭐ Filtering logic (frontend search)
  const filteredCommunities = data?.filter(community => {
    if (!debouncedSearch) return true;

    const term = debouncedSearch.toLowerCase();

    return (
      community.name.toLowerCase().includes(term) ||
      community.description.toLowerCase().includes(term)
    );
  });

  const followMutation = useMutation({
    mutationFn: ({ communityId, userId }: { communityId: number; userId: string }) =>
      toggleFollowCommunity(communityId, userId),
    onMutate: ({ communityId }) => {
      setFollowStates(prev => ({ ...prev, [communityId]: !prev[communityId] }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      queryClient.invalidateQueries({ queryKey: ["followedCommunities"] });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ communityId, name, description }: { communityId: number; name: string; description: string }) =>
      updateCommunity(communityId, name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (communityId: number) => deleteCommunity(communityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      setIsDeleteOpen(false);
    },
  });

  if (isLoading)
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );

  if (error)
    return <div className="text-red-500 text-center py-10">Грешка: {error.message}</div>;

  return (
    <div className="space-y-6">

      {/* ⭐ Search Bar */}
      <div className="max-w-5xl mx-auto px-4 md:px-0">
        <input
          type="text"
          placeholder="🔍 Търси общност..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full mb-6 p-3 rounded-xl border border-white/20 bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition"
        />
      </div>

      <div className="max-w-5xl mx-auto space-y-6 px-4 md:px-0">
        {filteredCommunities?.map(community => {
          const isFollowed = followStates[community.id];
          const isOwner = currentUserId === community.user_id;

          return (
            <div
              key={community.id}
              className="bg-gradient-to-br from-gray-900/40 to-gray-800/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center shadow-md hover:shadow-2xl transition-shadow duration-300"
            >
              <div className="flex-1 min-w-0">

                {editingId === community.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full mb-2 p-2 rounded border border-white/20 bg-gray-900 text-white break-words"
                    />

                    <textarea
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                      className="w-full p-2 rounded border border-white/20 bg-gray-900 text-white break-words"
                    />

                    <div className="mt-2 flex gap-2 flex-wrap">
                      <button
                        onClick={() =>
                          editMutation.mutate({
                            communityId: community.id,
                            name: editName,
                            description: editDesc,
                          })
                        }
                        className="px-4 py-2 rounded bg-green-500 hover:bg-green-400 text-white font-semibold"
                      >
                        Запази
                      </button>

                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 text-white font-semibold"
                      >
                        Отказ
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Link
                      to={`/community/${community.id}`}
                      className="text-2xl md:text-3xl font-extrabold text-cyan-400 hover:text-purple-400 transition-colors duration-300 break-words overflow-hidden line-clamp-3"
                    >
                      {community.name}
                    </Link>

                    <p className="text-gray-300 mt-2 text-sm md:text-base leading-relaxed break-words overflow-hidden line-clamp-3">
                      {community.description}
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-col md:flex-row gap-2 mt-4 md:mt-0 ml-0 md:ml-6 flex-shrink-0">

                {currentUserId && (
                  <button
                    onClick={() =>
                      followMutation.mutate({
                        communityId: community.id,
                        userId: currentUserId,
                      })
                    }
                    className={`px-6 py-2 rounded-full font-semibold text-white transition-all duration-300 shadow-lg ${
                      isFollowed
                        ? "bg-gray-700 hover:bg-gray-600 shadow-inner"
                        : "bg-gradient-to-r from-purple-500 via-cyan-400 to-blue-500 hover:from-purple-400 hover:via-cyan-300 hover:to-blue-400"
                    }`}
                  >
                    {isFollowed ? "Следван" : "Следвай"}
                  </button>
                )}

                {(isOwner || userRole === "admin") && editingId !== community.id && (
                  <div className="flex gap-2 mt-2 md:mt-0 ml-0 md:ml-4 flex-wrap">

                    <button
                      onClick={() => {
                        setEditingId(community.id);
                        setEditName(community.name);
                        setEditDesc(community.description);
                      }}
                      className="p-2 rounded-full bg-yellow-500 hover:bg-yellow-400 text-white transition-colors shadow-md"
                      title="Редактирай"
                    >
                      ✏️
                    </button>

                    <button
                      onClick={() => {
                        setSelectedCommunityId(community.id);
                        setIsDeleteOpen(true);
                      }}
                      className="p-2 rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors shadow-md"
                      title="Изтрий"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Modal */}
      {isDeleteOpen && selectedCommunityId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-md">
          <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-sm space-y-5 text-center border border-white/10 shadow-2xl">

            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
              ⚠️
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Изтриване на общност</h3>
              <p className="text-white/60 text-sm mt-2">
                Сигурни ли сте? Това действие е необратимо.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => deleteMutation.mutate(selectedCommunityId)}
                className="w-full py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                Изтрий
              </button>

              <button
                onClick={() => setIsDeleteOpen(false)}
                className="w-full py-3 rounded-xl bg-transparent text-gray-400 font-bold hover:text-white transition-all"
              >
                Откажи
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};