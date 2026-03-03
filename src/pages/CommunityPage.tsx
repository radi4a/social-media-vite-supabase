import { useParams } from "react-router";
import { CommunityDisplay } from "../components/CommunityDisplay";



export const CommunityPage = () => {
    const {id} = useParams<{id: string}>()
    
    return (
        <div className="pt-10 md:pt-20 px-4">
            <CommunityDisplay communityId = {Number(id)}/>
        </div>
    );
};