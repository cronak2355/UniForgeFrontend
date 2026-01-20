
/**
 * Parses a resolution string into width and height.
 * Supports standard presets and "WxH" format.
 */
export function parseResolution(ratio: string | undefined): { width: number; height: number } {
    if (!ratio) return { width: 1280, height: 720 };

    const upper = ratio.toUpperCase().trim();
    if (upper === "FHD") return { width: 1920, height: 1080 };
    if (upper === "QHD") return { width: 2560, height: 1440 };
    if (upper === "4K" || upper === "UHD") return { width: 3840, height: 2160 };
    if (upper === "HD") return { width: 1280, height: 720 };

    if (ratio.includes("x")) {
        const [wStr, hStr] = ratio.split("x");
        const w = parseInt(wStr);
        const h = parseInt(hStr);
        if (!isNaN(w) && !isNaN(h)) {
            return { width: w, height: h };
        }
    }

    // Default fallback
    return { width: 1280, height: 720 };
}
