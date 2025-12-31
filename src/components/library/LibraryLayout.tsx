import type { ReactNode } from "react";
import "../../styles/library.css";

interface Props {
    sidebar: ReactNode;
    content: ReactNode;
}

export default function LibraryLayout({ sidebar, content }: Props) {
    return (
        <div className="library-root">
            <aside className="library-sidebar">
                {sidebar}
            </aside>
            <main className="library-content">
                {content}
            </main>
        </div>
    );
}
