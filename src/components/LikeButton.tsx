import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase-client";
import { useAuth } from "../context/AuthContext";

interface Props {
    postId: number;
}

interface Vote {
    id: number;
    post_id: number;
    user_id: string;
    vote: number;
    full_name?: string;
}

const vote = async (voteValue: number, postId: number, userId: string, user: any) => {
    const { data: existingVote } = await supabase
        .from("votes")
        .select("*")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .maybeSingle();

    if (existingVote) {
        if (existingVote.vote === voteValue) {
            const { error } = await supabase
                .from("votes")
                .delete()
                .eq("id", existingVote.id);

            if (error) throw new Error(error.message);
        } else {
            const { error } = await supabase
                .from("votes")
                .update({ vote: voteValue })
                .eq("id", existingVote.id);

            if (error) throw new Error(error.message);
        }
    } else {
        const { error } = await supabase
            .from("votes")
            .insert({
                post_id: postId,
                user_id: userId,
                vote: voteValue,
                full_name: user?.user_metadata?.full_name
            });

        if (error) throw new Error(error.message);
    }
};

const fetchVotes = async (postId: number): Promise<Vote[]> => {
    // 1. Взимаме гласовете
    const { data: votesData, error: votesError } = await supabase
        .from("votes")
        .select("*")
        .eq("post_id", postId);

    if (votesError) throw new Error(votesError.message);
    if (!votesData || votesData.length === 0) return [];

    // 2. Взимаме уникалните ID-та на гласувалите
    const userIds = [...new Set(votesData.map(v => v.user_id))];

    // 3. Взимаме актуалните имена от таблица profiles
    const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

    if (profilesError) {
        console.error("Грешка при взимане на профили:", profilesError.message);
        return votesData as Vote[]; // Връщаме старите данни, ако профилите не заредят
    }

    // 4. Правим "речник" (map) за бърза справка
    const profileMap = Object.fromEntries(
        profilesData.map(p => [p.id, p.full_name])
    );

    // 5. Мапваме гласовете с най-новите имена
    return votesData.map(v => ({
        ...v,
        full_name: profileMap[v.user_id] || v.full_name || "Анонимен"
    })) as Vote[];
};

export const LikeButton = ({ postId }: Props) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: votes, isLoading, error } = useQuery<Vote[], Error>({
        queryKey: ["vote", postId],
        queryFn: () => fetchVotes(postId),
        refetchInterval: 5000,
    });

    const { mutate } = useMutation({
        mutationFn: (voteValue: number) => {
            if (!user) throw new Error("User not authenticated");
            return vote(voteValue, postId, user.id, user);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["vote", postId] });
        }
    });

    if (isLoading) return <div>Зареждане...</div>;
    if (error) return <div>Грешка: {error.message}</div>;

    const counts = {
        1: votes?.filter(v => v.vote === 1).length || 0,
        2: votes?.filter(v => v.vote === 2).length || 0,
        3: votes?.filter(v => v.vote === 3).length || 0,
        4: votes?.filter(v => v.vote === 4).length || 0,
        5: votes?.filter(v => v.vote === 5).length || 0,
    };

    const userLiked = votes?.find(v => v.user_id === user?.id)?.vote || 0;

    const getUsersByVote = (voteValue: number) => {
        return votes?.filter(v => v.vote === voteValue) || [];
    };

    return (
        <div className="flex gap-3 justify-start mt-6">
            {/* LIKE */}
            <div className="relative group">
                <button
                    onClick={() => mutate(1)}
                    className={`px-3 py-1.5 rounded-full text-white font-semibold flex items-center gap-2 transition-all duration-300
                    ${userLiked === 1
                            ? "bg-yellow-800 border-2 border-yellow-400 shadow-[0_0_12px_rgba(255,255,150,0.8)] scale-105"
                            : "bg-gray-700 border-2 border-transparent hover:border-yellow-400 hover:shadow-[0_0_12px_rgba(255,255,150,0.5)] hover:scale-105"
                        }`}
                >
                    👌 {counts[1]}
                </button>
                {counts[1] > 0 && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden w-max max-w-xs rounded-lg bg-gray-800 text-white text-sm p-2 shadow-lg group-hover:block z-10">
                        {getUsersByVote(1).map(v => (
                            <div key={v.id}>{v.full_name}</div>
                        ))}
                    </div>
                )}
            </div>

            {/* HEART */}
            <div className="relative group">
                <button
                    onClick={() => mutate(2)}
                    className={`px-3 py-1.5 rounded-full text-white font-semibold flex items-center gap-2 transition-all duration-300
                    ${userLiked === 2
                            ? "bg-red-800 border-2 border-red-400 shadow-[0_0_12px_rgba(255,100,200,0.8)] scale-105"
                            : "bg-gray-700 border-2 border-transparent hover:border-red-400 hover:shadow-[0_0_12px_rgba(255,100,200,0.5)] hover:scale-105"
                        }`}
                >
                    ❤️ {counts[2]}
                </button>
                {counts[2] > 0 && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden w-max max-w-xs rounded-lg bg-gray-800 text-white text-sm p-2 shadow-lg group-hover:block z-10">
                        {getUsersByVote(2).map(v => (
                            <div key={v.id}>{v.full_name}</div>
                        ))}
                    </div>
                )}
            </div>

            {/* FUNNY */}
            <div className="relative group">
                <button
                    onClick={() => mutate(5)}
                    className={`px-3 py-1.5 rounded-full text-white font-semibold flex items-center gap-2 transition-all duration-300
                    ${userLiked === 5
                            ? "bg-indigo-800 border-2 border-blue-400 shadow-[0_0_12px_rgba(150,100,255,0.8)] scale-105"
                            : "bg-gray-700 border-2 border-transparent hover:border-blue-400 hover:shadow-[0_0_12px_rgba(150,100,255,0.5)] hover:scale-105"
                        }`}
                >
                    😂 {counts[5]}
                </button>
                {counts[5] > 0 && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden w-max max-w-xs rounded-lg bg-gray-800 text-white text-sm p-2 shadow-lg group-hover:block z-10">
                        {getUsersByVote(5).map(v => (
                            <div key={v.id}>{v.full_name}</div>
                        ))}
                    </div>
                )}
            </div>

            {/* SURPRISE */}
            <div className="relative group">
                <button
                    onClick={() => mutate(3)}
                    className={`px-3 py-1.5 rounded-full text-white font-semibold flex items-center gap-2 transition-all duration-300
                    ${userLiked === 3
                            ? "bg-green-800 border-2 border-green-400 shadow-[0_0_12px_rgba(100,255,200,0.8)] scale-105"
                            : "bg-gray-700 border-2 border-transparent hover:border-green-400 hover:shadow-[0_0_12px_rgba(100,255,200,0.5)] hover:scale-105"
                        }`}
                >
                    😮 {counts[3]}
                </button>
                {counts[3] > 0 && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden w-max max-w-xs rounded-lg bg-gray-800 text-white text-sm p-2 shadow-lg group-hover:block z-10">
                        {getUsersByVote(3).map(v => (
                            <div key={v.id}>{v.full_name}</div>
                        ))}
                    </div>
                )}
            </div>

            {/* ANGRY */}
            <div className="relative group">
                <button
                    onClick={() => mutate(4)}
                    className={`px-3 py-1.5 rounded-full text-white font-semibold flex items-center gap-2 transition-all duration-300
                    ${userLiked === 4
                            ? "bg-red-900 border-2 border-red-600 shadow-[0_0_12px_rgba(255,50,50,0.8)] scale-105"
                            : "bg-gray-700 border-2 border-transparent hover:border-red-600 hover:shadow-[0_0_12px_rgba(255,50,50,0.5)] hover:scale-105"
                        }`}
                >
                    😡 {counts[4]}
                </button>
                {counts[4] > 0 && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden w-max max-w-xs rounded-lg bg-gray-800 text-white text-sm p-2 shadow-lg group-hover:block z-10">
                        {getUsersByVote(4).map(v => (
                            <div key={v.id}>{v.full_name}</div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};