import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import type { Post } from "./PostList";
import { supabase } from "../supabase-client";
import { PostItem } from "./PostItem";

interface Props {
  communityId: number;
}

interface PostWithCommunity extends Post {
  communities: {
    name: string;
  };
}

export const fetchCommunityPost = async (
  communityId: number
): Promise<PostWithCommunity[]> => {
  const { data, error } = await supabase
    .from("posts")
    .select("*, communities(name)")
    .eq("community_id", communityId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as PostWithCommunity[];
};

export const CommunityDisplay = ({ communityId }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, error, isLoading } = useQuery<
    PostWithCommunity[],
    Error
  >({
    queryKey: ["communityPost", communityId],
    queryFn: () => fetchCommunityPost(communityId),
  });

  if (isLoading)
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );

  if (error)
    return (
      <div className="text-red-500 text-center py-10">
        Грешка: {error.message}
      </div>
    );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2
          className="text-3xl md:text-6xl font-black 
          bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-600 
          bg-clip-text text-transparent 
          drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]"
        >
          {data?.[0]?.communities?.name} Постове
        </h2>

        {user && (
          <button
            onClick={() =>
              navigate(`/create?community=${communityId}`)
            }
            className="px-5 py-2 rounded-xl bg-gradient-to-r 
            from-cyan-400 to-fuchsia-500 text-black font-bold 
            shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            + Нов пост
          </button>
        )}
      </div>

      {data && data.length > 0 ? (
        <div className="flex flex-wrap gap-6 justify-center">
          {data.map((post) => (
            <PostItem key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-400">
          Все още няма постове в тази общност!
        </p>
      )}
    </div>
  );
};