import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase-client";
import { CommentItem } from "./CommentItem";

interface Props {
    postId: number;
}

export interface Comments {
    id: number;
    post_id: number;
    content: string;
    parent_comment_id: number | null;
    user_id: string;
    created_at: string;
    author: string;
    avatar_url: string;
    profileData?: {
        full_name: string;
        avatar_url: string;
        bio: string;
    } | null;
}

const fetchComments = async (postId: number): Promise<Comments[]> => {
    const { data: comments, error: commError } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

    if (commError) throw new Error(commError.message);
    if (!comments || comments.length === 0) return [];

    const userIds = Array.from(new Set(comments.map(c => c.user_id)));

    const { data: profiles, error: profError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio")
        .in("id", userIds);

    if (profError) throw profError;

    return comments.map(comment => {
        const matchingProfile = profiles?.find(p => p.id === comment.user_id);
        return {
            ...comment,
            profileData: matchingProfile ? {
                full_name: matchingProfile.full_name,
                avatar_url: matchingProfile.avatar_url,
                bio: matchingProfile.bio || "Няма въведено био." 
            } : null
        };
    }) as Comments[];
};

export const CommentSection = ({ postId }: Props) => {
    const [newCommentText, setNewCommentText] = useState("");
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: comments, isLoading, error } = useQuery<Comments[], Error>({
        queryKey: ["comments", postId],
        queryFn: () => fetchComments(postId),
        refetchInterval: 5000, 
    });

    const { mutate, isPending } = useMutation({
        mutationFn: async (content: string) => {
            const { error } = await supabase.from("comments").insert({
                post_id: postId,
                content: content,
                user_id: user?.id,
                author: user?.user_metadata?.full_name || "Anonymous",
                avatar_url: user?.user_metadata?.avatar_url || ""
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comments", postId] });
            setNewCommentText("");
        },
    });

    const buildCommentTree = (flatComments: Comments[]) => {
        const map = new Map<number, Comments & { children?: Comments[] }>();
        const roots: (Comments & { children?: Comments[] })[] = [];

        flatComments.forEach((comment) => {
            map.set(comment.id, { ...comment, children: [] });
        });

        flatComments.forEach((comment) => {
            if (comment.parent_comment_id) {
                const parent = map.get(comment.parent_comment_id);
                if (parent) parent.children!.push(map.get(comment.id)!);
            } else {
                roots.push(map.get(comment.id)!);
            }
        });
        return roots;
    };

    if (isLoading) return <div className="text-center p-4">Зареждане...</div>;
    if (error) return <div className="text-red-500 text-center p-4">Грешка: {error.message}</div>;

    const commentTree = comments ? buildCommentTree(comments) : [];

    return (
        <div className="max-w-2xl mx-auto mt-8 p-6 bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-xl text-white border border-gray-800">
            <h3 className="text-2xl font-bold mb-6 text-purple-400">Коментари</h3>

            {user ? (
                <form onSubmit={(e) => { e.preventDefault(); if(newCommentText.trim()) mutate(newCommentText); }} className="space-y-4 mb-8">
                    <textarea
                        value={newCommentText}
                        rows={3}
                        placeholder="Напиши коментар..."
                        onChange={(e) => setNewCommentText(e.target.value)}
                        className="w-full p-4 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none resize-none transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!newCommentText.trim() || isPending}
                        className="px-6 py-2 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 transition-all shadow-lg"
                    >
                        {isPending ? "Добавяне..." : "Коментирай"}
                    </button>
                </form>
            ) : (
                <p className="text-gray-400 mb-6 font-medium">Моля, влезте, за да коментирате.</p>
            )}

            <div className="space-y-6">
                {commentTree.map((comment) => (
                    <CommentItem key={comment.id} comment={comment} postId={postId} />
                ))}
            </div>
        </div>
    );
};