interface Folder {
    name: string;
    count: number;
}

const folders: Folder[] = [
    { name: "All Assets", count: 24 },
    { name: "Sci-Fi Project", count: 8 },
    { name: "Audio Library", count: 16 },
];

export default function LibrarySidebar() {
    return (
        <>
            <div className="sidebar-title">Asset Folders</div>
            <button className="new-folder-btn">+ New Folder</button>

            <ul className="folder-list">
                {folders.map(f => (
                    <li key={f.name}>
                        <span>{f.name}</span>
                        <span className="count">{f.count}</span>
                    </li>
                ))}
            </ul>
        </>
    );
}
