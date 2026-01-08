import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export interface Job {
    id: string;
    status: 'pending' | 'completed' | 'failed';
    taskName: string; // e.g., "AI Image Generation"
    result?: any;
    error?: string;
    timestamp: number;
}

interface JobContextType {
    jobs: Job[];
    addJob: (taskName: string, task: () => Promise<any>) => string; // returns jobId
    dismissJob: (id: string) => void;
    activeJobCount: number;
    registerApplyHandler: (handler: (result: any) => void) => void;
    unregisterApplyHandler: () => void;
    applyResult: (result: any) => void;
}

const JobContext = createContext<JobContextType | null>(null);

export const useJob = () => {
    const context = useContext(JobContext);
    if (!context) throw new Error('useJob must be used within a JobProvider');
    return context;
};

export const JobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [applyHandler, setApplyHandler] = useState<((result: any) => void) | null>(null);

    const registerApplyHandler = useCallback((handler: (result: any) => void) => {
        setApplyHandler(() => handler);
    }, []);

    const unregisterApplyHandler = useCallback(() => {
        setApplyHandler(null);
    }, []);

    const navigate = useNavigate();

    const applyResult = useCallback((result: any) => {
        if (applyHandler) {
            applyHandler(result);
        } else {
            // Navigate to editor with pending result
            navigate('/assets-editor', { state: { pendingJobResult: result } });
        }
    }, [applyHandler, navigate]);

    const addJob = useCallback((taskName: string, task: () => Promise<any>) => {
        const id = crypto.randomUUID();
        const newJob: Job = {
            id,
            status: 'pending',
            taskName,
            timestamp: Date.now(),
        };

        setJobs(prev => [...prev, newJob]);

        // Execute task
        task()
            .then(result => {
                setJobs(prev => prev.map(job =>
                    job.id === id ? { ...job, status: 'completed', result } : job
                ));
            })
            .catch(error => {
                console.error(`Job ${id} failed:`, error);
                setJobs(prev => prev.map(job =>
                    job.id === id ? { ...job, status: 'failed', error: error.message || 'Unknown error' } : job
                ));
            });

        return id;
    }, []);

    const dismissJob = useCallback((id: string) => {
        setJobs(prev => prev.filter(job => job.id !== id));
    }, []);

    const activeJobCount = jobs.filter(job => job.status === 'pending').length;

    return (
        <JobContext.Provider value={{ jobs, addJob, dismissJob, activeJobCount, registerApplyHandler, unregisterApplyHandler, applyResult }}>
            {children}
        </JobContext.Provider>
    );
};
