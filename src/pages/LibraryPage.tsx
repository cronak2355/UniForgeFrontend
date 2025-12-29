import LibraryLayout from "../components/library/LibraryLayout.tsx";
import LibrarySidebar from "../components/library/LibrarySidebar.tsx";
import AssetGrid from "../components/library/AssetGrid.tsx";

export default function LibraryPage() {
    return (
        <LibraryLayout
            sidebar={<LibrarySidebar />}
            content={
                <>
                    <h1 className="library-title">라이브러리 에셋</h1>
                    <AssetGrid />
                </>
            }
        />
    );
}
