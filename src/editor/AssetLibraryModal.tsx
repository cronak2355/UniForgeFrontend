import LibraryPage from "../pages/LibraryPage";
import { colors } from "./constants/colors";

type Props = {
    onClose: () => void;
};

export function AssetLibraryModal({ onClose }: Props) {
    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 3000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.6)", // Backdrop
                backdropFilter: "blur(4px)",
            }}
            onClick={onClose} // Click outside to close
        >
            <div
                style={{
                    width: "90%",
                    height: "85%",
                    maxWidth: "1400px",
                    background: "#000",
                    borderRadius: "12px",
                    overflow: "hidden", // Clip the LibraryPage fixed/absolute elements
                    boxShadow: "0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                }}
                onClick={e => e.stopPropagation()} // Prevent closing when clicking inside
            >
                {/* 
                   Enable isModal mode.
                   Enable hideGamesTab to show only Assets 
                */}
                <LibraryPage
                    onClose={onClose}
                    isModal
                    hideGamesTab
                />
            </div>
        </div>
    );
}
