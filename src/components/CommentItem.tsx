import { useAuth } from "../context/AuthContext";
import type { Comments } from "./CommentSection";
import { useState, useEffect } from "react";
import { supabase } from "../supabase-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface Props {
    comment: Comments & { children?: Comments[] };
    postId: number;
}

export const CommentItem = ({ comment, postId }: Props) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [userRole, setUserRole] = useState<string | null>(null);

    const [showReply, setShowReply] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(comment.content);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Стейтове за Tooltip
    const [showTooltip, setShowTooltip] = useState(false);
    const [showAuthorPopup, setShowAuthorPopup] = useState(false); // нов стейт за popup

    // Фетчване на ролята (същата логика като в PostDetail)
    useEffect(() => {
        const fetchRole = async () => {
            if (user) {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                setUserRole(profileData?.role || 'user');
            }
        };
        fetchRole();
    }, [user]);

    const isAdmin = userRole === 'admin';
    const isOwner = user?.id === comment.user_id;
    const canManage = isOwner || isAdmin;

    const displayAuthor = comment.profileData?.full_name || comment.author || "Анонимен";
    const displayAvatar = comment.profileData?.avatar_url || comment.avatar_url || "/default-avatar.png";
    const displayBio = comment.profileData?.bio || "Няма въведено био.";

    const { mutate: mutateReply, isPending: isReplyPending } = useMutation({
        mutationFn: async (content: string) => {
            const { error } = await supabase.from("comments").insert({
                post_id: postId, content, parent_comment_id: comment.id,
                user_id: user?.id, author: user?.user_metadata?.full_name, avatar_url: user?.user_metadata?.avatar_url
            });
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["comments", postId] }); setReplyText(""); setShowReply(false); },
    });

    const { mutate: mutateEdit, isPending: isEditPending } = useMutation({
        mutationFn: async (newContent: string) => {
            let query = supabase.from("comments").update({ content: newContent }).eq("id", comment.id);
            if (!isAdmin) query = query.eq("user_id", user?.id);
            const { error } = await query;
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["comments", postId] }); setIsEditing(false); },
    });

    const { mutate: mutateDelete } = useMutation({
        mutationFn: async () => { 
            let query = supabase.from("comments").delete().eq("id", comment.id);
            if (!isAdmin) query = query.eq("user_id", user?.id);
            await query; 
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["comments", postId] }); setShowDeleteModal(false); },
    });

    return (
        <div className="space-y-4">
            <div className="bg-white/[0.03] backdrop-blur-sm p-4 rounded-2xl border border-white/10 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                    <div className="relative inline-block">
                        <div 
                            className="flex items-center gap-3 cursor-pointer group"
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                            onClick={() => setShowAuthorPopup(true)} // click за popup
                        >
                            <img src={displayAvatar} className="w-8 h-8 rounded-full object-cover border border-white/10" alt="avatar" />
                            <span className="text-white/90 font-bold text-sm underline group-hover:text-purple-400 transition-colors">
                                {displayAuthor}
                            </span>
                        </div>

                        {/* Tooltip */}
                        {showTooltip && (
                            <div className="absolute z-[100] bottom-[calc(100%+10px)] left-0 w-[220px] p-4 bg-[#15162c] border border-white/10 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                                <div className="flex flex-col items-center text-center">
                                    <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 mb-2">
                                        <img src={displayAvatar} className="w-14 h-14 rounded-full border-2 border-[#15162c] object-cover" alt="" />
                                    </div>
                                    <h4 className="font-black text-white text-sm tracking-tight mb-1">{displayAuthor}</h4>
                                    <p className="text-[10px] text-gray-400 italic leading-tight px-1">"{displayBio}"</p>
                                </div>
                                <div className="absolute top-full left-3 -mt-px border-[6px] border-transparent border-t-[#15162c]"></div>
                            </div>
                        )}
                    </div>
                    <span className="text-[10px] md:text-xs text-white/40 font-mono">
                        {new Date(comment.created_at).toLocaleString()}
                    </span>
                </div>

                {/* Съдържание, редакция и reply бутоните остават без промяна */}
                {isEditing ? (
                    <div className="space-y-2">
                        <textarea 
                            value={editText} 
                            onChange={(e) => setEditText(e.target.value)} 
                            className="w-full p-3 rounded-xl bg-gray-900/50 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-all" 
                        />
                        <div className="flex gap-2">
                            <button onClick={() => mutateEdit(editText)} disabled={isEditPending} className="px-3 py-1 bg-cyan-600 text-white rounded-lg text-xs font-bold hover:bg-cyan-500 transition-colors disabled:opacity-50">Запази</button>
                            <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-700 transition-colors">Откажи</button>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-300 text-sm md:text-base leading-relaxed break-words whitespace-pre-wrap px-1">
                        {comment.content}
                    </p>
                )}

                <div className="flex gap-4 mt-3 text-[11px] font-bold uppercase tracking-wider">
                    {canManage && !isEditing && (
                        <>
                            <button onClick={() => setIsEditing(true)} className="text-cyan-400 hover:text-white transition-colors">Редактирай</button>
                            <button onClick={() => setShowDeleteModal(true)} className="text-red-400 hover:text-white transition-colors">Изтрий</button>
                        </>
                    )}
                    {user && !isEditing && (
                        <button onClick={() => setShowReply(!showReply)} className="text-purple-400 hover:text-white transition-colors">
                            {showReply ? "Откажи" : "Отговори"}
                        </button>
                    )}
                </div>
            </div>

            {showReply && (
                <form className="ml-6 md:ml-10 space-y-2 animate-in slide-in-from-left-2 duration-200" onSubmit={(e) => { e.preventDefault(); mutateReply(replyText); }}>
                    <textarea 
                        value={replyText} 
                        onChange={(e) => setReplyText(e.target.value)} 
                        placeholder="Твоят отговор..." 
                        className="w-full p-3 rounded-xl bg-white/[0.02] border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50 transition-all shadow-inner" 
                    />
                    <button type="submit" disabled={isReplyPending || !replyText.trim()} className="px-5 py-1.5 bg-purple-600 text-white rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-purple-500 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-30">
                        {isReplyPending ? "Изпращане..." : "Изпрати"}
                    </button>
                </form>
            )}

            {comment.children && comment.children.length > 0 && (
                <div className="ml-4 md:ml-8 border-l-2 border-white/5 pl-4 space-y-4">
                    <button onClick={() => setIsCollapsed(!isCollapsed)} className="text-[10px] font-black uppercase tracking-tighter text-white/30 hover:text-cyan-400 transition-colors">
                        {isCollapsed ? `+ Покажи ${comment.children.length} отговора` : "- Скрий отговорите"}
                    </button>
                    {!isCollapsed && comment.children.map((child) => <CommentItem key={child.id} comment={child} postId={postId} />)}
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 backdrop-blur-md">
                    <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-sm space-y-5 text-center border border-white/10 shadow-2xl">
                        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white">Изтриване на коментар</h3>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => mutateDelete()} className="w-full py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all">Изтрий</button>
                            <button onClick={() => setShowDeleteModal(false)} className="w-full py-3 rounded-xl bg-transparent text-gray-400 font-bold hover:text-white transition-all">Откажи</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Author Popup с голяма снимка */}
            {showAuthorPopup && comment.profileData && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    onClick={() => setShowAuthorPopup(false)}
                >
                    <div
                        className="relative w-[320px] bg-[#15162c] border border-white/10 rounded-3xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setShowAuthorPopup(false)}
                            className="absolute top-4 right-4 text-white/50 hover:text-white text-2xl transition-colors"
                        >
                            ✕
                        </button>

                        {/* Extra Large Avatar */}
                        <div className="flex justify-center -mt-16">
                            <img
                                src={displayAvatar}
                                alt={displayAuthor}
                                className="w-36 h-36 rounded-full border-4 border-white/10 object-cover"
                            />
                        </div>

                        {/* Name */}
                        <h3 className="mt-6 text-center text-white font-extrabold text-3xl">
                            {displayAuthor}
                        </h3>

                        {/* Bio */}
                        <p className="mt-3 text-center text-gray-300 text-base md:text-lg leading-relaxed">
                            {displayBio}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
