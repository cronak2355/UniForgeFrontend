import { useJob } from '../context/JobContext';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function JobNotification() {
    const { jobs, dismissJob, applyResult } = useJob();
    const [visibleJobs, setVisibleJobs] = useState<string[]>([]);

    // Monitor completed jobs to show animation & System Notification
    useEffect(() => {
        // Request permission on mount
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        const completedOrFailed = jobs.filter(j => j.status !== 'pending');
        // Simple logic: if the LAST job is completed/failed and recent (within 2 seconds), show notification
        // Note: Ideally track 'notified' state, but for now simple check
        const lastJob = jobs[jobs.length - 1];
        if (lastJob && lastJob.status !== 'pending') {
            const isRecent = (Date.now() - lastJob.timestamp) < 5000; // 5s window
            // Always notify if recent
            if (isRecent) {
                console.log("Attempting system notification for:", lastJob.taskName);

                // 1. Audio Alarm (Beep)
                try {
                    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
                    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
                    gain.gain.setValueAtTime(0.5, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.5);
                } catch (e) {
                    console.error("Audio play failed", e);
                }

                // 2. Visual Notification
                if (!('Notification' in window)) {
                    console.warn("This browser does not support desktop notification");
                } else if (Notification.permission === 'granted') {
                    new Notification(lastJob.status === 'completed' ? '✨ UniForge Job Done!' : '⚠️ UniForge Job Failed', {
                        body: lastJob.taskName,
                        icon: '/vite.svg',
                    });
                } else if (Notification.permission !== 'denied') {
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                            new Notification(lastJob.status === 'completed' ? '✨ UniForge Job Done!' : '⚠️ UniForge Job Failed', {
                                body: lastJob.taskName,
                                icon: '/vite.svg',
                            });
                        }
                    });
                }
            }
        }
    }, [jobs]);

    // Ensure we only render if there are jobs, but we still need the portal context
    const notifications = jobs.filter(j => j.status !== 'pending');
    if (notifications.length === 0) return null;

    return createPortal(
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-[99999] pointer-events-none">
            {notifications.map(job => (
                <div
                    key={job.id}
                    className={`
            pointer-events-auto
            w-80 p-4 rounded-lg shadow-2xl border backdrop-blur-md
            transition-all duration-500 transform translate-y-0 opacity-100
            ${job.status === 'completed'
                            ? 'bg-blue-900/80 border-blue-500/50 text-white'
                            : 'bg-red-900/80 border-red-500/50 text-white'}
          `}
                >
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                            {job.status === 'completed' ? '✨ Job Completed' : '⚠️ Job Failed'}
                        </h4>
                        <button
                            onClick={() => dismissJob(job.id)}
                            className="text-white/40 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>

                    <p className="text-xs text-white/80 mb-3 leading-relaxed">
                        {job.taskName}
                    </p>

                    {job.status === 'completed' && (
                        <div className="flex flex-col gap-1 items-end">
                            <button
                                onClick={() => {
                                    if (!job.result) {
                                        alert('Error: Job finished but no result data found.\nPlease check console.');
                                        console.error('Job Result Missing:', job);
                                        return;
                                    }
                                    applyResult(job.result);
                                }}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-xs font-bold uppercase tracking-wide transition-colors"
                            >
                                결과 적용하기
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
        , document.body);
}
