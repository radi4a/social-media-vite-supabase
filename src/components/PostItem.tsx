import type { Post } from "./PostList";
import { Link } from "react-router";

interface Props {
    post: Post;
}

export const PostItem = ({ post }: Props) => {
    // Взимаме само първата снимка от масива за банера
    const firstImage = post.image_url ? post.image_url.split(",")[0] : null;

    return (
        <div className="relative group w-100">
            {/* Neon glow behind the card */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-purple-500 via-pink-500 to-cyan-400 blur-xl opacity-20 group-hover:opacity-50 transition duration-500 pointer-events-none" />

            <Link to={`/post/${post.id}`} className="block relative z-10">
                {/* Card container */}
                <div className="bg-gray-900/70 border border-white/10 rounded-2xl overflow-hidden shadow-lg hover:shadow-[0_0_25px_rgba(128,0,255,0.5)] transition-all duration-300 flex flex-col h-[300px]">

                    {/* Image banner */}
                    {firstImage && (
                        <div className="relative w-full h-40 overflow-hidden">
                            <img
                                src={firstImage}
                                alt={post.title}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                            {/* Индикатор, ако има повече от една снимка */}
                            {post.image_url.includes(",") && (
                                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-md border border-white/10">
                                    +{post.image_url.split(",").length - 1} снимки
                                </div>
                            )}
                        </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                        {/* Avatar + Title */}
                        <div className="flex items-center space-x-3 mb-3 min-w-0">
                            {post.avatar_url ? (
                                <img src={post.avatar_url} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#8A2BE2] to-[#491F70] shadow-md flex-shrink-0" />
                            )}
                            <div className="flex flex-col flex-1 min-w-0">
                                {/* Title */}
                                <h3 className="text-lg font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent truncate">
                                    {post.title}
                                </h3>

                                {/* Автор + дата */}
                                <h2 className="text-white/50 text-xs mt-1 truncate">
                                    {post.author_name} • {new Date(post.created_at).toLocaleDateString()}
                                </h2>
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
};