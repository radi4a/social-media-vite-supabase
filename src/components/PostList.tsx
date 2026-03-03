import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase-client";
import { PostItem } from "./PostItem";

export interface Post {
  id: number;
  title: string;
  content: string;
  image_url: string;
  created_at: string;
  user_id: string;
  author_name: string;
  avatar_url: string;
  profiles?: {
    id: string;
    full_name: string;
    avatar_url: string;
    bio?: string;
    role?: string;
  };
}

interface PostListProps {
  filterUserId?: string;
  reactedByUserId?: string; // за таб "Реагирани"
}

const fetchPosts = async (
  userIdFilter?: string,
  reactedByUserId?: string
): Promise<Post[]> => {
  let query = supabase
    .from("posts")
    .select(`
      id,
      title,
      content,
      image_url,
      created_at,
      user_id,
      profiles (
        id,
        full_name,
        avatar_url,
        bio
      )
    `);

  // Филтър за собствените постове
  if (userIdFilter) {
    query = query.eq("user_id", userIdFilter);
  }

  // Филтър за постовете, на които потребителят е реагирал
  if (reactedByUserId) {
  // Вземаме постовете, на които потребителят е гласувал
  const { data: votedPosts, error: voteError } = await supabase
    .from("votes")
    .select("post_id")
    .eq("user_id", reactedByUserId);

  if (voteError) throw new Error(voteError.message);

  const postIds = votedPosts?.map(v => v.post_id) || [];

  if (postIds.length === 0) return [];

  query = query.in("id", postIds);
}

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data as any[]).map(post => ({
    ...post,
    author_name: post.profiles?.full_name || "Анонимен",
    avatar_url: post.profiles?.avatar_url || ""
  })) as Post[];
};

export const PostList = ({ filterUserId, reactedByUserId }: PostListProps) => {
  const { data, error, isLoading } = useQuery<Post[], Error>({
    queryKey: ["posts", filterUserId, reactedByUserId],
    queryFn: () => fetchPosts(filterUserId, reactedByUserId)
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

  if (!data || data.length === 0)
    return (
      <div className="text-center py-20 bg-gray-900/20 rounded-3xl border border-dashed border-white/10 w-full">
        <p className="text-gray-400">Няма намерени публикации.</p>
      </div>
    );

  return (
    <div className="flex flex-wrap gap-8 justify-center">
      {data.map(post => (
        <PostItem post={post} key={post.id} />
      ))}
    </div>
  );
};
