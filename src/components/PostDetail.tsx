import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase-client";
import type { Post } from "./PostList";
import { useEffect, useState, type ChangeEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { LikeButton } from "./LikeButton";
import { CommentSection } from "./CommentSection";
import { useNavigate } from "react-router";

interface Props {
    postId: number;
}

const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
        .from("post-images")
        .getPublicUrl(fileName);

    return data.publicUrl;
};

const renderContentWithLinks = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, index) => {
        if (part.match(urlRegex)) {
            return (
                <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-500/30 underline-offset-4 transition-colors font-medium break-all">
                    {part}
                </a>
            );
        }
        return part;
    });
};

export const PostDetail = ({ postId }: Props) => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);


    // Стейт за тултипа на автора
    const [showAuthorTooltip, setShowAuthorTooltip] = useState(false);
    const [showAuthorPopup, setShowAuthorPopup] = useState(false);


    const { data, isPending, error } = useQuery<Post, Error>({
        queryKey: ["post", postId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("posts")
                .select(`*, profiles (full_name, avatar_url, bio, role)`)
                .eq("id", postId)
                .single();
            if (error) throw error;
            return {
                ...data,
                author_name: data.profiles?.full_name || "Анонимен",
                avatar_url: data.profiles?.avatar_url
            } as Post;
        },
    });

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [previews, setPreviews] = useState<string[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const navigate = useNavigate();


    useEffect(() => {
        const fetchRole = async () => {
            if (user) {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                setUserRole(profileData?.role || 'user');
            } else {
                setUserRole(null);
            }
        };
        fetchRole();
    }, [user]);

    useEffect(() => {
        if (data && isEditOpen) {
            setTitle(data.title);
            setContent(data.content);
            setPreviews(data.image_url ? data.image_url.split(",") : []);
            setSelectedFiles([]);
        }
    }, [data, isEditOpen]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setSelectedFiles(prev => [...prev, ...files]);
            setPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
        }
    };

    const removeImage = (index: number) => {
        const imageToRemove = previews[index];
        if (imageToRemove.startsWith('blob:')) {
            const oldImagesCount = previews.filter(p => !p.startsWith('blob:')).length;
            setSelectedFiles(prev => prev.filter((_, i) => i !== (index - oldImagesCount)));
        }
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const updateMutation = useMutation({
        mutationFn: async () => {
            const existingUrls = previews.filter(p => p.startsWith('http'));
            const newUrls = await Promise.all(selectedFiles.map(file => uploadImage(file)));
            const finalImageUrl = [...existingUrls, ...newUrls].join(',');

            const { error } = await supabase
                .from("posts")
                .update({ title, content, image_url: finalImageUrl })
                .eq("id", postId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["post", postId] });
            setIsEditOpen(false);
        }
    });

    const handleDelete = async () => {
        const { error } = await supabase.from("posts").delete().eq("id", postId);
        if (error) {
            alert(error.message);
        } else {
            queryClient.invalidateQueries({ queryKey: ["posts"] });
            navigate("/");
        }
    };

    if (isPending) return <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>;
    if (error) return <div className="text-red-500 text-center py-20 font-mono">Грешка: {error.message}</div>;

    const images = data?.image_url ? data.image_url.split(",").map(i => i.trim()) : [];
    const count = images.length;
    const isLongContent = (data?.content?.length || 0) > 400;

    const showNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (selectedIndex !== null) setSelectedIndex((selectedIndex + 1) % images.length);
    };

    const showPrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (selectedIndex !== null) setSelectedIndex((selectedIndex - 1 + images.length) % images.length);
    };

    return (
        <div className="pt-10 max-w-4xl mx-auto px-4 space-y-6 relative pb-20">
            {/* Header: Title & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                    <h2 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent break-words">
                        {data?.title}
                    </h2>

                    {/* Авторски блок с Тултип */}
                    <div className="relative inline-block mt-2">
                        <div
                            className="flex items-center gap-3 cursor-pointer group"
                            onMouseEnter={() => setShowAuthorTooltip(true)}
                            onMouseLeave={() => setShowAuthorTooltip(false)}
                            onClick={() => setShowAuthorPopup(true)}
                        >
                            <img
                                src={data?.avatar_url || "/default-avatar.png"}
                                className="w-8 h-8 rounded-full object-cover border border-white/10"
                                alt=""
                            />
                            <p className="text-white/90 text-sm tracking-wide">
                                <span className="font-bold underline group-hover:text-purple-400 transition-colors">Автор:</span> {data?.author_name} • {new Date(data!.created_at).toLocaleString()}
                            </p>
                        </div>
                        {/* CLICK POPUP */}
                        {showAuthorPopup && data?.profiles && (
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
                                            src={data.avatar_url || "/default-avatar.png"}
                                            alt={data.author_name}
                                            className="w-36 h-36 rounded-full border-4 border-white/10 object-cover"
                                        />
                                    </div>

                                    {/* Name */}
                                    <h3 className="mt-6 text-center text-white font-extrabold text-3xl">
                                        {data.author_name}
                                    </h3>

                                    {/* Bio */}
                                    <p className="mt-3 text-center text-gray-300 text-base md:text-lg leading-relaxed">
                                        {data.profiles.bio || "Няма въведено био."}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Pop-up Tooltip (1 към 1 с коментарите) */}
                        {showAuthorTooltip && data?.profiles && (
                            <div className="absolute z-[100] bottom-[calc(100%+10px)] left-0 w-[220px] p-4 bg-[#15162c] border border-white/10 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex flex-col items-center text-center">
                                    {/* Аватар с мащаб като в коментарите */}
                                    <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 mb-2">
                                        <img
                                            src={data.avatar_url || "/default-avatar.png"}
                                            className="w-14 h-14 rounded-full border-2 border-[#15162c] object-cover"
                                            alt=""
                                        />
                                    </div>

                                    {/* Име - компактно */}
                                    <h4 className="font-black text-white text-sm tracking-tight mb-1">
                                        {data.author_name}
                                    </h4>

                                    {/* Био - малък текст */}
                                    <p className="text-[10px] text-gray-400 italic leading-tight px-1">
                                        "{data.profiles.bio || "Няма въведено био."}"
                                    </p>
                                </div>

                                {/* Малката стрелка, позиционирана точно над аватара на автора */}
                                <div className="absolute top-full left-3 -mt-px border-[6px] border-transparent border-t-[#15162c]"></div>
                            </div>
                        )}


                    </div>
                </div>

                {user && (user.id === data?.user_id || userRole === 'admin') && (
                    <div className="flex gap-2 md:gap-3 shrink-0 mt-2 md:mt-0">
                        <button onClick={() => setIsEditOpen(true)} className="bg-green-500/10 text-green-500 border border-green-500/50 px-3 py-1 rounded-lg text-sm hover:bg-green-500 hover:text-white transition-all font-bold">
                            Редактирай
                        </button>
                        <button onClick={() => setIsDeleteOpen(true)} className="bg-red-500/10 text-red-500 border border-red-500/50 px-3 py-1 rounded-lg text-sm hover:bg-red-500 hover:text-white transition-all font-bold">
                            Изтрий
                        </button>
                    </div>
                )}
            </div>

            {/* Image Grid */}
            {count > 0 && (
                <div className={`grid gap-2 rounded-2xl overflow-hidden border border-white/10 bg-white/5 ${count === 1 ? "grid-cols-1" : "grid-cols-2"} max-w-[700px] mx-auto`}>
                    {images.slice(0, 4).map((url, index) => {
                        let gridClass = "relative overflow-hidden group cursor-pointer ";
                        if (count === 1) gridClass += "w-full h-auto max-h-[600px]";
                        else if (count === 2) gridClass += "aspect-[3/4] md:aspect-square";
                        else if (count === 3) {
                            if (index === 0) gridClass += "col-span-2 md:col-span-1 md:row-span-2 aspect-video md:aspect-auto";
                            else gridClass += "aspect-square";
                        } else gridClass += "aspect-square";

                        return (
                            <div key={index} className={gridClass} onClick={() => setSelectedIndex(index)}>
                                <img src={url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="" />
                                {index === 3 && count > 4 && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <span className="text-white text-xl md:text-2xl font-black">+{count - 4}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <LikeButton postId={postId} />

            {/* Content Section */}
            <div className="relative group mt-6">
                <div className={`relative overflow-hidden transition-all duration-500 ease-in-out bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/10 shadow-lg ${!isExpanded && isLongContent ? "max-h-[140px]" : "max-h-[2000px]"}`}>
                    <p className={`text-gray-300 text-base md:text-lg leading-relaxed break-words whitespace-pre-wrap p-5 md:p-7 transition-opacity duration-300 ${!isExpanded && isLongContent ? "opacity-50" : "opacity-100"}`}>
                        {renderContentWithLinks(data?.content || "")}
                    </p>
                    {!isExpanded && isLongContent && (
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent pointer-events-none" />
                    )}
                </div>

                {isLongContent && (
                    <div className="flex justify-center -mt-4 relative z-10">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="group/btn flex items-center gap-2 px-5 py-2 bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-full text-[11px] font-bold uppercase tracking-wider text-cyan-400 hover:text-white hover:border-cyan-500/50 transition-all duration-200 shadow-md active:scale-95"
                        >
                            <span>{isExpanded ? "Свий" : "Виж повече"}</span>
                            <svg className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            <CommentSection postId={postId} />

            {/* Lightbox / Image Zoom */}
            {selectedIndex !== null && (
                <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-2 md:p-4 select-none backdrop-blur-sm" onClick={() => setSelectedIndex(null)}>
                    <button className="absolute top-4 right-4 text-white/50 hover:text-white z-[110] text-3xl p-2 transition-colors">✕</button>
                    {images.length > 1 && (
                        <>
                            <button onClick={showPrev} className="absolute left-2 md:left-10 p-4 text-white/30 hover:text-white text-3xl md:text-4xl transition-colors z-[110]">❮</button>
                            <button onClick={showNext} className="absolute right-2 md:right-10 p-4 text-white/30 hover:text-white text-3xl md:text-4xl transition-colors z-[110]">❯</button>
                        </>
                    )}
                    <div className="relative max-w-4xl w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                        <img src={images[selectedIndex]} className="w-full h-auto max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10" alt="" />
                        <div className="mt-5 py-1 px-3 bg-white/5 rounded-full border border-white/5 text-white/40 text-[10px] md:text-xs font-medium tracking-widest uppercase">
                            {selectedIndex + 1} / {images.length}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-gray-900 p-6 rounded-xl w-full max-w-lg space-y-4 relative border border-white/10 shadow-2xl">
                        <h3 className="text-xl font-bold text-white">Редакция на поста</h3>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-700 bg-gray-800 text-white focus:outline-none focus:border-cyan-500" placeholder="Заглавие" />
                        <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-700 bg-gray-800 text-white focus:outline-none focus:border-cyan-500" rows={8} placeholder="Съдържание" />

                        <div className="space-y-2">
                            <label className="cursor-pointer bg-cyan-500/10 text-cyan-500 border border-cyan-500/30 px-3 py-1.5 rounded-lg text-sm hover:bg-cyan-500 hover:text-white inline-block transition-all font-bold">
                                + Добави снимки
                                <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                            </label>
                            <div className="flex gap-2 overflow-x-auto py-2">
                                {previews.map((url, i) => (
                                    <div key={i} className="relative shrink-0">
                                        <img src={url} className="w-16 h-16 object-cover rounded-lg border border-white/10" alt="" />
                                        <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] border-2 border-gray-900">✕</button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setIsEditOpen(false)} className="px-4 py-2 rounded-lg bg-gray-800 text-white border border-white/5 hover:bg-gray-700 transition-colors font-bold text-sm">Отказ</button>
                            <button
                                onClick={() => updateMutation.mutate()}
                                disabled={updateMutation.isPending}
                                className="px-4 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 transition-colors font-bold text-sm disabled:opacity-50"
                            >
                                {updateMutation.isPending ? "Запис..." : "Запази"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {isDeleteOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-md">
                    <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-sm space-y-5 text-center border border-white/10 shadow-2xl">
                        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Изтриване на пост</h3>
                            <p className="text-white/60 text-sm mt-2">Сигурни ли сте? Това действие е необратимо.</p>
                        </div>
                        <div className="flex flex-col gap-2 pt-2">
                            <button onClick={handleDelete} className="w-full py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20">Изтрий пост</button>
                            <button onClick={() => setIsDeleteOpen(false)} className="w-full py-3 rounded-xl bg-transparent text-gray-400 font-bold hover:text-white transition-all">Откажи</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};